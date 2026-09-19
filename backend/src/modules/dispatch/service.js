// §15.2 transactional core + §22 resource allocation — requirement derivation, plan generation
// (Hungarian solve, 3 strategies), and the transactionally-safe plan-approval write path.

import { Incident } from '../../models/Incident.js';
import { Unit } from '../../models/Unit.js';
import { Assignment } from '../../models/Assignment.js';
import { DispatchPlan } from '../../models/DispatchPlan.js';
import { newId } from '../../utils/ids.js';
import { TUNING } from '../../contracts/tuning.js';
import { ACTIVE_ASSIGNMENT_STATUSES as ACTIVE_STATUSES } from '../../contracts/enums.js';
import { deriveRequirements } from './requirements.js';
import { buildCostMatrix, solve, solveGreedyBaseline, preemptionRegret } from './solver.js';
import { estimateEta } from '../../core-logic/eta.js';
import { toWirePoint } from '../../utils/geo.js';
import { appendEvent } from '../../platform/events.js';
import { raiseAlert } from '../alerts/service.js';
import { toIncidentSummary } from '../incidents/service.js';
import { AppError } from '../../platform/errors.js';
import { withOptionalTransaction } from '../../platform/transactions.js';
import { audit } from '../../platform/audit.js';

export async function deriveAndPersistRequirements(incidentId) {
  const incident = await Incident.findById(incidentId);
  if (!incident) return null;
  const { capabilities_unique, capabilities_flat, units_required } = deriveRequirements(incident.type, incident.severity, incident.beliefs || {});
  incident.required_capabilities = capabilities_unique;
  incident.units_required = units_required;
  incident._capabilities_flat = capabilities_flat; // not persisted, used inline by callers in the same run
  await incident.save();
  return { capabilities_flat, capabilities_unique, units_required };
}

async function assignedCountFor(incidentId) {
  return Assignment.countDocuments({ incident_id: incidentId, status: { $in: ACTIVE_STATUSES } });
}

async function activeTaskCountFor(unitId) {
  return Assignment.countDocuments({ unit_id: unitId, status: { $in: ACTIVE_STATUSES } });
}

async function buildCandidatePool(incident, requiredCapabilitiesFlat) {
  const freeUnits = await Unit.find({ status: 'AVAILABLE' });
  const candidates = [];
  for (const unit of freeUnits) {
    candidates.push({ unit, fromIncident: null, fromAssignment: null, activeTaskCount: 0, regret: 0 });
  }

  const requiredSet = new Set(requiredCapabilitiesFlat);
  const satisfiedByFree = new Set(freeUnits.flatMap((u) => u.capabilities.filter((c) => requiredSet.has(c))));
  const stillUnmet = requiredCapabilitiesFlat.filter((c) => !satisfiedByFree.has(c));

  let requiresPreemption = candidates.length < requiredCapabilitiesFlat.length || stillUnmet.length > 0;

  if (requiresPreemption) {
    const activeAssignments = await Assignment.find({ status: { $in: ACTIVE_STATUSES }, incident_id: { $ne: incident._id } });
    const incidentIds = [...new Set(activeAssignments.map((a) => a.incident_id))];
    const incidents = await Incident.find({ _id: { $in: incidentIds } });
    const incidentById = new Map(incidents.map((i) => [i._id, i]));
    const unitIds = activeAssignments.map((a) => a.unit_id);
    const units = await Unit.find({ _id: { $in: unitIds } });
    const unitById = new Map(units.map((u) => [u._id, u]));

    for (const a of activeAssignments) {
      const fromIncident = incidentById.get(a.incident_id);
      const unit = unitById.get(a.unit_id);
      if (!fromIncident || !unit) continue;
      if (!unit.capabilities.some((c) => requiredSet.has(c))) continue;

      // guardrails (§22.6): never preempt a unit ON_SCENE at a CRITICAL incident; never leave an
      // incident with zero units if it has life_risk > 0.5
      if (a.status === 'ON_SCENE' && fromIncident.severity === 'CRITICAL') continue;
      const fromAssignedCount = await assignedCountFor(fromIncident._id);
      const lifeRiskFactor = fromIncident.severity_assessment?.factors?.find((f) => f.key === 'life_risk');
      if (fromAssignedCount <= 1 && (lifeRiskFactor?.raw ?? 0) > 0.5) continue;

      fromIncident._assignedCount = fromAssignedCount;
      const etaToNew = estimateEta(toWirePoint(unit.location), toWirePoint(incident.location), { priority: true });
      const regret = preemptionRegret({
        unit, fromIncident, fromAssignment: a, toIncident: incident,
        toIncidentAssignedCount: await assignedCountFor(incident._id), toIncidentUnitsRequired: incident.units_required,
        etaToNewSeconds: etaToNew.eta_seconds,
      });

      candidates.push({ unit, fromIncident, fromAssignment: a, activeTaskCount: await activeTaskCountFor(unit._id), regret });
    }
  }

  return { candidates, requiresPreemption };
}

