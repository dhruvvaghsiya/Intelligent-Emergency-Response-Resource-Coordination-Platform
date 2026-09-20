// Hospital capacity was seeded once and never moved again (Hospital.beds_available /
// icu_available are only ever set by seed/seed.js or a manual PATCH). This gives it a heartbeat:
// a gentle random walk always, and real depletion when a CRITICAL incident is active nearby —
// which is what modules/monitor/service.js's RESOURCE_SHORTAGE check now has real data to read.

import { Hospital } from '../../models/Hospital.js';
import { Incident } from '../../models/Incident.js';
import { haversineDistanceMeters } from '../../core-logic/eta.js';
import { toWirePoint } from '../../utils/geo.js';
import { appendEvent } from '../../platform/events.js';
import { ingestSimulatedReport } from './ingest.js';
import { sourceLabel, INCIDENT_PROFILES } from './content.js';
import { jitterLocation } from './geography.js';
import { logger } from '../../platform/logger.js';

const NEARBY_RADIUS_M = 6000;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function toHospitalWire(h) {
  return {
    id: h._id, name: h.name, location: toWirePoint(h.location), beds_total: h.beds_total,
    beds_available: h.beds_available, icu_available: h.icu_available, specialities: h.specialities,
    updated_at: h.updated_at.toISOString(), is_simulated: h.is_simulated,
  };
}

export async function tickHospitalFeed(simRunId) {
  const hospitals = await Hospital.find();
  if (!hospitals.length) return;

  const criticalNearby = await Incident.find({
    severity: 'CRITICAL',
    status: { $nin: ['CLOSED', 'RESOLVED', 'MERGED', 'FALSE_ALARM'] },
    updated_at: { $gte: new Date(Date.now() - 20 * 60 * 1000) },
  });

  for (const hospital of hospitals) {
    const strainSource = criticalNearby.find((inc) => {
      const incLoc = toWirePoint(inc.location);
      return incLoc && haversineDistanceMeters(incLoc, toWirePoint(hospital.location)) <= NEARBY_RADIUS_M;
    });

    let bedDelta = Math.round((Math.random() - 0.55) * 2); // gentle drift, slight downward bias
    let icuDelta = Math.random() < 0.3 ? (Math.random() < 0.5 ? -1 : 1) : 0;

    if (strainSource) {
      bedDelta -= 1 + Math.floor(Math.random() * 3);
      icuDelta -= Math.random() < 0.5 ? 1 : 0;
    }

    const nextBeds = clamp(hospital.beds_available + bedDelta, 0, hospital.beds_total);
    const nextIcu = clamp(hospital.icu_available + icuDelta, 0, Math.max(2, Math.round(hospital.beds_total * 0.1)));
    if (nextBeds === hospital.beds_available && nextIcu === hospital.icu_available) continue;

    hospital.beds_available = nextBeds;
    hospital.icu_available = nextIcu;
    hospital.updated_at = new Date();
    await hospital.save();

    await appendEvent({
      room: 'ops:global', type: 'hospital.updated', entity: { kind: 'hospital', id: hospital._id },
      actor: { kind: 'SYSTEM' }, payload: toHospitalWire(hospital),
    });

    if (strainSource && Math.random() < 0.5) {
      const profile = INCIDENT_PROFILES[strainSource.type];
      const place = strainSource.ward || hospital.name;
      const text = profile
        ? `${hospital.name} ER: inbound casualties from the ${strainSource.code} incident, ${hospital.beds_available} beds / ${hospital.icu_available} ICU remaining.`
        : `${hospital.name} ER: capacity strain, ${hospital.beds_available} beds / ${hospital.icu_available} ICU remaining.`;
      await ingestSimulatedReport({
        source_type: 'HOSPITAL', source_label: sourceLabel('HOSPITAL'), text,
        location: jitterLocation(toWirePoint(hospital.location), 50), sim_run_id: simRunId, notable: true,
      }).catch((err) => logger.warn({ err }, 'worldengine: hospital strain report failed'));
    }
  }
}
