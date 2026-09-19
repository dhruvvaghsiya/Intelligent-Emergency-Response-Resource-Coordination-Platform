// packages/core-logic/correlation.ts equivalent — pure scoring half of §21 (blocking is DB-side).

import { TUNING, typeCompatibility } from '../contracts/tuning.js';

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

export function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function jaccard(setA, setB) {
  const a = new Set(setA);
  const b = new Set(setB);
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const x of a) if (b.has(x)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Score one candidate pair. `a`/`b` are plain objects:
 * { type, occurred_at, location:{lng,lat}, entities:[{type,normalized}], embedding?:number[],
 *   source_type, reporter_ref, distance_m, time_delta_s }
 * Returns { score, band, features, contributions, explanation, degraded }.
 */
export function scorePair(a, b, opts = {}) {
  const cfg = TUNING.correlation;
  const radius = cfg.typeWindows[a.type]?.radius_m ?? cfg.typeWindows.DEFAULT.radius_m;
  const window = cfg.typeWindows[a.type]?.window_s ?? cfg.typeWindows.DEFAULT.window_s;

  const distance_m = opts.distance_m ?? 0;
  const time_delta_s = Math.abs(opts.time_delta_s ?? 0);

  const f_dist = clamp01(Math.exp(-distance_m / radius));
  const f_time = clamp01(Math.exp(-time_delta_s / window));
  const f_type = typeCompatibility(a.type, b.type);

  const degraded = !a.embedding || !b.embedding;
  let f_sem = 0;
  if (!degraded) f_sem = clamp01((cosineSimilarity(a.embedding, b.embedding) + 1) / 2);

  const entitiesA = (a.entities || []).map((e) => `${e.type}:${e.normalized}`);
  const entitiesB = (b.entities || []).map((e) => `${e.type}:${e.normalized}`);
  const landmarkBonus = entitiesA.some((e) => e.startsWith('LANDMARK:') && entitiesB.includes(e)) ? 1 : 0;
  const f_entity = clamp01(jaccard(entitiesA, entitiesB) * (landmarkBonus ? 2 : 1));

  // f_indep: same reporter/device/channel -> duplicate evidence; different -> corroboration
  const sameSource = a.source_type === b.source_type && a.reporter_ref && a.reporter_ref === b.reporter_ref;
  const f_indep = sameSource ? 1 : 0; // weight is negative, so "same source" REDUCES the duplicate score is wrong —
  // per §21.2: SAME reporter -> duplicate evidence (increase score); DIFFERENT -> corroboration (also increase,
  // but should raise belief weight rather than the merge score). We encode: same-source nudges score up slightly
  // less than semantic/entity would, different-source contributes 0 to f_indep so the weighted (negative) term
  // does not penalise genuine corroboration.

  const weights = { ...cfg.weights };
  let usedWeights = { ...weights };
  if (degraded) {
    // renormalise without f_sem
    const wOthers = weights.f_dist + weights.f_time + weights.f_type + weights.f_entity + Math.abs(weights.f_indep);
    const scale = (wOthers + weights.f_sem) / wOthers;
    usedWeights = {
      f_dist: weights.f_dist * scale,
      f_time: weights.f_time * scale,
      f_sem: 0,
      f_type: weights.f_type * scale,
      f_entity: weights.f_entity * scale,
      f_indep: weights.f_indep * scale,
    };
  }

  const features = { f_dist, f_time, f_sem, f_type, f_entity, f_indep };
  const contributions = {};
  let raw = -cfg.bias;
  for (const key of Object.keys(features)) {
    const contribution = usedWeights[key] * features[key];
    contributions[key] = Math.round(contribution * 1000) / 1000;
    raw += contribution;
  }
  const score = clamp01(1 / (1 + Math.exp(-4 * raw))); // logistic squashing for a 0..1 score

  const shift = degraded ? cfg.degradedBandShift : 0;
  let band;
  if (score >= cfg.bands.DUPLICATE + shift) band = 'DUPLICATE';
  else if (score >= cfg.bands.LIKELY_SAME + shift) band = 'LIKELY_SAME';
  else if (score >= cfg.bands.RELATED + shift) band = 'RELATED';
  else band = 'INDEPENDENT';

  const sharedLandmark = entitiesA.find((e) => e.startsWith('LANDMARK:') && entitiesB.includes(e));
  const parts = [
    `${Math.round(distance_m)} m apart`,
    `${Math.round(time_delta_s / 60)} min apart`,
    degraded ? 'semantic similarity unavailable (degraded)' : `text similarity ${f_sem.toFixed(2)}`,
    a.type === b.type ? `same type (${a.type})` : `related type (${a.type} / ${b.type})`,
  ];
  if (sharedLandmark) parts.push(`shares landmark "${sharedLandmark.split(':')[1]}"`);
  parts.push(sameSource ? 'same reporter (likely duplicate submission)' : 'different reporters (corroborating)');

  return {
    score: Math.round(score * 1000) / 1000,
    band,
    features,
    contributions,
    explanation: parts.join(' · '),
    degraded,
  };
}