/** §22.4/§22.6 — generates 1 plan (no preemption needed) or 3 ranked plans (preemption needed). */
export async function generatePlans(incidentId) {
  const incident = await Incident.findById(incidentId);
  if (!incident) throw new AppError('NOT_FOUND', 'Incident not found');

  const { capabilities_flat, units_required } = await deriveAndPersistRequirements(incidentId);
  const { candidates, requiresPreemption } = await buildCandidatePool(incident, capabilities_flat);

  const strategies = requiresPreemption
    ? ['MINIMAL_DISRUPTION', 'FASTEST_RESPONSE', 'BALANCED']
    : ['BALANCED'];

  const plans = [];
  for (const strategy of strategies) {
    const multiplier = TUNING.dispatchCost.strategyDeltaMultiplier[strategy];
    const { matrix, cellMeta, n } = buildCostMatrix({
      requiredCapabilitiesFlat: capabilities_flat, candidates, incident, strategyDeltaMultiplier: multiplier,
    });
    const { assignment } = n > 0 ? solve(matrix) : { assignment: [] };

    const moves = [];
    const assumedVersions = {};
    const unmet = [];
    let totalCost = 0;
    // only sum the rows that represent a REAL required-capability slot — the matrix is padded to
    // square with dummy rows/columns at `infeasiblePenalty` (§22.4), which must not leak into the
    // plan's reported cost when the real requirements are fully satisfied.
    for (let row = 0; row < capabilities_flat.length; row++) {
      const col = assignment[row];
      const cand = col != null ? candidates[col] : null;
      const meta = col != null ? cellMeta[row][col] : null;
      if (!cand || !meta) {
        unmet.push(capabilities_flat[row]);
        continue;
      }
      totalCost += matrix[row][col];
      assumedVersions[cand.unit._id] = cand.unit.version;
      moves.push({
        unit_id: cand.unit._id, unit_call_sign: cand.unit.call_sign,
        from_incident_id: cand.fromIncident?._id ?? null, from_incident_code: cand.fromIncident?.code ?? null,
        eta_seconds: meta.eta.eta_seconds, eta_method: meta.eta.eta_method,
        capability_match: meta.capGap === 0 ? 1 : 0.5,
        preemption_regret: Math.round(meta.regret),
        impact_note: cand.fromIncident
          ? `${cand.fromIncident.code} keeps ${(cand.fromIncident._assignedCount ?? 1) - 1} unit(s); ETA to new incident ${Math.round(meta.eta.eta_seconds / 60)}:${String(meta.eta.eta_seconds % 60).padStart(2, '0')}`
          : `Free unit, ETA ${Math.round(meta.eta.eta_seconds / 60)}:${String(meta.eta.eta_seconds % 60).padStart(2, '0')}`,
      });
    }

    // dedupe unit ids (a unit could theoretically appear once — Hungarian is 1:1 by construction)
    const feasible = unmet.length === 0;
    const plan = await DispatchPlan.create({
      _id: newId('plan'), incident_id: incidentId, strategy, total_cost: Math.round(totalCost),
      moves, unmet_requirements: unmet, feasible, requires_preemption: moves.some((m) => m.from_incident_id),
      assumed_versions: assumedVersions,
      generated_at: new Date(), expires_at: new Date(Date.now() + TUNING.dispatchCost.planTtlSeconds * 1000),
    });
    plans.push(plan);
  }

  await appendEvent({
    room: `incident:${incidentId}`, type: 'dispatch.plan_generated', entity: { kind: 'incident', id: incidentId },
    actor: { kind: 'SYSTEM' }, payload: { plans: plans.map(toPlanWire) },
  });

  if (requiresPreemption) {
    await raiseAlert({
      type: 'REALLOCATION_PROPOSED', severity: incident.severity, incident_id: incidentId,
      title: `${incident.code} needs reallocation — no free units satisfy requirements`,
      body: `${plans.length} candidate plan(s) generated for operator approval.`,
      payload: { plan_ids: plans.map((p) => p._id) },
    });
  }

  return plans;
}

