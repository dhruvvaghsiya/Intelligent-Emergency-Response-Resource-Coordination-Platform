// §23 EVIDENCE & CONFIDENCE SYSTEM — append evidence, recompute beliefs, detect CONTESTED.

import { Evidence } from '../../models/Evidence.js';
import { Incident } from '../../models/Incident.js';
import { newId } from '../../utils/ids.js';
import { fuseAll } from '../../core-logic/belief.js';
import { TUNING } from '../../contracts/tuning.js';
import { appendEvent } from '../../platform/events.js';
import { raiseAlert } from '../alerts/service.js';
import { recomputeSeverity } from '../severity/service.js';
import { AppError } from '../../platform/errors.js';

export async function appendEvidence(incidentId, {
  report_id = null, source_type, source_label, attribute, claimed_value,
  asserted_probability, extraction_confidence, observed_at, is_simulated = false,
}, actor = { kind: 'SYSTEM' }) {
  const reliability = TUNING.sourcePriors[source_type] ?? 0.5;
  const weight = reliability * extraction_confidence; // decay applied later at fuse-time, not stored
  const doc = await Evidence.create({
    _id: newId('evidence'), incident_id: incidentId, report_id, source_type, source_label,
    attribute, claimed_value, asserted_probability, extraction_confidence,
    source_reliability: reliability, weight, observed_at: new Date(observed_at || Date.now()),
    is_simulated,
  });

  await appendEvent({
    room: `incident:${incidentId}`, type: 'evidence.added', entity: { kind: 'incident', id: incidentId },
    actor, payload: { evidence: wireEvidence(doc) },
  });

  const { beliefs, conflicts } = await recomputeBeliefs(incidentId, actor);
  return { evidence: doc, beliefs, conflicts };
}

/** Bulk variant used by the ingest pipeline (§8.3 step 7) — inserts N evidence rows then
 * recomputes beliefs/severity exactly once, instead of once per attribute. */
export async function appendEvidenceBatch(incidentId, items, actor = { kind: 'SYSTEM' }) {
  if (items.length === 0) return { evidence: [], beliefs: {}, conflicts: [] };

  const docs = items.map((item) => {
    const reliability = TUNING.sourcePriors[item.source_type] ?? 0.5;
    return {
      _id: newId('evidence'), incident_id: incidentId, report_id: item.report_id ?? null,
      source_type: item.source_type, source_label: item.source_label, attribute: item.attribute,
      claimed_value: item.claimed_value, asserted_probability: item.asserted_probability,
      extraction_confidence: item.extraction_confidence, source_reliability: reliability,
      weight: reliability * item.extraction_confidence,
      observed_at: new Date(item.observed_at || Date.now()), is_simulated: item.is_simulated ?? false,
    };
  });
  const created = await Evidence.insertMany(docs);

  for (const doc of created) {
    await appendEvent({
      room: `incident:${incidentId}`, type: 'evidence.added', entity: { kind: 'incident', id: incidentId },
      actor, payload: { evidence: wireEvidence(doc) },
    });
  }

  const { beliefs, conflicts } = await recomputeBeliefs(incidentId, actor);
  return { evidence: created, beliefs, conflicts };
}

export async function recomputeBeliefs(incidentId, actor = { kind: 'SYSTEM' }) {
  const incident = await Incident.findById(incidentId);
  if (!incident) throw new AppError('NOT_FOUND', 'Incident not found');

  const evidenceList = await Evidence.find({ incident_id: incidentId, superseded: false });
  const beliefs = fuseAll(evidenceList, new Date());
  const previousBeliefs = incident.beliefs || {};

  incident.beliefs = beliefs;
  incident.updated_at = new Date();
  await incident.save();

  await appendEvent({
    room: `incident:${incidentId}`, type: 'belief.updated', entity: { kind: 'incident', id: incidentId },
    actor, payload: { beliefs: Object.values(beliefs) },
  });

  const conflicts = [];
  for (const [attribute, belief] of Object.entries(beliefs)) {
    const wasContested = previousBeliefs[attribute]?.state === 'CONTESTED';
    if (belief.state === 'CONTESTED' && !wasContested) {
      conflicts.push(attribute);
      await appendEvent({
        room: `incident:${incidentId}`, type: 'belief.conflict_detected',
        entity: { kind: 'incident', id: incidentId }, actor, payload: { attribute, belief },
      });
      await raiseAlert({
        type: 'EVIDENCE_CONFLICT', severity: 'MODERATE', incident_id: incidentId,
        title: `Contested attribute: ${attribute}`,
        body: `Credible sources disagree on "${attribute}". Held at the pessimistic bound pending verification.`,
        payload: { attribute },
        dedupe_key: `EVIDENCE_CONFLICT:${incidentId}:${attribute}`,
      });
    }
  }

  // severity is derived from beliefs — recompute it every time beliefs change (§20)
  await recomputeSeverity(incidentId, actor);

  return { beliefs, conflicts };
}

export async function supersedeEvidence(incidentId, evidenceId, { reason, userId }) {
  const evidence = await Evidence.findOne({ _id: evidenceId, incident_id: incidentId });
  if (!evidence) throw new AppError('NOT_FOUND', 'Evidence not found');
  evidence.superseded = true;
  evidence.superseded_reason = reason;
  evidence.superseded_by_user_id = userId;
  await evidence.save();

  const { beliefs, conflicts } = await recomputeBeliefs(incidentId, { kind: 'USER', id: userId });
  return { evidence, beliefs, conflicts };
}

function wireEvidence(e) {
  return {
    id: e._id, incident_id: e.incident_id, report_id: e.report_id, source_type: e.source_type,
    source_label: e.source_label, attribute: e.attribute, claimed_value: e.claimed_value,
    asserted_probability: e.asserted_probability, extraction_confidence: e.extraction_confidence,
    source_reliability: e.source_reliability, weight: e.weight,
    observed_at: e.observed_at.toISOString(), created_at: e.created_at.toISOString(),
    is_simulated: e.is_simulated, superseded: e.superseded,
  };
}
