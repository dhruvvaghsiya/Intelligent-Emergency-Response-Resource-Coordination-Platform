// §7 W4 Coverage Radar (P2) — simplified lat/lon quantised grid (no H3 dependency, per README's
// own stated approach) over the AOI. Population weight is a declared simplification: a smooth
// falloff from the city centre rather than real ward-level census data (P2 scope, honestly labelled).

import { Unit } from '../../models/Unit.js';
import { TUNING } from '../../contracts/tuning.js';
import { estimateEta, haversineDistanceMeters } from '../../core-logic/eta.js';

const AOI_BBOX = [72.45, 22.95, 72.72, 23.13];
const CITY_CENTER = { lng: 72.5797, lat: 23.0225 };

function populationWeight(point) {
  const d = haversineDistanceMeters(point, CITY_CENTER);
  return Math.max(0, 1 - d / 15000); // 0..1, decays to 0 by ~15km from centre
}

export async function computeCoverage({ minutes = 8, bbox = AOI_BBOX } = {}) {
  const thresholdSeconds = minutes * 60;
  const cellSize = TUNING.coverage.cellSizeDegrees;
  const units = await Unit.find({ status: { $in: ['AVAILABLE', 'ASSIGNED', 'EN_ROUTE'] } });

  const cells = [];
  for (let lng = bbox[0]; lng <= bbox[2]; lng += cellSize) {
    for (let lat = bbox[1]; lat <= bbox[3]; lat += cellSize) {
      const centroid = { lng: lng + cellSize / 2, lat: lat + cellSize / 2 };
      let bestEta = Infinity;
      for (const u of units) {
        const eta = estimateEta({ lng: u.location.coordinates[0], lat: u.location.coordinates[1] }, centroid);
        if (eta.eta_seconds < bestEta) bestEta = eta.eta_seconds;
      }
      const t_reach_s = Number.isFinite(bestEta) ? bestEta : null;
      const pop = populationWeight(centroid);
      cells.push({
        cell_id: `${centroid.lat.toFixed(3)},${centroid.lng.toFixed(3)}`,
        centroid, population_weight: Math.round(pop * 1000) / 1000,
        t_reach_s, is_hole: pop > 0.05 && (t_reach_s === null || t_reach_s > thresholdSeconds),
      });
    }
  }
  return cells;
}

export function toCoverageGeoJson(cells) {
  return {
    type: 'FeatureCollection',
    features: cells.map((c) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [c.centroid.lng, c.centroid.lat] },
      properties: { cell_id: c.cell_id, t_reach_s: c.t_reach_s, population_weight: c.population_weight, is_hole: c.is_hole },
    })),
  };
}

/** Greedy repositioning suggestion: for each hole cell weighted by population, suggest moving
 * the nearest idle (AVAILABLE) unit that would most reduce its t_reach. Simple, explainable. */
export async function suggestRepositioning(cells) {
  const holes = cells.filter((c) => c.is_hole).sort((a, b) => b.population_weight - a.population_weight).slice(0, 5);
  const idleUnits = await Unit.find({ status: 'AVAILABLE' });
  const suggestions = [];
  for (const hole of holes) {
    let best = null;
    for (const u of idleUnits) {
      const eta = estimateEta({ lng: u.location.coordinates[0], lat: u.location.coordinates[1] }, hole.centroid);
      if (!best || eta.eta_seconds < best.eta_seconds) best = { unit_id: u._id, call_sign: u.call_sign, eta_seconds: eta.eta_seconds };
    }
    if (best) suggestions.push({ cell_id: hole.cell_id, population_weight: hole.population_weight, suggested_unit: best });
  }
  return suggestions;
}
