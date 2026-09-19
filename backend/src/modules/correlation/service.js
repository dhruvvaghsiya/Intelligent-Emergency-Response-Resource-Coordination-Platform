// §21 DUPLICATE & CORRELATION ARCHITECTURE — blocking (Mongo geo query) + scoring (core-logic) +
// decision bands + reversible merge/unmerge with journal.

import { Incident } from '../../models/Incident.js';
import { IncidentLink } from '../../models/IncidentLink.js';
import { MergeJournal } from '../../models/MergeJournal.js';
import { Evidence } from '../../models/Evidence.js';
import { Report } from '../../models/Report.js';
import { newId } from '../../utils/ids.js';
import { TUNING, typeFamily, compatibleTypesFor } from '../../contracts/tuning.js';
import { scorePair } from '../../core-logic/correlation.js';
import { haversineDistanceMeters } from '../../core-logic/eta.js';
import { toGeoJson, toWirePoint } from '../../utils/geo.js';
import { appendEvent } from '../../platform/events.js';
import { raiseAlert } from '../alerts/service.js';
import { toIncidentSummary, toIncidentDetail } from '../incidents/service.js';
import { recomputeBeliefs } from '../evidence/service.js';
import { AppError } from '../../platform/errors.js';

const NON_CANDIDATE_STATUSES = ['CLOSED', 'MERGED', 'FALSE_ALARM'];

/** §21.1 blocking — cheap spatial+temporal+type filter before the expensive scoring pass. */
export async function findBlockingCandidates({ type, location, occurredAt, locationAccuracyM }) {
  const cfg = TUNING.correlation.typeWindows[type] || TUNING.correlation.typeWindows.DEFAULT;
  const radius = cfg.radius_m + (locationAccuracyM > TUNING.correlation.lowAccuracyExpandThreshold_m ? locationAccuracyM : 0);
  const windowMs = cfg.window_s * 1000;
  const occurred = new Date(occurredAt);

  const candidates = await Incident.aggregate([
    {
      $geoNear: {
        near: toGeoJson(location),
        distanceField: 'distance_m',
        maxDistance: radius,
        spherical: true,
        query: {
          status: { $nin: NON_CANDIDATE_STATUSES },
          type: { $in: compatibleTypesFor(type) },
          occurred_at: { $gte: new Date(occurred.getTime() - windowMs), $lte: new Date(occurred.getTime() + windowMs) },
        },
      },
    },
    { $limit: TUNING.correlation.blockingLimit },
  ]);
  return candidates;
}

/**
 * Score a report/new-incident candidate against each blocked existing incident.
 * @returns {Array<{incident, score, band, features, contributions, explanation, degraded}>}
 */
export async function scoreCandidates(subject, candidates) {
  const results = [];
  for (const cand of candidates) {
    const distance_m = cand.distance_m ?? haversineDistanceMeters(subject.location, toWirePoint(cand.location));
    const time_delta_s = (new Date(subject.occurred_at).getTime() - new Date(cand.occurred_at).getTime()) / 1000;

    const a = { type: subject.type, entities: subject.entities || [], embedding: subject.embedding,
      source_type: subject.source_type, reporter_ref: subject.reporter_ref };
    const b = { type: cand.type, entities: cand.entities || [], embedding: cand.embedding,
      source_type: cand._lastSourceType, reporter_ref: cand._lastReporterRef };

    const scored = scorePair(a, b, { distance_m, time_delta_s });
    results.push({ incident: cand, ...scored });
  }
  results.sort((x, y) => y.score - x.score);
  return results;
}

export function toLinkWireLite(link) {
  return {
    id: link._id, from_incident_id: link.from_incident_id, to_incident_id: link.to_incident_id,
    relation: link.relation, score: link.score, features: link.features, contributions: link.contributions,
    explanation: link.explanation, decided_by: link.decided_by, confirmed: link.confirmed,
    created_at: link.created_at.toISOString(),
  };
}

export async function createLink({ from_incident_id, to_incident_id, relation, score = null, features = {}, contributions = {}, explanation = '', decided_by = 'SYSTEM', confirmed = false }) {
  const doc = await IncidentLink.findOneAndUpdate(
    { from_incident_id, to_incident_id, relation },
    { $setOnInsert: { _id: newId('link'), from_incident_id, to_incident_id, relation, score, features, contributions, explanation, decided_by, confirmed } },
    { upsert: true, new: true },
  );
  await appendEvent({
    room: 'ops:global', type: 'incident.link_added', entity: { kind: 'incident', id: from_incident_id },
    actor: { kind: decided_by }, payload: toLinkWireLite(doc),
  });
  return doc;
}

