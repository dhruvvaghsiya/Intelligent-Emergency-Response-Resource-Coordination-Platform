// packages/core-logic/belief.ts equivalent — pure, no IO. The intellectual core of the product.
// fuse(evidence[], now) -> Belief   (§13.2 Belief schema, §23 full spec)

import { TUNING } from '../contracts/tuning.js';

const LOGIT = (p) => Math.log(p / (1 - p));
const SIGMOID = (l) => 1 / (1 + Math.exp(-l));

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * @param {Array} evidenceList - Evidence documents (or plain objects) for ONE attribute.
 * @param {Date} now
 * @param {object} cfg - defaults to TUNING.belief
 * @returns {{probability:number, log_odds:number, state:string, supporting_weight:number,
 *            refuting_weight:number, evidence_ids:string[]}}
 */
export function fuse(evidenceList, now = new Date(), cfg = TUNING.belief) {
  let pos = 0;
  let neg = 0;
  let L = 0;
  const evidenceIds = [];

  for (const e of evidenceList) {
    if (e.superseded) continue;
    evidenceIds.push(String(e.id || e._id));

    const ageSeconds = Math.max(0, (now.getTime() - new Date(e.observed_at).getTime()) / 1000);
    const tau = cfg.tau[e.attribute] ?? cfg.tauDefault;
    const decay = Math.exp(-ageSeconds / tau);

    const w = e.source_reliability * e.extraction_confidence * decay;
    const p = clamp(e.asserted_probability, cfg.probabilityClamp[0], cfg.probabilityClamp[1]);

    L += w * LOGIT(p);
    if (p >= 0.5) pos += w;
    else neg += w;
  }

  const probability = SIGMOID(L);
  let state;
  if (pos >= cfg.conflictTheta && neg >= cfg.conflictTheta) state = 'CONTESTED';
  else if (probability >= 0.6) state = 'SUPPORTED';
  else if (probability <= 0.4) state = 'REFUTED';
  else state = 'UNKNOWN';

  return {
    probability,
    log_odds: L,
    state,
    supporting_weight: pos,
    refuting_weight: neg,
    evidence_ids: evidenceIds,
  };
}

/**
 * Fuse every attribute present in a flat evidence list into a map of Belief objects,
 * keyed by attribute. Only attributes with at least one non-superseded evidence item appear.
 */
export function fuseAll(evidenceList, now = new Date(), cfg = TUNING.belief) {
  const byAttribute = new Map();
  for (const e of evidenceList) {
    if (!byAttribute.has(e.attribute)) byAttribute.set(e.attribute, []);
    byAttribute.get(e.attribute).push(e);
  }
  const beliefs = {};
  for (const [attribute, list] of byAttribute.entries()) {
    beliefs[attribute] = { attribute, ...fuse(list, now, cfg), last_updated_at: now.toISOString() };
  }
  return beliefs;
}

/** Convenience accessor used throughout severity.js — belief(attr) -> probability (0 if unknown). */
export function b(beliefs, attribute) {
  return beliefs?.[attribute]?.probability ?? 0;
}

export function beliefState(beliefs, attribute) {
  return beliefs?.[attribute]?.state ?? 'UNKNOWN';
}