/** Greedy-vs-Hungarian comparison used for the demo ("Hungarian beat greedy by X seconds"). */
export async function compareGreedyVsHungarian(incidentId) {
  const incident = await Incident.findById(incidentId);
  if (!incident) throw new AppError('NOT_FOUND', 'Incident not found');
  const { capabilities_flat } = await deriveAndPersistRequirements(incidentId);
  const { candidates } = await buildCandidatePool(incident, capabilities_flat);
  const { matrix } = buildCostMatrix({ requiredCapabilitiesFlat: capabilities_flat, candidates, incident, strategyDeltaMultiplier: 1 });
  if (matrix.length === 0) return { hungarian_cost: 0, greedy_cost: 0, savings_seconds: 0 };
  const h = solve(matrix);
  const g = solveGreedyBaseline(matrix);
  const realCost = (assignment) => assignment
    .slice(0, capabilities_flat.length)
    .reduce((sum, col, row) => sum + (col != null ? matrix[row][col] : 0), 0);
  const hungarianCost = realCost(h.assignment);
  const greedyCost = realCost(g.assignment);
  return { hungarian_cost: Math.round(hungarianCost), greedy_cost: Math.round(greedyCost), savings_seconds: Math.round(greedyCost - hungarianCost) };
}

export function toPlanWire(p) {
  return {
    id: p._id, incident_id: p.incident_id, strategy: p.strategy, total_cost: p.total_cost,
    moves: p.moves, unmet_requirements: p.unmet_requirements, feasible: p.feasible,
    requires_preemption: p.requires_preemption,
    generated_at: p.generated_at.toISOString(), expires_at: p.expires_at.toISOString(),
    applied_at: p.applied_at?.toISOString?.() ?? null,
  };
}

/**
 * §15.2 the single most important transaction. Three layers of protection: application version
 * check (friendly error), atomic per-document compare-and-swap (no lost updates even without a
 * replica set), and the partial unique index on assignments (the actual guarantee).
 */
