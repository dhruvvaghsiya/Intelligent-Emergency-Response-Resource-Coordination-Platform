// §8.3 the one dataflow that matters — the 11-step ingest pipeline, run as a job handler so
// POST /reports itself stays fast (<80ms). Partial-failure policy (§15.3): every step is
// independently retryable and the incident is created even if extraction/correlation/cascade
// fail — a report is never lost because the AI is down.

import { Report } from '../../models/Report.js';
import { Incident } from '../../models/Incident.js';
import { newId } from '../../utils/ids.js';
import { toGeoJson, toWirePoint } from '../../utils/geo.js';
import { computeBlockKey } from '../../utils/blockKey.js';
import { withBlockLock } from '../../platform/lock.js';
import { extract as aiExtract } from '../../ai/client.js';
import { findBlockingCandidates, scoreCandidates, createLink } from '../correlation/service.js';
import { createIncident, toIncidentSummary } from '../incidents/service.js';
import { appendEvidenceBatch } from '../evidence/service.js';
import { deriveAndPersistRequirements } from '../dispatch/service.js';
import { applyCascadeEffects } from '../cascade/service.js';
import { appendEvent } from '../../platform/events.js';
import { raiseAlert } from '../alerts/service.js';
import { logger } from '../../platform/logger.js';

async function step(name, incidentId, degradedSteps, fn) {
  try {
    return await fn();
  } catch (err) {
    logger.warn({ err, step: name, incidentId }, `pipeline step "${name}" failed — continuing degraded`);
    degradedSteps.push(name);
    return null;
  }
}

