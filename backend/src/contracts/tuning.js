// packages/contracts/src/tuning.ts equivalent — 🔒 frozen keys, 🟡 flexible values (F24)
// Single hot-reloadable-by-convention config file for every numeric knob in the system.

export const TUNING = {
  belief: {
    tauDefault: 900, // seconds, default decay time-constant
    tau: {
      // attribute-specific decay overrides (seconds) — fast-moving attributes decay faster
      fire_active: 600,
      smoke_heavy: 600,
      water_depth_high: 1800,
      road_blocked: 1800,
    },
    conflictTheta: 0.8, // θ — both supporting and refuting weight must clear this to be CONTESTED
    probabilityClamp: [0.02, 0.98],
  },

  // §13.1 / §23 — source reliability priors, declared design-time estimates
  sourcePriors: {
    FIELD_UNIT: 0.93,
    GOV_DEPARTMENT: 0.88,
    HOSPITAL: 0.88,
    IOT_SENSOR: 0.82,
    CCTV_ANALYTICS: 0.72,
    EMERGENCY_CALL: 0.62,
    OPERATOR_MANUAL: 0.90,
    CITIZEN_APP: 0.55,
    CITIZEN_SMS: 0.50,
    SOCIAL_MEDIA: 0.35,
    SYSTEM_DERIVED: 0.60,
  },

  // §20 — severity engine
  severity: {
    weights: {
      life_risk: 0.30,
      hazard_class: 0.16,
      spread_potential: 0.14,
      exposure: 0.12,
      infrastructure_criticality: 0.10,
      time_sensitivity: 0.10,
      access_difficulty: 0.08,
    },
    hazardBaseByType: {
      CHEMICAL_SPILL: 1.0,
      GAS_LEAK: 0.9,
      FIRE_INDUSTRIAL: 0.85,
      FIRE_STRUCTURE: 0.7,
      BUILDING_COLLAPSE: 0.75,
      FLOOD: 0.55,
      ELECTRICAL_HAZARD: 0.5,
      ROAD_ACCIDENT: 0.45,
      FIRE_VEHICLE: 0.4,
      WATERLOGGING: 0.3,
      CROWD_INCIDENT: 0.4,
      RESCUE_TRAPPED: 0.55,
      INFRASTRUCTURE_FAILURE: 0.35,
      MEDICAL_EMERGENCY: 0.3,
      DERIVED_RISK: 0.3,
      UNKNOWN: 0.2,
    },
    // type-specific urgency decay constant (seconds) for time_sensitivity factor
    urgencyDecayByType: {
      MEDICAL_EMERGENCY: 600,
      RESCUE_TRAPPED: 900,
      FIRE_STRUCTURE: 1200,
      FIRE_INDUSTRIAL: 1200,
      GAS_LEAK: 900,
      CHEMICAL_SPILL: 900,
      ROAD_ACCIDENT: 900,
      BUILDING_COLLAPSE: 1200,
      FLOOD: 3600,
      WATERLOGGING: 5400,
      DEFAULT: 1800,
    },
    engineVersion: 'sev-1.0',
  },

  // §21.1 — blocking radius/window per incident type family
  correlation: {
    typeWindows: {
      FIRE_STRUCTURE: { radius_m: 400, window_s: 45 * 60 },
      FIRE_INDUSTRIAL: { radius_m: 400, window_s: 45 * 60 },
      FIRE_VEHICLE: { radius_m: 400, window_s: 45 * 60 },
      ROAD_ACCIDENT: { radius_m: 150, window_s: 20 * 60 },
      MEDICAL_EMERGENCY: { radius_m: 120, window_s: 15 * 60 },
      FLOOD: { radius_m: 1500, window_s: 180 * 60 },
      WATERLOGGING: { radius_m: 1500, window_s: 180 * 60 },
      GAS_LEAK: { radius_m: 600, window_s: 60 * 60 },
      BUILDING_COLLAPSE: { radius_m: 250, window_s: 120 * 60 },
      DEFAULT: { radius_m: 300, window_s: 30 * 60 },
    },
    // type compatibility matrix: identical 1.0, family 0.7, cross-family 0.0
    typeFamilies: {
      FIRE_STRUCTURE: 'FIRE', FIRE_INDUSTRIAL: 'FIRE', FIRE_VEHICLE: 'FIRE',
      FLOOD: 'WATER', WATERLOGGING: 'WATER',
      ROAD_ACCIDENT: 'TRAFFIC',
      MEDICAL_EMERGENCY: 'MEDICAL', RESCUE_TRAPPED: 'MEDICAL',
      BUILDING_COLLAPSE: 'STRUCTURAL',
      GAS_LEAK: 'HAZMAT', CHEMICAL_SPILL: 'HAZMAT', ELECTRICAL_HAZARD: 'HAZMAT',
      CROWD_INCIDENT: 'PUBLIC_ORDER',
      INFRASTRUCTURE_FAILURE: 'INFRASTRUCTURE',
      DERIVED_RISK: 'DERIVED',
      UNKNOWN: 'UNKNOWN',
    },
    weights: {
      f_dist: 0.26,
      f_time: 0.18,
      f_sem: 0.24,
      f_type: 0.12,
      f_entity: 0.12,
      f_indep: -0.08,
    },
    bias: 0,
    bands: {
      DUPLICATE: 0.86,
      LIKELY_SAME: 0.68,
      RELATED: 0.45,
    },
    degradedBandShift: 0.05, // when f_sem unavailable, thresholds +0.05 (§21.2 fallback)
    lowAccuracyExpandThreshold_m: 200,
    blockingLimit: 25,
  },

  // §22.1 — requirement derivation matrix (type/severity → capabilities + units)
  requirements: {
    default: { capabilities: [{ capability: 'MEDICAL_BASIC', count: 1 }], units_required: 1 },
    rules: [
      {
        when: { type: 'FIRE_STRUCTURE', severity: 'CRITICAL', attribute: 'people_trapped', gt: 0.5 },
        capabilities: [
          { capability: 'FIRE_SUPPRESSION', count: 2 },
          { capability: 'EXTRICATION', count: 1 },
          { capability: 'MEDICAL_ADVANCED', count: 1 },
          { capability: 'COMMAND', count: 1 },
        ],
        units_required: 5,
      },
      {
        when: { type: 'FIRE_STRUCTURE' },
        capabilities: [{ capability: 'FIRE_SUPPRESSION', count: 1 }, { capability: 'MEDICAL_BASIC', count: 1 }],
        units_required: 2,
      },
      {
        when: { type: 'FIRE_INDUSTRIAL' },
        capabilities: [
          { capability: 'FIRE_SUPPRESSION', count: 2 },
          { capability: 'HAZMAT_CONTAINMENT', count: 1 },
          { capability: 'COMMAND', count: 1 },
        ],
        units_required: 4,
      },
      {
        when: { type: 'ROAD_ACCIDENT', severity: 'HIGH', attribute: 'casualties_reported', gt: 0.5 },
        capabilities: [
          { capability: 'MEDICAL_BASIC', count: 1 },
          { capability: 'EXTRICATION', count: 1 },
          { capability: 'CROWD_CONTROL', count: 1 },
        ],
        units_required: 3,
      },
      {
        when: { type: 'ROAD_ACCIDENT' },
        capabilities: [{ capability: 'MEDICAL_BASIC', count: 1 }],
        units_required: 1,
      },
      {
        when: { type: 'CHEMICAL_SPILL' },
        capabilities: [
          { capability: 'HAZMAT_CONTAINMENT', count: 1 },
          { capability: 'MEDICAL_ADVANCED', count: 1 },
          { capability: 'COMMAND', count: 1 },
        ],
        units_required: 3,
      },
      {
        when: { type: 'GAS_LEAK' },
        capabilities: [{ capability: 'HAZMAT_CONTAINMENT', count: 1 }, { capability: 'POWER_ISOLATION', count: 1 }],
        units_required: 2,
      },
      {
        when: { type: 'MEDICAL_EMERGENCY' },
        capabilities: [{ capability: 'MEDICAL_BASIC', count: 1 }],
        units_required: 1,
      },
      {
        when: { type: 'FLOOD' },
        capabilities: [{ capability: 'WATER_RESCUE', count: 1 }],
        units_required: 2,
      },
      {
        when: { type: 'BUILDING_COLLAPSE' },
        capabilities: [
          { capability: 'HEAVY_LIFT', count: 1 },
          { capability: 'EXTRICATION', count: 1 },
          { capability: 'MEDICAL_ADVANCED', count: 1 },
        ],
        units_required: 3,
      },
      {
        when: { type: 'CROWD_INCIDENT' },
        capabilities: [{ capability: 'CROWD_CONTROL', count: 2 }],
        units_required: 2,
      },
    ],
  },

  // §22.2 — cost function (seconds-equivalent), all in one place, tunable per strategy
  dispatchCost: {
    alpha_eta: 1.0,
    beta_capability_gap_s: 240,
    gamma_workload_s: 90,
    delta_preemption_regret: 1.0,
    epsilon_specialisation_bonus_s: 60,
    infeasiblePenalty: 1e9,
    strategyDeltaMultiplier: {
      MINIMAL_DISRUPTION: 3,
      FASTEST_RESPONSE: 0.3,
      BALANCED: 1,
    },
    planTtlSeconds: 90,
  },

  eta: {
    haversineDetourFactor: 1.4,
    modeSpeedMps: 11, // ~40 km/h average urban emergency speed
    priorityFactor: 1.25,
  },

  coverage: {
    reachThresholdSeconds: 8 * 60,
    cellSizeDegrees: 0.006, // ~600m quantised grid
    recomputeDebounceMs: 2000,
  },

  // §21 blocking / correlation reused, plus hard alert thresholds
  alerts: {
    slaSecondsByType: {
      MEDICAL_EMERGENCY: 8 * 60,
      RESCUE_TRAPPED: 8 * 60,
      DEFAULT: 15 * 60,
    },
  },

  idempotency: { ttlHours: 24 },
  rateLimit: {
    reportsPerMinutePerIp: 10,
    reportsPerMinutePerSession: 60,
    loginPerMinute: 5,
  },
};

export function typeFamily(type) {
  return TUNING.correlation.typeFamilies[type] || 'UNKNOWN';
}

export function typeCompatibility(a, b) {
  if (a === b) return 1.0;
  if (typeFamily(a) === typeFamily(b) && typeFamily(a) !== 'UNKNOWN') return 0.7;
  return 0.0;
}

export function compatibleTypesFor(type) {
  const fam = typeFamily(type);
  return Object.keys(TUNING.correlation.typeFamilies).filter((t) => typeFamily(t) === fam);
}
