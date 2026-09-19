// packages/core-logic/severity.ts equivalent — pure, no IO, no AI. §20 SEVERITY ARCHITECTURE.
// score = clamp(0,100, Σ(weight_f × raw_f) × 100), then hard rules apply upward only.

import { TUNING } from '../contracts/tuning.js';
import { SEVERITY_BANDS } from '../contracts/enums.js';
import { b as belief, beliefState } from './belief.js';

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function scoreToSeverity(score) {
  for (const band of SEVERITY_BANDS) {
    if (score >= band.min) return band.severity;
  }
  return 'INFO';
}

const SEVERITY_ORDER = ['INFO', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL'];
function maxSeverity(a, b2) {
  return SEVERITY_ORDER.indexOf(a) >= SEVERITY_ORDER.indexOf(b2) ? a : b2;
}
function minScoreForSeverity(sev) {
  const band = SEVERITY_BANDS.find((x) => x.severity === sev);
  return band ? band.min : 0;
}

function peopleCountBucket(estimate) {
  if (estimate == null) return 1;
  if (estimate <= 1) return 1;
  if (estimate <= 5) return 1.2;
  if (estimate <= 20) return 1.4;
  return 1.6;
}

/**
 * Compute the 7 severity factors from fused beliefs + context.
 * @param {Record<string, {probability:number}>} beliefs
 * @param {object} ctx - { type, occurred_at, now, population_weight, near_critical_infra,
 *                          best_eta_seconds, independent_life_risk_sources }
 */
export function computeFactors(beliefs, ctx) {
  const W = TUNING.severity.weights;
  const factors = [];

  // 1. life_risk
  const fatalityFlag = belief(beliefs, 'fatalities_reported') > 0.5 ? 1.0 : 0;
  const lifeRaw = clamp(
    Math.max(belief(beliefs, 'people_trapped'), belief(beliefs, 'casualties_reported'), fatalityFlag) *
      peopleCountBucket(ctx.people_count_estimate),
    0,
    1,
  );
  factors.push(mkFactor('life_risk', 'Risk to life', lifeRaw, W.life_risk,
    `belief(people_trapped)=${belief(beliefs, 'people_trapped').toFixed(2)}, belief(casualties)=${belief(beliefs, 'casualties_reported').toFixed(2)}`,
    unionEvidence(beliefs, ['people_trapped', 'casualties_reported', 'fatalities_reported'])));

  // 2. hazard_class
  const base = TUNING.severity.hazardBaseByType[ctx.type] ?? TUNING.severity.hazardBaseByType.UNKNOWN;
  const hazardRaw = clamp(base * Math.max(1, 1 + 0.3 * belief(beliefs, 'chemical_hazard')), 0, 1);
  factors.push(mkFactor('hazard_class', 'Hazard class', hazardRaw, W.hazard_class,
    `type base hazard ${base} × chemical factor`, unionEvidence(beliefs, ['chemical_hazard'])));

  // 3. spread_potential
  let spreadRaw;
  if (ctx.type === 'FLOOD' || ctx.type === 'WATERLOGGING') {
    spreadRaw = clamp(belief(beliefs, 'water_depth_high') * (ctx.catchment_factor ?? 1), 0, 1);
  } else {
    spreadRaw = clamp(belief(beliefs, 'fire_active') * belief(beliefs, 'smoke_heavy') +
      (ctx.adjacency_density ?? 0) * 0.2 + (ctx.wind_factor ?? 0) * 0.1, 0, 1);
  }
  factors.push(mkFactor('spread_potential', 'Spread potential', spreadRaw, W.spread_potential,
    'fire_active × smoke_heavy (or water_depth_high for flood types)',
    unionEvidence(beliefs, ['fire_active', 'smoke_heavy', 'water_depth_high'])));

  // 4. exposure
  const exposureRaw = clamp((ctx.population_weight ?? 0) + belief(beliefs, 'crowd_large') * 0.5, 0, 1);
  factors.push(mkFactor('exposure', 'Population exposure', exposureRaw, W.exposure,
    'population weight of containing coverage cell + belief(crowd_large)',
    unionEvidence(beliefs, ['crowd_large'])));

  // 5. infrastructure_criticality
  const infraRaw = clamp((ctx.near_critical_infra ? 0.6 : 0) + belief(beliefs, 'structural_damage') * 0.5, 0, 1);
  factors.push(mkFactor('infrastructure_criticality', 'Infrastructure criticality', infraRaw, W.infrastructure_criticality,
    'proximity to hospital/school/fuel/metro + belief(structural_damage)',
    unionEvidence(beliefs, ['structural_damage'])));

  // 6. time_sensitivity
  const decayConst = TUNING.severity.urgencyDecayByType[ctx.type] ?? TUNING.severity.urgencyDecayByType.DEFAULT;
  const ageSeconds = Math.max(0, ((ctx.now ?? new Date()).getTime() - new Date(ctx.occurred_at).getTime()) / 1000);
  // medical/rescue types GAIN severity as they age (urgency_decay used as growth here, capped at 1)
  const timeRaw = clamp(1 - Math.exp(-ageSeconds / decayConst), 0, 1);
  factors.push(mkFactor('time_sensitivity', 'Time sensitivity', timeRaw, W.time_sensitivity,
    `${Math.round(ageSeconds / 60)} min since occurred_at (type urgency constant ${decayConst}s)`, []));

  // 7. access_difficulty
  const slaSeconds = TUNING.alerts.slaSecondsByType[ctx.type] ?? TUNING.alerts.slaSecondsByType.DEFAULT;
  const etaRatio = ctx.best_eta_seconds != null ? clamp(ctx.best_eta_seconds / slaSeconds - 1, 0, 1) : 0;
  const accessRaw = clamp(
    Math.max(belief(beliefs, 'road_blocked'), belief(beliefs, 'access_restricted')) * 0.7 + etaRatio * 0.3,
    0, 1,
  );
  factors.push(mkFactor('access_difficulty', 'Access difficulty', accessRaw, W.access_difficulty,
    'belief(road_blocked), belief(access_restricted), best ETA vs SLA',
    unionEvidence(beliefs, ['road_blocked', 'access_restricted'])));

  return factors;
}

function mkFactor(key, label, raw, weight, explanation, evidenceIds) {
  return { key, label, raw, weight, contribution: raw * weight * 100, explanation, evidence_ids: evidenceIds };
}

function unionEvidence(beliefs, attrs) {
  const ids = new Set();
  for (const a of attrs) for (const id of beliefs?.[a]?.evidence_ids ?? []) ids.add(id);
  return [...ids];
}

/** §20 hard rules — override the score UPWARD only, never silently downward. */
export function applyHardRules(score, severity, beliefs, ctx, independentLifeRiskSources = 0) {
  const triggered = [];
  let sev = severity;
  let sc = score;

  const bumpTo = (target, code) => {
    if (SEVERITY_ORDER.indexOf(target) > SEVERITY_ORDER.indexOf(sev)) {
      sev = target;
      sc = Math.max(sc, minScoreForSeverity(target));
    }
    triggered.push(code);
  };

  if (belief(beliefs, 'fatalities_reported') > 0.5) bumpTo('HIGH', 'FATALITY_MIN_HIGH');
  if (belief(beliefs, 'people_trapped') > 0.6) bumpTo('CRITICAL', 'TRAPPED_MIN_CRITICAL');

  const exposureFactor = computeFactors(beliefs, ctx).find((f) => f.key === 'exposure');
  if (belief(beliefs, 'chemical_hazard') > 0.5 && (exposureFactor?.raw ?? 0) > 0.5) {
    bumpTo('CRITICAL', 'CHEM_EXPOSURE_MIN_CRITICAL');
  }
  if (ctx.type === 'GAS_LEAK' && belief(beliefs, 'crowd_large') > 0.5) bumpTo('HIGH', 'GAS_LEAK_CROWD_MIN_HIGH');
  if (independentLifeRiskSources >= 3) bumpTo('HIGH', 'CORROBORATED_LIFE_RISK');

  return { score: sc, severity: sev, hard_rules_triggered: triggered };
}

/**
 * Pure scoring function: (beliefs, ctx) -> { severity, score, factors }. No hard rules, no CONTESTED
 * handling — used directly by counterfactuals so a single attribute can be cleanly flipped.
 */
export function scorePure(beliefs, ctx, independentLifeRiskSources = 0) {
  const factors = computeFactors(beliefs, ctx);
  const rawScore = clamp(factors.reduce((sum, f) => sum + f.contribution, 0), 0, 100);
  const bandSeverity = scoreToSeverity(rawScore);
  const { score, severity, hard_rules_triggered } = applyHardRules(rawScore, bandSeverity, beliefs, ctx, independentLifeRiskSources);
  return { score: Math.round(score), severity, factors, hard_rules_triggered };
}

function flipBelief(beliefs, attribute, toTrue) {
  return { ...beliefs, [attribute]: { ...(beliefs[attribute] || {}), probability: toTrue ? 0.95 : 0.05 } };
}

/**
 * Full assessment: handles CONTESTED (pessimistic display + both bounds), computes counterfactuals
 * for the top-3 contributing attributes. Returns a SeverityAssessment-shaped object (§13.2).
 */
export function assessSeverity(beliefs, ctx, opts = {}) {
  const independentLifeRiskSources = opts.independent_life_risk_sources ?? 0;

  // contested handling: recompute pessimistic (contested attrs -> true) and optimistic (-> false)
  const contestedAttrs = Object.entries(beliefs)
    .filter(([, belief2]) => belief2.state === 'CONTESTED')
    .map(([attr]) => attr);

  let pessimisticBeliefs = beliefs;
  let optimisticBeliefs = beliefs;
  for (const attr of contestedAttrs) {
    pessimisticBeliefs = flipBelief(pessimisticBeliefs, attr, true);
    optimisticBeliefs = flipBelief(optimisticBeliefs, attr, false);
  }

  const pessimistic = scorePure(pessimisticBeliefs, ctx, independentLifeRiskSources);
  const displayed = pessimistic; // §20: system displays the pessimistic value

  let confidenceNote = null;
  if (contestedAttrs.length > 0) {
    const optimistic = scorePure(optimisticBeliefs, ctx, independentLifeRiskSources);
    confidenceNote = `CONTESTED: ${contestedAttrs.join(', ')} — held at pessimistic bound ` +
      `${displayed.severity} (${displayed.score}); would be ${optimistic.severity} (${optimistic.score}) if disconfirmed. Pending verification.`;
  }

  // counterfactuals: top 3 contributing attributes among evidence-backed factors
  const topAttrs = rankAttributesByContribution(beliefs, displayed.factors).slice(0, 3);
  const counterfactuals = topAttrs.map((attribute) => {
    const were = belief(beliefs, attribute) < 0.5; // flip to the opposite of current lean
    const flipped = flipBelief(beliefs, attribute, were);
    const result = scorePure(flipped, ctx, independentLifeRiskSources);
    return {
      if_attribute: attribute,
      were,
      then_severity: result.severity,
      then_score: result.score,
    };
  });

  const evidenceConfidence = Object.values(beliefs).length
    ? Object.values(beliefs).reduce((s, bl) => s + (bl.supporting_weight + bl.refuting_weight > 0 ? 1 : 0), 0) /
      Math.max(1, Object.values(beliefs).length)
    : 0;

  return {
    severity: displayed.severity,
    score: displayed.score,
    factors: displayed.factors,
    hard_rules_triggered: displayed.hard_rules_triggered,
    evidence_confidence: Math.round(evidenceConfidence * 1000) / 1000,
    confidence_note: confidenceNote,
    counterfactuals,
    computed_at: new Date().toISOString(),
    engine_version: TUNING.severity.engineVersion,
    overridden_by: null,
    is_contested: contestedAttrs.length > 0,
    contested_attributes: contestedAttrs,
  };
}

const FACTOR_ATTRS = {
  life_risk: ['people_trapped', 'casualties_reported', 'fatalities_reported'],
  hazard_class: ['chemical_hazard'],
  spread_potential: ['fire_active', 'smoke_heavy', 'water_depth_high'],
  exposure: ['crowd_large'],
  infrastructure_criticality: ['structural_damage'],
  time_sensitivity: [],
  access_difficulty: ['road_blocked', 'access_restricted'],
};
function attributesForFactor(key) {
  return FACTOR_ATTRS[key] || [];
}

function rankAttributesByContribution(beliefs, factors) {
  const contributionByAttr = new Map();
  for (const f of factors) {
    for (const attr of attributesForFactor(f.key)) {
      if (!(attr in beliefs)) continue;
      const current = contributionByAttr.get(attr) || 0;
      contributionByAttr.set(attr, current + f.contribution);
    }
  }
  return [...contributionByAttr.entries()].sort((a, b2) => b2[1] - a[1]).map(([attr]) => attr);
}

export { maxSeverity, SEVERITY_ORDER };