export async function processReport(reportId) {
  const report = await Report.findById(reportId);
  if (!report) return;

  report.processing_status = 'PROCESSING';
  await report.save();
  const degradedSteps = [];

  // 3. NORMALIZE — coordinates are already GeoJSON/WGS84, timestamps already UTC Date objects.
  const location = toWirePoint(report.location);
  const occurredAt = report.occurred_at;

  // 4. EXTRACT
  const extraction = await step('EXTRACT', null, degradedSteps, () => aiExtract({
    report_id: reportId, text: report.text, language: report.language,
    structured: report.structured, location, occurred_at: occurredAt.toISOString(),
  })) || { type_suggestion: 'UNKNOWN', type_confidence: 0.1, attributes: [], entities: [], embedding: undefined, degraded: true, summary: '' };

  report.extraction = extraction;
  report.embedding = extraction.embedding;
  if (extraction.degraded) degradedSteps.push('EXTRACT');

  // 5 & 6. CORRELATE, then ATTACH or CREATE (serialised per spatiotemporal block, §15.2)
  const blockKey = computeBlockKey(extraction.type_suggestion, location, occurredAt);

  const { incident, band, topMatch } = await withBlockLock(blockKey, async () => {
    const candidates = await step('CORRELATE_BLOCKING', null, degradedSteps, () => findBlockingCandidates({
      type: extraction.type_suggestion, location, occurredAt, locationAccuracyM: report.location_accuracy_m ?? 0,
    })) || [];

    const subject = {
      type: extraction.type_suggestion, location, occurred_at: occurredAt,
      entities: extraction.entities, embedding: extraction.embedding,
      source_type: report.source_type, reporter_ref: report.reporter_ref,
    };
    const scoredCandidates = candidates.length
      ? await scoreCandidatesAgainstSnapshots(subject, candidates)
      : [];
    const best = scoredCandidates[0] || null;

    if (best && best.band === 'DUPLICATE') {
      return { incident: best.incident, band: 'DUPLICATE', topMatch: best };
    }

    const created = await createIncident({
      type: extraction.type_suggestion, title: buildTitle(extraction, report),
      description: extraction.summary || report.text, location,
      occurred_at: occurredAt.toISOString(), is_simulated: report.is_simulated, sim_run_id: report.sim_run_id,
    });

    if (best && best.band === 'LIKELY_SAME') {
      await createLink({ from_incident_id: created._id, to_incident_id: best.incident._id, relation: 'LIKELY_SAME_AS', score: best.score, features: best.features, contributions: best.contributions, explanation: best.explanation });
      await raiseAlert({
        type: 'DUPLICATE_SUSPECTED', severity: 'MODERATE', incident_id: created._id,
        title: `Possible duplicate of ${best.incident.code}`, body: best.explanation,
        payload: { candidate_incident_id: best.incident._id, score: best.score },
        dedupe_key: `DUPLICATE_SUSPECTED:${created._id}:${best.incident._id}`,
      });
    } else if (best && best.band === 'RELATED') {
      await createLink({ from_incident_id: created._id, to_incident_id: best.incident._id, relation: 'RELATED_TO', score: best.score, features: best.features, contributions: best.contributions, explanation: best.explanation });
    }

    return { incident: created, band: best?.band || 'INDEPENDENT', topMatch: best };
  });

  // attach report + update the incident's correlation snapshot / report_count
  report.incident_id = incident._id;
  await Incident.updateOne({ _id: incident._id }, {
    $inc: { report_count: 1 },
    $set: {
      correlation_snapshot: { type: extraction.type_suggestion, entities: extraction.entities, embedding: extraction.embedding, source_type: report.source_type, reporter_ref: report.reporter_ref, occurred_at: occurredAt },
      updated_at: new Date(),
      ...(extraction.people_count_estimate != null ? { people_count_estimate: extraction.people_count_estimate } : {}),
    },
  });

  // 7 & 8. FUSE + SCORE — append evidence (from AI attributes + a base type-classification claim),
  // then recompute beliefs -> severity (handled inside appendEvidenceBatch)
  const evidenceItems = extraction.attributes.map((a) => ({
    report_id: reportId, source_type: report.source_type, source_label: report.source_label,
    attribute: a.attribute, claimed_value: true, asserted_probability: a.asserted_probability,
    extraction_confidence: a.extraction_confidence, observed_at: occurredAt.toISOString(), is_simulated: report.is_simulated,
  }));
  await step('FUSE_SCORE', incident._id, degradedSteps, () => appendEvidenceBatch(incident._id, evidenceItems));

  // requirement derivation is a function of (type, severity, beliefs) — refresh it now that
  // severity/type are current for this incident
  await step('REQUIREMENTS', incident._id, degradedSteps, () => deriveAndPersistRequirements(incident._id));

  // 9. EFFECTS — cascade rules (best-effort, never blocks the pipeline)
  await step('CASCADE', incident._id, degradedSteps, () => applyCascadeEffects(incident._id));

  // 10. RECOMMEND is intentionally NOT run inline (kept out of the ingest hot path) — a dispatcher
  // pulls GET /incidents/:id/dispatch/plans on demand, generating a fresh (never stale) plan.

  report.processing_status = 'PROCESSED';
  report.degraded_steps = degradedSteps;
  await report.save();

  if (degradedSteps.length > 0) {
    await Incident.updateOne({ _id: incident._id }, { $addToSet: { degraded_steps: { $each: degradedSteps } } });
  }

  // 11. EMIT — final incident summary update for anyone watching the queue live
  const finalIncident = await Incident.findById(incident._id);
  await appendEvent({
    room: 'ops:global', type: 'incident.updated', entity: { kind: 'incident', id: incident._id },
    actor: { kind: 'SYSTEM' }, payload: toIncidentSummary(finalIncident),
  });

  return { incidentId: incident._id, band, degradedSteps };
}

async function scoreCandidatesAgainstSnapshots(subject, candidates) {
  const withSnapshots = candidates.map((c) => ({
    ...c,
    entities: c.correlation_snapshot?.entities || [],
    embedding: c.correlation_snapshot?.embedding,
    _lastSourceType: c.correlation_snapshot?.source_type,
    _lastReporterRef: c.correlation_snapshot?.reporter_ref,
  }));
  return scoreCandidates(subject, withSnapshots);
}

function buildTitle(extraction, report) {
  const typeLabel = (extraction.type_suggestion || 'UNKNOWN').replace(/_/g, ' ');
  const snippet = (extraction.summary || report.text || '').slice(0, 60);
  return snippet ? `${typeLabel} — ${snippet}` : typeLabel;
}