/**
 * §21.3 merge semantics — moves reports+evidence to the target, recomputes beliefs+severity,
 * sets sources to MERGED with merged_into_id, writes a merge_journal snapshot per source.
 */
export async function mergeIncidents(targetId, sourceIds, { reason, userId }) {
  const target = await Incident.findById(targetId);
  if (!target) throw new AppError('NOT_FOUND', 'Target incident not found');
  if (sourceIds.includes(targetId)) throw new AppError('UNPROCESSABLE', 'Cannot merge an incident into itself');

  for (const sourceId of sourceIds) {
    const source = await Incident.findById(sourceId);
    if (!source) throw new AppError('NOT_FOUND', `Source incident ${sourceId} not found`);
    if (source.status === 'MERGED') continue;

    const [sourceEvidence, sourceReports] = await Promise.all([
      Evidence.find({ incident_id: sourceId }),
      Report.find({ incident_id: sourceId }),
    ]);

    await MergeJournal.create({
      _id: newId('merge'), target_incident_id: targetId, source_incident_id: sourceId,
      snapshot: { incident: source.toObject(), evidence: sourceEvidence.map((e) => e.toObject()), reports: sourceReports.map((r) => r.toObject()) },
      reason, performed_by: userId,
    });

    await Evidence.updateMany({ incident_id: sourceId }, { $set: { incident_id: targetId } });
    await Report.updateMany({ incident_id: sourceId }, { $set: { incident_id: targetId } });

    source.status = 'MERGED';
    source.merged_into_id = targetId;
    source.version += 1;
    source.updated_at = new Date();
    await source.save();

    await createLink({ from_incident_id: sourceId, to_incident_id: targetId, relation: 'DUPLICATE_OF', decided_by: 'OPERATOR', confirmed: true, explanation: reason });

    target.report_count += source.report_count;
  }

  target.updated_at = new Date();
  await target.save();
  await recomputeBeliefs(targetId, { kind: 'USER', id: userId });

  await appendEvent({
    room: 'ops:global', type: 'incident.merged', entity: { kind: 'incident', id: targetId },
    actor: { kind: 'USER', id: userId }, payload: { target: toIncidentSummary(target), source_incident_ids: sourceIds },
  });

  return toIncidentDetail(await Incident.findById(targetId));
}

/** Unmerge restores the snapshot, re-splits evidence/reports, recomputes both. */
export async function unmergeIncidents(targetId, childIds, { userId }) {
  const restored = [];
  for (const sourceId of childIds) {
    const journal = await MergeJournal.findOne({ target_incident_id: targetId, source_incident_id: sourceId, reverted_at: null }).sort({ performed_at: -1 });
    if (!journal) throw new AppError('NOT_FOUND', `No merge journal entry for ${sourceId} into ${targetId}`);

    const snap = journal.snapshot;
    await Incident.findByIdAndUpdate(sourceId, {
      $set: { status: snap.incident.status, merged_into_id: null, version: (snap.incident.version || 1) + 1, updated_at: new Date() },
    });
    await Evidence.updateMany({ _id: { $in: snap.evidence.map((e) => e._id) } }, { $set: { incident_id: sourceId } });
    await Report.updateMany({ _id: { $in: snap.reports.map((r) => r._id) } }, { $set: { incident_id: sourceId } });

    journal.reverted_at = new Date();
    await journal.save();

    await recomputeBeliefs(sourceId, { kind: 'USER', id: userId });
    restored.push(sourceId);
  }

  await recomputeBeliefs(targetId, { kind: 'USER', id: userId });
  const target = await Incident.findById(targetId);
  target.report_count = await Report.countDocuments({ incident_id: targetId });
  await target.save();

  await appendEvent({
    room: 'ops:global', type: 'incident.unmerged', entity: { kind: 'incident', id: targetId },
    actor: { kind: 'USER', id: userId }, payload: { target: toIncidentSummary(target), restored_incident_ids: restored },
  });

  return restored;
}