export async function approvePlan(planId, { userId }) {
  const plan = await DispatchPlan.findById(planId);
  if (!plan) throw new AppError('NOT_FOUND', 'Dispatch plan not found');
  if (plan.applied_at) {
    const assignments = await Assignment.find({ plan_id: planId });
    return { plan, assignments };
  }
  if (plan.expires_at < new Date()) {
    throw new AppError('PLAN_EXPIRED', 'Plan has expired and must be regenerated', { regenerate_url: `/api/v1/incidents/${plan.incident_id}/dispatch/plans` });
  }

  const applied = { unitsChanged: [], assignmentsCreated: [], preemptedAssignments: [] };

  try {
    await withOptionalTransaction(async (session) => {
      for (const move of plan.moves) {
        const assumedVersion = plan.assumed_versions[move.unit_id];

        // 1 & 2: lock (atomic CAS) + revalidate the world in one operation
        const unitUpdate = await Unit.findOneAndUpdate(
          { _id: move.unit_id, version: assumedVersion },
          { $set: { status: 'ASSIGNED' }, $inc: { version: 1 } },
          { new: true, session },
        );
        if (!unitUpdate) {
          const current = await Unit.findById(move.unit_id).session(session);
          throw new AppError('RESOURCE_CONFLICT', `Unit ${move.unit_id} was modified since the plan was generated`, {
            unit_id: move.unit_id, held_by_assignment_id: current?.current_assignment_id, incident_code: plan.incident_id,
          });
        }
        applied.unitsChanged.push({ unitId: move.unit_id, previousVersion: assumedVersion });

        // 3. preemptions first — close the old assignment
        if (move.from_incident_id) {
          const oldAssignment = await Assignment.findOneAndUpdate(
            { unit_id: move.unit_id, status: { $in: ACTIVE_STATUSES } },
            { $set: { status: 'PREEMPTED' }, $unset: { active_lock: 1 }, $inc: { version: 1 } },
            { new: true, session },
          );
          if (oldAssignment) applied.preemptedAssignments.push(oldAssignment._id);
        }

        // 4. insert the new assignment — the partial unique index is the real guarantee
        const assignmentId = newId('assignment');
        try {
          await Assignment.create([{
            _id: assignmentId, incident_id: plan.incident_id, unit_id: move.unit_id, unit_call_sign: move.unit_call_sign,
            status: 'APPROVED', eta_seconds: move.eta_seconds, eta_method: move.eta_method, distance_m: null,
            proposed_by: 'SYSTEM', approved_by_user_id: userId, preempted_from_incident_id: move.from_incident_id,
            rationale: [move.impact_note], plan_id: plan._id, approved_at: new Date(), active_lock: true,
          }], { session });
        } catch (err) {
          if (err?.code === 11000) {
            throw new AppError('RESOURCE_CONFLICT', `Unit ${move.unit_id} already holds an active assignment`, { unit_id: move.unit_id });
          }
          throw err;
        }
        applied.assignmentsCreated.push(assignmentId);

        await Unit.findByIdAndUpdate(move.unit_id, { $set: { current_assignment_id: assignmentId } }, { session });
      }

      plan.applied_at = new Date();
      await plan.save({ session });

      const incident = await Incident.findById(plan.incident_id).session(session);
      if (incident && ['REPORTED', 'TRIAGED'].includes(incident.status)) {
        incident.status = 'DISPATCHED';
        incident.version += 1;
        incident.updated_at = new Date();
        await incident.save({ session });
      }
    });
  } catch (err) {
    // compensating rollback for the no-replica-set path (withOptionalTransaction already aborts
    // automatically when a real transaction was used)
    for (const assignmentId of applied.assignmentsCreated) await Assignment.deleteOne({ _id: assignmentId }).catch(() => {});
    // preempted assignments are left PREEMPTED intentionally — that is already a safe terminal state
    for (const { unitId } of applied.unitsChanged) {
      await Unit.updateOne({ _id: unitId }, { $set: { status: 'AVAILABLE' } }).catch(() => {});
    }
    throw err;
  }

  const assignments = await Assignment.find({ plan_id: planId });
  for (const a of assignments) {
    await appendEvent({
      room: 'ops:global', type: 'assignment.approved', entity: { kind: 'assignment', id: a._id },
      actor: { kind: 'USER', id: userId }, payload: toAssignmentWire(a),
    });
    await appendEvent({
      room: `unit:${a.unit_id}`, type: 'unit.status_changed', entity: { kind: 'unit', id: a.unit_id },
      actor: { kind: 'USER', id: userId }, payload: { unit_id: a.unit_id, status: 'ASSIGNED' },
    });
  }

  const incident = await Incident.findById(plan.incident_id);
  await appendEvent({
    room: 'ops:global', type: 'incident.status_changed', entity: { kind: 'incident', id: plan.incident_id },
    actor: { kind: 'USER', id: userId }, payload: toIncidentSummary(incident),
  });

  await audit({ req: { user: { id: userId } }, action: 'DISPATCH_PLAN_APPROVED', entityKind: 'dispatch_plan', entityId: planId, after: toPlanWire(plan) });

  return { plan, assignments };
}

function toAssignmentWire(a) {
  return {
    id: a._id, incident_id: a.incident_id, unit_id: a.unit_id, unit_call_sign: a.unit_call_sign,
    status: a.status, eta_seconds: a.eta_seconds, eta_method: a.eta_method, distance_m: a.distance_m,
    proposed_by: a.proposed_by, approved_by_user_id: a.approved_by_user_id,
    preempted_from_incident_id: a.preempted_from_incident_id, rationale: a.rationale, cost_breakdown: a.cost_breakdown,
    proposed_at: a.proposed_at?.toISOString?.() ?? null, approved_at: a.approved_at?.toISOString?.() ?? null,
    arrived_at: a.arrived_at?.toISOString?.() ?? null, completed_at: a.completed_at?.toISOString?.() ?? null,
    version: a.version,
  };
}

export { toAssignmentWire };

