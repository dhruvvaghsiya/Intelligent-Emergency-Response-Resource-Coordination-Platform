// §7 W5 CASCADE PROJECTION — P2/wow feature. This backend-only build ships the typed rule-graph
// *shape* (so the pipeline step and the API surface are real) with a minimal starter rule set
// rather than the full flood/plume rule library — that is an honest, declared scope cut (§35 P2).

import { RoadSegment } from '../../models/RoadSegment.js';
import { Incident } from '../../models/Incident.js';
import { appendEvent } from '../../platform/events.js';
import { raiseAlert } from '../alerts/service.js';
import { b as belief } from '../../core-logic/belief.js';

const RULES = [
  {
    id: 'FLOOD_BLOCKS_NEARBY_ROADS',
    when: (incident) => (incident.type === 'FLOOD' || incident.type === 'WATERLOGGING') && belief(incident.beliefs, 'water_depth_high') >= 0.6,
    effect_type: 'ROAD_BLOCK',
    confidence: 0.8,
    ttl_s: 15 * 60,
    rationale: (incident) => `${incident.code}: high water depth reported, nearby road segments are likely impassable.`,
  },
];

/** Applies any matching cascade rules for an incident, mutating road segment state with a TTL.
 * Mutations are the point (§7 W5): "a cascade prediction is only allowed to exist if it mutates
 * concrete system state" — never a free-floating prophecy. */
export async function applyCascadeEffects(incidentId) {
  const incident = await Incident.findById(incidentId);
  if (!incident) return [];

  const applied = [];
  for (const rule of RULES) {
    if (!rule.when(incident)) continue;

    const nearbySegments = await RoadSegment.find({
      geometry: { $near: { $geometry: incident.location, $maxDistance: 800 } },
      status: 'OPEN',
    }).limit(5);

    const blockedUntil = new Date(Date.now() + rule.ttl_s * 1000);
    for (const seg of nearbySegments) {
      seg.status = 'BLOCKED';
      seg.blocked_until = blockedUntil;
      seg.blocked_by_incident_id = incidentId;
      await seg.save();
    }

    if (nearbySegments.length > 0) {
      applied.push({ rule_id: rule.id, effect_type: rule.effect_type, confidence: rule.confidence, ttl_s: rule.ttl_s, segment_ids: nearbySegments.map((s) => s._id) });
      await appendEvent({
        room: 'ops:global', type: 'cascade.effect_applied', entity: { kind: 'incident', id: incidentId },
        actor: { kind: 'SYSTEM' }, payload: { rule_id: rule.id, segment_ids: nearbySegments.map((s) => s._id), rationale: rule.rationale(incident) },
      });
      await raiseAlert({
        type: 'CASCADE_RISK', severity: incident.severity, incident_id: incidentId,
        title: `Cascade effect: ${rule.id}`, body: rule.rationale(incident),
        payload: { segment_ids: nearbySegments.map((s) => s._id) },
      });
    }
  }
  return applied;
}

/** TTL sweep job — reopens road segments whose cascade-induced block has expired. */
export async function sweepExpiredCascadeEffects() {
  const now = new Date();
  const result = await RoadSegment.updateMany(
    { status: 'BLOCKED', blocked_until: { $lte: now } },
    { $set: { status: 'OPEN', blocked_until: null, blocked_by_incident_id: null } },
  );
  return result.modifiedCount;
}
