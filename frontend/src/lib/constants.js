/* =========================================================================
   ENUMS & CONSTANTS — from §13.1 frozen contracts
   ========================================================================= */

export const INCIDENT_TYPE = [
  'FIRE_STRUCTURE','FIRE_INDUSTRIAL','FIRE_VEHICLE','FLOOD','WATERLOGGING',
  'ROAD_ACCIDENT','MEDICAL_EMERGENCY','BUILDING_COLLAPSE','GAS_LEAK','CHEMICAL_SPILL',
  'ELECTRICAL_HAZARD','CROWD_INCIDENT','RESCUE_TRAPPED','INFRASTRUCTURE_FAILURE',
  'DERIVED_RISK','UNKNOWN'
];

export const INCIDENT_STATUS = [
  'REPORTED','TRIAGED','DISPATCHED','ON_SCENE','CONTAINED','RESOLVED','CLOSED','MERGED','FALSE_ALARM'
];

export const SEVERITY = ['CRITICAL','HIGH','MODERATE','LOW','INFO'];

export const SEVERITY_SCORE_BANDS = {
  CRITICAL: { min: 80, max: 100 },
  HIGH:     { min: 60, max: 79 },
  MODERATE: { min: 35, max: 59 },
  LOW:      { min: 15, max: 34 },
  INFO:     { min: 0,  max: 14 },
};

export const SOURCE_TYPE = [
  'EMERGENCY_CALL','CITIZEN_APP','CITIZEN_SMS','SOCIAL_MEDIA','IOT_SENSOR',
  'CCTV_ANALYTICS','FIELD_UNIT','HOSPITAL','GOV_DEPARTMENT','OPERATOR_MANUAL','SYSTEM_DERIVED'
];

export const UNIT_TYPE = [
  'AMBULANCE_BLS','AMBULANCE_ALS','FIRE_ENGINE','FIRE_LADDER','RESCUE_TECHNICAL',
  'HAZMAT','POLICE_PATROL','DISASTER_RESPONSE','WATER_RESCUE','UTILITY_CREW','COMMAND_VEHICLE'
];

export const CAPABILITY = [
  'MEDICAL_BASIC','MEDICAL_ADVANCED','FIRE_SUPPRESSION','HIGH_RISE_ACCESS','EXTRICATION',
  'HAZMAT_CONTAINMENT','WATER_RESCUE','CROWD_CONTROL','HEAVY_LIFT','POWER_ISOLATION','COMMAND'
];

export const UNIT_STATUS = [
  'AVAILABLE','ASSIGNED','EN_ROUTE','ON_SCENE','RETURNING','OUT_OF_SERVICE','OFFLINE'
];

export const ASSIGNMENT_STATUS = [
  'PROPOSED','APPROVED','EN_ROUTE','ON_SCENE','COMPLETED','REJECTED','CANCELLED','PREEMPTED'
];

export const RELATION_TYPE = [
  'DUPLICATE_OF','LIKELY_SAME_AS','RELATED_TO','CAUSED_BY','CAUSES','ESCALATION_OF'
];

export const ROLE = ['ADMIN','COMMANDER','DISPATCHER','ANALYST','FIELD_UNIT','VIEWER'];

export const ALERT_TYPE = [
  'NEW_CRITICAL','SEVERITY_ESCALATED','EVIDENCE_CONFLICT','DUPLICATE_SUSPECTED',
  'COVERAGE_HOLE','RESOURCE_SHORTAGE','REALLOCATION_PROPOSED','SLA_BREACH',
  'CASCADE_RISK','UNIT_UNRESPONSIVE','AI_DEGRADED'
];

export const EVIDENCE_ATTRIBUTE = [
  'people_trapped','casualties_reported','fatalities_reported','fire_active','smoke_heavy',
  'structural_damage','chemical_hazard','gas_leak','water_depth_high','road_blocked',
  'power_down','crowd_large','spread_risk_high','access_restricted'
];

export const ENTITY_TYPE = ['LANDMARK','ROAD','BUILDING','VEHICLE','ORGANISATION','AREA'];
export const ETA_METHOD = ['ROAD_GRAPH','HAVERSINE_FALLBACK'];

/* =========================================================================
   SEVERITY COLOR MAP — maps severity to Tailwind color classes
   ========================================================================= */
export const SEVERITY_CONFIG = {
  CRITICAL: { color: 'text-sev-critical', bg: 'bg-sev-critical-bg', border: 'border-sev-critical', label: 'Critical' },
  HIGH:     { color: 'text-sev-high',     bg: 'bg-sev-high-bg',     border: 'border-sev-high',     label: 'High' },
  MODERATE: { color: 'text-sev-moderate', bg: 'bg-sev-moderate-bg', border: 'border-sev-moderate', label: 'Moderate' },
  LOW:      { color: 'text-sev-low',      bg: 'bg-sev-low-bg',      border: 'border-sev-low',      label: 'Low' },
  INFO:     { color: 'text-sev-info',     bg: 'bg-sev-info-bg',     border: 'border-sev-info',     label: 'Info' },
};