export async function manualAssign(incidentId, unitId, { userId }) {
  const incident = await Incident.findById(incidentId);
  if (!incident) throw new AppError('NOT_FOUND', 'Incident not found');
  const unit = await Unit.findById(unitId);
  if (!unit) throw new AppError('NOT_FOUND', 'Unit not found');
  if (!['AVAILABLE'].includes(unit.status)) throw new AppError('RESOURCE_CONFLICT', 'Unit is not available', { unit_id: unitId, incident_code: incident.code });

  const eta = estimateEta(toWirePoint(unit.location), toWirePoint(incident.location), { priority: true });
  const assignmentId = newId('assignment');

  const updatedUnit = await Unit.findOneAndUpdate(
    { _id: unitId, version: unit.version },
    { $set: { status: 'ASSIGNED' }, $inc: { version: 1 } },
    { new: true },
  );
  if (!updatedUnit) throw new AppError('RESOURCE_CONFLICT', 'Unit was modified concurrently', { unit_id: unitId });

  try {
    const assignment = await Assignment.create({
      _id: assignmentId, incident_id: incidentId, unit_id: unitId, unit_call_sign: unit.call_sign,
      status: 'APPROVED', eta_seconds: eta.eta_seconds, eta_method: eta.eta_method, distance_m: eta.distance_m,
      proposed_by: 'OPERATOR', approved_by_user_id: userId, rationale: ['Manually assigned by operator'],
      approved_at: new Date(), active_lock: true,
    });
    await Unit.findByIdAndUpdate(unitId, { $set: { current_assignment_id: assignmentId } });

    if (['REPORTED', 'TRIAGED'].includes(incident.status)) {
      incident.status = 'DISPATCHED';
      incident.version += 1;
      incident.updated_at = new Date();
      await incident.save();
    }

    await appendEvent({
      room: 'ops:global', type: 'assignment.approved', entity: { kind: 'assignment', id: assignment._id },
      actor: { kind: 'USER', id: userId }, payload: toAssignmentWire(assignment),
    });

    return assignment;
  } catch (err) {
    await Unit.updateOne({ _id: unitId }, { $set: { status: 'AVAILABLE' } });
    if (err?.code === 11000) throw new AppError('RESOURCE_CONFLICT', 'Unit already holds an active assignment', { unit_id: unitId });
    throw err;
  }
}

export async function cancelAssignment(assignmentId, { reason, userId }) {
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) throw new AppError('NOT_FOUND', 'Assignment not found');

  await Assignment.updateOne({ _id: assignmentId }, { $set: { status: 'CANCELLED' }, $unset: { active_lock: 1 }, $inc: { version: 1 } });
  await Unit.findByIdAndUpdate(assignment.unit_id, { $set: { status: 'AVAILABLE', current_assignment_id: null }, $inc: { version: 1 } });

  await appendEvent({
    room: 'ops:global', type: 'assignment.status_changed', entity: { kind: 'assignment', id: assignmentId },
    actor: { kind: 'USER', id: userId }, payload: { id: assignmentId, status: 'CANCELLED', reason },
  });

  await audit({ req: { user: { id: userId } }, action: 'ASSIGNMENT_CANCELLED', entityKind: 'assignment', entityId: assignmentId, reason });
  return assignment;
}

export async function updateAssignmentStatus(assignmentId, status, { userId }) {
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) throw new AppError('NOT_FOUND', 'Assignment not found');

  assignment.status = status;
  assignment.version += 1;
  if (status === 'ON_SCENE') assignment.arrived_at = new Date();
  if (status === 'COMPLETED') {
    assignment.completed_at = new Date();
    await Unit.findByIdAndUpdate(assignment.unit_id, { $set: { status: 'AVAILABLE', current_assignment_id: null }, $inc: { version: 1 } });
    await Assignment.updateOne({ _id: assignmentId }, { $unset: { active_lock: 1 } });
  }
  await assignment.save();

  if (status === 'ON_SCENE') {
    const incident = await Incident.findById(assignment.incident_id);
    if (incident && incident.status === 'DISPATCHED') {
      incident.status = 'ON_SCENE';
      incident.version += 1;
      await incident.save();
      await appendEvent({ room: 'ops:global', type: 'incident.status_changed', entity: { kind: 'incident', id: incident._id }, actor: { kind: 'USER', id: userId }, payload: toIncidentSummary(incident) });
    }
  }

  await appendEvent({
    room: 'ops:global', type: 'assignment.status_changed', entity: { kind: 'assignment', id: assignmentId },
    actor: { kind: 'USER', id: userId }, payload: toAssignmentWire(assignment),
  });
  return assignment;
}
