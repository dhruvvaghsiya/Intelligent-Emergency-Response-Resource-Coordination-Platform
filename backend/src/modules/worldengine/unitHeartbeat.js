// Gives units a live pulse: small position jitter + a refreshed last_location_at for units that
// are out and about, reusing the exact write + event the manual POST /units/:id/location endpoint
// performs (modules/resources/routes.js). One unit is deliberately, randomly left un-refreshed for
// a while so modules/monitor/service.js's UNIT_UNRESPONSIVE check has something real to catch —
// today that alert type only ever exists as a seeded fake row.

import { Unit } from '../../models/Unit.js';
import { UnitLocationHistory } from '../../models/UnitLocationHistory.js';
import { toGeoJson, toWirePoint } from '../../utils/geo.js';
import { newId } from '../../utils/ids.js';
import { appendEvent } from '../../platform/events.js';

function toUnitWire(u) {
  return {
    id: u._id, call_sign: u.call_sign, type: u.type, capabilities: u.capabilities, status: u.status,
    station_id: u.station_id, location: toWirePoint(u.location), heading: u.heading,
    last_location_at: u.last_location_at.toISOString(), crew_size: u.crew_size,
    current_assignment_id: u.current_assignment_id, version: u.version, is_simulated: u.is_simulated,
  };
}

function jitterMeters(loc, maxMeters) {
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos((loc.lat * Math.PI) / 180);
  return {
    lng: loc.lng + (Math.random() - 0.5) * 2 * (maxMeters / metersPerDegLng),
    lat: loc.lat + (Math.random() - 0.5) * 2 * (maxMeters / metersPerDegLat),
  };
}

const STALE_ROLL = 0.08; // chance, per tick, that a single AVAILABLE/EN_ROUTE unit is skipped (goes stale)

export async function tickUnitHeartbeat() {
  const units = await Unit.find({ status: { $nin: ['OFFLINE', 'OUT_OF_SERVICE'] } });
  if (!units.length) return;

  const staleThisTick = Math.random() < STALE_ROLL ? units[Math.floor(Math.random() * units.length)]._id : null;

  for (const unit of units) {
    if (unit._id === staleThisTick) continue; // deliberately not refreshed — will surface as stale

    const moving = ['EN_ROUTE', 'ASSIGNED'].includes(unit.status);
    const nextLoc = jitterMeters(toWirePoint(unit.location), moving ? 120 : 25);
    unit.location = toGeoJson(nextLoc);
    unit.last_location_at = new Date();
    await unit.save();

    await UnitLocationHistory.create({ _id: newId('location'), unit_id: unit._id, location: unit.location, recorded_at: unit.last_location_at });
    await appendEvent({ room: `unit:${unit._id}`, type: 'unit.location', entity: { kind: 'unit', id: unit._id }, actor: { kind: 'SYSTEM' }, payload: toUnitWire(unit) });
  }
}