export const STATUS_CONFIG = {
  AVAILABLE:      { color: 'text-status-available', dot: 'bg-status-available', label: 'Available' },
  ASSIGNED:       { color: 'text-status-busy',      dot: 'bg-status-busy',      label: 'Assigned' },
  EN_ROUTE:       { color: 'text-status-enroute',   dot: 'bg-status-enroute',   label: 'En Route' },
  ON_SCENE:       { color: 'text-status-onscene',   dot: 'bg-status-onscene',   label: 'On Scene' },
  RETURNING:      { color: 'text-status-enroute',   dot: 'bg-status-enroute',   label: 'Returning' },
  OUT_OF_SERVICE: { color: 'text-status-offline',   dot: 'bg-status-offline',   label: 'Out of Service' },
  OFFLINE:        { color: 'text-status-offline',   dot: 'bg-status-offline',   label: 'Offline' },
};

export const INCIDENT_STATUS_CONFIG = {
  REPORTED:    { label: 'Reported',    color: 'text-sev-info' },
  TRIAGED:     { label: 'Triaged',     color: 'text-sev-moderate' },
  DISPATCHED:  { label: 'Dispatched',  color: 'text-status-enroute' },
  ON_SCENE:    { label: 'On Scene',    color: 'text-status-onscene' },
  CONTAINED:   { label: 'Contained',   color: 'text-sev-low' },
  RESOLVED:    { label: 'Resolved',    color: 'text-status-available' },
  CLOSED:      { label: 'Closed',      color: 'text-text-muted' },
  MERGED:      { label: 'Merged',      color: 'text-text-muted' },
  FALSE_ALARM: { label: 'False Alarm', color: 'text-text-muted' },
};

/* =========================================================================
   INCIDENT TYPE LABELS & ICONS
   ========================================================================= */
export const INCIDENT_TYPE_CONFIG = {
  FIRE_STRUCTURE:        { label: 'Structure Fire',      icon: 'Flame' },
  FIRE_INDUSTRIAL:       { label: 'Industrial Fire',     icon: 'Factory' },
  FIRE_VEHICLE:          { label: 'Vehicle Fire',        icon: 'Car' },
  FLOOD:                 { label: 'Flood',               icon: 'Waves' },
  WATERLOGGING:          { label: 'Waterlogging',        icon: 'Droplets' },
  ROAD_ACCIDENT:         { label: 'Road Accident',       icon: 'CarFront' },
  MEDICAL_EMERGENCY:     { label: 'Medical Emergency',   icon: 'Heart' },
  BUILDING_COLLAPSE:     { label: 'Building Collapse',   icon: 'Building' },
  GAS_LEAK:              { label: 'Gas Leak',            icon: 'Wind' },
  CHEMICAL_SPILL:        { label: 'Chemical Spill',      icon: 'FlaskConical' },
  ELECTRICAL_HAZARD:     { label: 'Electrical Hazard',   icon: 'Zap' },
  CROWD_INCIDENT:        { label: 'Crowd Incident',      icon: 'Users' },
  RESCUE_TRAPPED:        { label: 'Rescue (Trapped)',    icon: 'ShieldAlert' },
  INFRASTRUCTURE_FAILURE:{ label: 'Infrastructure',      icon: 'Construction' },
  DERIVED_RISK:          { label: 'Derived Risk',        icon: 'AlertTriangle' },
  UNKNOWN:               { label: 'Unknown',             icon: 'HelpCircle' },
};

/* =========================================================================
   SOURCE RELIABILITY PRIORS — §23
   ========================================================================= */
export const SOURCE_RELIABILITY = {
  FIELD_UNIT:      0.93,
  GOV_DEPARTMENT:  0.88,
  HOSPITAL:        0.88,
  IOT_SENSOR:      0.82,
  CCTV_ANALYTICS:  0.72,
  EMERGENCY_CALL:  0.62,
  OPERATOR_MANUAL: 0.90,
  CITIZEN_APP:     0.55,
  CITIZEN_SMS:     0.50,
  SOCIAL_MEDIA:    0.35,
  SYSTEM_DERIVED:  0.60,
};

/* =========================================================================
   LEGAL TRANSITIONS — §19
   ========================================================================= */
export const LEGAL_TRANSITIONS = {
  REPORTED:   ['TRIAGED', 'MERGED', 'FALSE_ALARM'],
  TRIAGED:    ['DISPATCHED', 'MERGED', 'FALSE_ALARM', 'RESOLVED'],
  DISPATCHED: ['ON_SCENE', 'TRIAGED', 'MERGED'],
  ON_SCENE:   ['CONTAINED', 'RESOLVED'],
  CONTAINED:  ['RESOLVED', 'ON_SCENE'],
  RESOLVED:   ['CLOSED', 'ON_SCENE'],
  CLOSED:     [],
  MERGED:     [],
};
