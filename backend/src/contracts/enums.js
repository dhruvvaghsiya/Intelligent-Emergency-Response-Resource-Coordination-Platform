// packages/contracts equivalent — 🔒 FROZEN vocabulary (README §13.1)
// Single source of truth for every enum used across the backend.

export const INCIDENT_TYPE = [
  'FIRE_STRUCTURE', 'FIRE_INDUSTRIAL', 'FIRE_VEHICLE', 'FLOOD', 'WATERLOGGING',
  'ROAD_ACCIDENT', 'MEDICAL_EMERGENCY', 'BUILDING_COLLAPSE', 'GAS_LEAK', 'CHEMICAL_SPILL',
  'ELECTRICAL_HAZARD', 'CROWD_INCIDENT', 'RESCUE_TRAPPED', 'INFRASTRUCTURE_FAILURE',
  'DERIVED_RISK', 'UNKNOWN',
];

export const INCIDENT_STATUS = [
  'REPORTED', 'TRIAGED', 'DISPATCHED', 'ON_SCENE', 'CONTAINED',
  'RESOLVED', 'CLOSED', 'MERGED', 'FALSE_ALARM',
];

export const SEVERITY = ['CRITICAL', 'HIGH', 'MODERATE', 'LOW', 'INFO'];

// numeric bands over severity_score (0-100)
export const SEVERITY_BANDS = [
  { severity: 'CRITICAL', min: 80 },
  { severity: 'HIGH', min: 60 },
  { severity: 'MODERATE', min: 35 },
  { severity: 'LOW', min: 15 },
  { severity: 'INFO', min: 0 },
];

export const SOURCE_TYPE = [
  'EMERGENCY_CALL', 'CITIZEN_APP', 'CITIZEN_SMS', 'SOCIAL_MEDIA', 'IOT_SENSOR',
  'CCTV_ANALYTICS', 'FIELD_UNIT', 'HOSPITAL', 'GOV_DEPARTMENT', 'OPERATOR_MANUAL', 'SYSTEM_DERIVED',
];

export const UNIT_TYPE = [
  'AMBULANCE_BLS', 'AMBULANCE_ALS', 'FIRE_ENGINE', 'FIRE_LADDER', 'RESCUE_TECHNICAL',
  'HAZMAT', 'POLICE_PATROL', 'DISASTER_RESPONSE', 'WATER_RESCUE', 'UTILITY_CREW', 'COMMAND_VEHICLE',
];

export const CAPABILITY = [
  'MEDICAL_BASIC', 'MEDICAL_ADVANCED', 'FIRE_SUPPRESSION', 'HIGH_RISE_ACCESS', 'EXTRICATION',
  'HAZMAT_CONTAINMENT', 'WATER_RESCUE', 'CROWD_CONTROL', 'HEAVY_LIFT', 'POWER_ISOLATION', 'COMMAND',
];

export const UNIT_STATUS = [
  'AVAILABLE', 'ASSIGNED', 'EN_ROUTE', 'ON_SCENE', 'RETURNING', 'OUT_OF_SERVICE', 'OFFLINE',
];

export const ASSIGNMENT_STATUS = [
  'PROPOSED', 'APPROVED', 'EN_ROUTE', 'ON_SCENE', 'COMPLETED', 'REJECTED', 'CANCELLED', 'PREEMPTED',
];

// assignment statuses that mean "this unit is actively holding this assignment"
export const ACTIVE_ASSIGNMENT_STATUSES = ['APPROVED', 'EN_ROUTE', 'ON_SCENE'];

export const RELATION_TYPE = [
  'DUPLICATE_OF', 'LIKELY_SAME_AS', 'RELATED_TO', 'CAUSED_BY', 'CAUSES', 'ESCALATION_OF',
];

// §access-control — single role by design: anyone can view (see modules/*/routes.js's
// optionalAuthenticate GETs), and the one authenticated tier does everything else. No more
// COMMANDER/DISPATCHER/ANALYST/FIELD_UNIT/VIEWER split.
export const ROLE = ['ADMIN'];

export const ALERT_TYPE = [
  'NEW_CRITICAL', 'SEVERITY_ESCALATED', 'EVIDENCE_CONFLICT', 'DUPLICATE_SUSPECTED',
  'COVERAGE_HOLE', 'RESOURCE_SHORTAGE', 'REALLOCATION_PROPOSED', 'SLA_BREACH',
  'CASCADE_RISK', 'UNIT_UNRESPONSIVE', 'AI_DEGRADED',
];

// CLOSED registry — AI/extraction may ONLY emit attributes from this list (§13.1, F15)
export const EVIDENCE_ATTRIBUTE = [
  'people_trapped', 'casualties_reported', 'fatalities_reported', 'fire_active', 'smoke_heavy',
  'structural_damage', 'chemical_hazard', 'gas_leak', 'water_depth_high', 'road_blocked',
  'power_down', 'crowd_large', 'spread_risk_high', 'access_restricted',
];

export const ENTITY_TYPE = ['LANDMARK', 'ROAD', 'BUILDING', 'VEHICLE', 'ORGANISATION', 'AREA'];

export const ETA_METHOD = ['ROAD_GRAPH', 'HAVERSINE_FALLBACK'];

export const BELIEF_STATE = ['SUPPORTED', 'REFUTED', 'CONTESTED', 'UNKNOWN'];

export const CORRELATION_BAND = ['DUPLICATE', 'LIKELY_SAME', 'RELATED', 'INDEPENDENT'];

export const DISPATCH_STRATEGY = ['MINIMAL_DISRUPTION', 'FASTEST_RESPONSE', 'BALANCED'];

export const JOB_STATUS = ['PENDING', 'RUNNING', 'DONE', 'FAILED', 'DEAD'];

export const JOB_KIND = ['PROCESS_REPORT', 'RECOMPUTE_COVERAGE', 'APPLY_CASCADE_TTL_SWEEP'];

export function isEnumValue(list, value) {
  return list.includes(value);
}
