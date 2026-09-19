// packages/core-logic/eta.ts equivalent — §22.3. We ship the honest fallback (haversine × detour
// factor) as the primary implementation; a real road graph is out of 48h scope and is declared as
// such (`eta_method: HAVERSINE_FALLBACK`) rather than faked.

import { TUNING } from '../contracts/tuning.js';

const EARTH_RADIUS_M = 6371000;

export function haversineDistanceMeters(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * @returns {{distance_m:number, eta_seconds:number, eta_method:'HAVERSINE_FALLBACK'}}
 */
export function estimateEta(from, to, opts = {}) {
  const cfg = TUNING.eta;
  const straightLine = haversineDistanceMeters(from, to);
  const distance_m = Math.round(straightLine * cfg.haversineDetourFactor);
  const speed = (opts.speedMps ?? cfg.modeSpeedMps) * (opts.priority ? cfg.priorityFactor : 1);
  const eta_seconds = Math.round(distance_m / speed);
  return { distance_m, eta_seconds, eta_method: 'HAVERSINE_FALLBACK' };
}
