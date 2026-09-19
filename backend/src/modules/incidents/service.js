import { Incident } from '../../models/Incident.js';
import { Evidence } from '../../models/Evidence.js';
import { Report } from '../../models/Report.js';
import { Assignment } from '../../models/Assignment.js';
import { IncidentLink } from '../../models/IncidentLink.js';
import { nextCounter } from '../../models/Counter.js';
import { newId } from '../../utils/ids.js';
import { toWirePoint, toGeoJson } from '../../utils/geo.js';
import { appendEvent } from '../../platform/events.js';
import { assertTransition } from './stateMachine.js';
import { AppError } from '../../platform/errors.js';

export async function nextIncidentCode() {
  const year = new Date().getFullYear();
  const seq = await nextCounter(`incident_code:${year}`);
  return `INC-${year}-${String(seq).padStart(4, '0')}`;
}

export function toIncidentSummary(doc) {
  return {
    id: doc._id, code: doc.code, type: doc.type, status: doc.status,
    severity: doc.severity, severity_score: doc.severity_score,
    title: doc.title, location: toWirePoint(doc.location), address: doc.address, ward: doc.ward,
    report_count: doc.report_count, assigned_unit_count: doc._assigned_unit_count ?? 0,
    units_required: doc.units_required,
    has_conflict: Boolean(doc.severity_assessment?.is_contested),
    has_pending_recommendation: Boolean(doc._has_pending_recommendation),
    occurred_at: doc.occurred_at?.toISOString?.() ?? doc.occurred_at,
    updated_at: doc.updated_at?.toISOString?.() ?? doc.updated_at,
    version: doc.version, is_simulated: doc.is_simulated,
  };
}

export async function toIncidentDetail(doc) {
  const [evidence, reports, assignments, links, assignedCount] = await Promise.all([
    Evidence.find({ incident_id: doc._id }).sort({ created_at: 1 }),
    Report.find({ incident_id: doc._id }).sort({ received_at: -1 }).limit(200),
    Assignment.find({ incident_id: doc._id }).sort({ proposed_at: -1 }),
    IncidentLink.find({ $or: [{ from_incident_id: doc._id }, { to_incident_id: doc._id }] }),
    Assignment.countDocuments({ incident_id: doc._id, status: { $in: ['APPROVED', 'EN_ROUTE', 'ON_SCENE'] } }),
  ]);
  doc._assigned_unit_count = assignedCount;
  const summary = toIncidentSummary(doc);
  return {
    ...summary,
    description: doc.description,
    beliefs: Object.values(doc.beliefs || {}),
    severity_assessment: doc.severity_assessment,
    evidence: evidence.map(toEvidenceWire),
    reports: reports.map(toReportSummaryWire),
    assignments: assignments.map(toAssignmentWire),
    links: links.map(toLinkWire),
    ai: doc.ai,
    required_capabilities: doc.required_capabilities,
    timeline_seq: doc.timeline_seq,
    degraded_steps: doc.degraded_steps,
  };
}

export function toEvidenceWire(e) {
  return {
    id: e._id, incident_id: e.incident_id, report_id: e.report_id,
    source_type: e.source_type, source_label: e.source_label, attribute: e.attribute,
    claimed_value: e.claimed_value, asserted_probability: e.asserted_probability,
    extraction_confidence: e.extraction_confidence, source_reliability: e.source_reliability,
    weight: e.weight, observed_at: e.observed_at.toISOString(), created_at: e.created_at.toISOString(),
    is_simulated: e.is_simulated, superseded: e.superseded,
  };
}

export function toReportSummaryWire(r) {
  return {
    id: r._id, source_type: r.source_type, source_label: r.source_label,
    text: r.text, location: toWirePoint(r.location), occurred_at: r.occurred_at.toISOString(),
    received_at: r.received_at.toISOString(), processing_status: r.processing_status,
    is_simulated: r.is_simulated,
  };
}

export function toAssignmentWire(a) {
  return {
    id: a._id, incident_id: a.incident_id, unit_id: a.unit_id, unit_call_sign: a.unit_call_sign,
    status: a.status, eta_seconds: a.eta_seconds, eta_method: a.eta_method, distance_m: a.distance_m,
    proposed_by: a.proposed_by, approved_by_user_id: a.approved_by_user_id,
    preempted_from_incident_id: a.preempted_from_incident_id, rationale: a.rationale,
    cost_breakdown: a.cost_breakdown,
    proposed_at: a.proposed_at?.toISOString?.() ?? null,
    approved_at: a.approved_at?.toISOString?.() ?? null,
    arrived_at: a.arrived_at?.toISOString?.() ?? null,
    completed_at: a.completed_at?.toISOString?.() ?? null,
    version: a.version,
  };
}

export function toLinkWire(l) {
  return {
    id: l._id, from_incident_id: l.from_incident_id, to_incident_id: l.to_incident_id,
    relation: l.relation, score: l.score, features: l.features, contributions: l.contributions,
    explanation: l.explanation, decided_by: l.decided_by, confirmed: l.confirmed,
    created_at: l.created_at.toISOString(),
  };
}

export async function createIncident({ type, title, description, location, address, ward, occurred_at, is_simulated, sim_run_id, actor }) {
  const code = await nextIncidentCode();
  const doc = await Incident.create({
    _id: newId('incident'), code, type, title, description: description || '',
    location: toGeoJson(location), address: address || null, ward: ward || null,
    occurred_at: occurred_at ? new Date(occurred_at) : new Date(),
    is_simulated: Boolean(is_simulated), sim_run_id: sim_run_id || null,
  });
  await appendEvent({
    room: 'ops:global', type: 'incident.created', entity: { kind: 'incident', id: doc._id },
    actor: actor || { kind: 'SYSTEM' }, payload: toIncidentSummary(doc),
  });
  return doc;
}

export async function patchIncidentStatus(incidentId, { status, version, actor }) {
  const doc = await Incident.findById(incidentId);
  if (!doc) throw new AppError('NOT_FOUND', 'Incident not found');
  if (doc.version !== version) {
    throw new AppError('VERSION_CONFLICT', 'Incident has changed', { current: toIncidentSummary(doc) });
  }
  if (doc.status === 'CLOSED') throw new AppError('LOCKED', 'Incident is closed and immutable');

  try {
    assertTransition(doc.status, status);
  } catch (err) {
    throw new AppError('ILLEGAL_TRANSITION', err.message, err.details);
  }

  const before = { status: doc.status };
  doc.status = status;
  doc.version += 1;
  doc.updated_at = new Date();
  if (status === 'CLOSED') doc.closed_at = new Date();
  await doc.save();

  await appendEvent({
    room: 'ops:global', type: 'incident.status_changed', entity: { kind: 'incident', id: doc._id },
    actor: actor || { kind: 'SYSTEM' }, payload: toIncidentSummary(doc),
  });
  await appendEvent({
    room: `incident:${doc._id}`, type: 'incident.status_changed', entity: { kind: 'incident', id: doc._id },
    actor: actor || { kind: 'SYSTEM' }, payload: toIncidentSummary(doc),
  });

  return { doc, before };
}
