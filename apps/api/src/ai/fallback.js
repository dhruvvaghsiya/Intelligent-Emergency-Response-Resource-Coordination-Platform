// §16.4 fallback chain — every AI path has a deterministic backend-owned fallback. These are not
// scaffolding; per the README they are a shipped feature that keeps the pipeline alive when the
// AI service is down, slow, or simply not deployed in this backend-only build.

import { EVIDENCE_ATTRIBUTE, INCIDENT_TYPE } from '../contracts/enums.js';

// type_keywords.yaml mirror (§16.1 keyword classifier)
const TYPE_KEYWORDS = {
  FIRE_STRUCTURE: ['fire', 'blaze', 'burning', 'flames', 'smoke', 'aag'],
  FIRE_INDUSTRIAL: ['factory fire', 'industrial fire', 'chemical unit fire', 'plant fire'],
  FIRE_VEHICLE: ['car fire', 'vehicle fire', 'bus fire', 'truck fire'],
  FLOOD: ['flood', 'flooding', 'overflow', 'river rising', 'inundated'],
  WATERLOGGING: ['waterlogging', 'water logged', 'water-logged', 'rainwater'],
  ROAD_ACCIDENT: ['accident', 'collision', 'crash', 'pileup', 'hit and run', 'overturned'],
  MEDICAL_EMERGENCY: ['heart attack', 'unconscious', 'not breathing', 'medical emergency', 'collapsed'],
  BUILDING_COLLAPSE: ['collapse', 'collapsed', 'building fell', 'wall fell', 'structure down'],
  GAS_LEAK: ['gas leak', 'gas smell', 'lpg leak', 'cylinder leak'],
  CHEMICAL_SPILL: ['chemical spill', 'toxic spill', 'acid spill', 'hazmat'],
  ELECTRICAL_HAZARD: ['electrocution', 'live wire', 'power line down', 'sparking wire'],
  CROWD_INCIDENT: ['stampede', 'crowd', 'riot', 'mob', 'crush'],
  RESCUE_TRAPPED: ['trapped', 'stuck', 'stranded', 'people trapped'],
  INFRASTRUCTURE_FAILURE: ['pipe burst', 'bridge damage', 'road cave', 'sinkhole'],
};

const ATTRIBUTE_KEYWORDS = {
  people_trapped: ['trapped', 'stuck inside', 'unable to get out', 'stranded'],
  casualties_reported: ['injured', 'casualties', 'hurt', 'wounded'],
  fatalities_reported: ['dead', 'died', 'killed', 'fatality', 'fatalities'],
  fire_active: ['fire', 'burning', 'blaze', 'flames'],
  smoke_heavy: ['thick smoke', 'heavy smoke', 'black smoke'],
  structural_damage: ['collapse', 'crack', 'structural damage', 'wall down'],
  chemical_hazard: ['chemical', 'toxic', 'hazmat', 'acid', 'gas cylinder'],
  gas_leak: ['gas leak', 'gas smell', 'lpg'],
  water_depth_high: ['deep water', 'waist deep', 'submerged', 'knee deep water'],
  road_blocked: ['road blocked', 'road closed', 'traffic jam', 'route blocked'],
  power_down: ['power cut', 'power down', 'no electricity', 'blackout'],
  crowd_large: ['large crowd', 'huge crowd', 'many people gathered'],
  spread_risk_high: ['spreading fast', 'spreading rapidly', 'spread risk'],
  access_restricted: ['no access', 'cannot reach', 'access restricted', 'narrow lane'],
};

/** §16.1 — TF-IDF+SVC stand-in: simple keyword scoring, deterministic, offline. */
export function keywordClassify(text = '') {
  const lower = text.toLowerCase();
  let best = 'UNKNOWN';
  let bestScore = 0;
  const scores = {};
  for (const type of Object.keys(TYPE_KEYWORDS)) {
    const hits = TYPE_KEYWORDS[type].filter((kw) => lower.includes(kw)).length;
    scores[type] = hits;
    if (hits > bestScore) {
      bestScore = hits;
      best = type;
    }
  }
  const confidence = bestScore === 0 ? 0.15 : Math.min(0.9, 0.4 + bestScore * 0.2);
  const top_k = Object.entries(scores)
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type, s]) => ({ type, score: s }));
  return { type: INCIDENT_TYPE.includes(best) ? best : 'UNKNOWN', confidence, top_k };
}

/** §16.1 regex attribute matcher — closed-vocabulary, clamped probabilities (§16.2 post-processing). */
export function regexExtractAttributes(text = '') {
  const lower = text.toLowerCase();
  const attributes = [];
  for (const attribute of EVIDENCE_ATTRIBUTE) {
    const keywords = ATTRIBUTE_KEYWORDS[attribute] || [];
    const hit = keywords.find((kw) => lower.includes(kw));
    if (hit) {
      attributes.push({
        attribute,
        asserted_probability: 0.7, // moderate — a keyword hit is not a confirmed claim
        extraction_confidence: 0.55,
        span: hit,
      });
    }
  }
  return attributes;
}

/** deterministic hashing embedding — poor recall but valid, always available, no network. */
export function hashingEmbedding(text = '', dims = 384) {
  const vec = new Array(dims).fill(0);
  const tokens = text.toLowerCase().match(/[a-z0-9ऀ-ॿ઀-૿]+/g) || [];
  for (const token of tokens) {
    let hash = 2166136261;
    for (let i = 0; i < token.length; i++) {
      hash ^= token.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    const idx = Math.abs(hash) % dims;
    vec[idx] += 1;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

export function templatedBriefing(incident) {
  const parts = [
    `${incident.type.replace(/_/g, ' ')} at ${incident.address || 'reported location'}.`,
    `Severity ${incident.severity} (${incident.severity_score}).`,
    incident.report_count ? `${incident.report_count} report(s) received.` : null,
  ].filter(Boolean);
  return { briefing: parts.join(' '), bullet_points: parts, degraded: true };
}
