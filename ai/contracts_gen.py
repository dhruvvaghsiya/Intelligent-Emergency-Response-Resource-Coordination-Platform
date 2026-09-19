# PRAHARI AI Service - contracts_gen.py
# Generated from packages/contracts/src/enums.ts — DO NOT EDIT MANUALLY
# This file mirrors the frozen TypeScript enums for cross-language consistency.
# Any change must be reflected in packages/contracts first.

from typing import Literal

# ─── Incident Types ──────────────────────────────────────────────────────────
INCIDENT_TYPE = [
    "FIRE_STRUCTURE", "FIRE_INDUSTRIAL", "FIRE_VEHICLE", "FLOOD", "WATERLOGGING",
    "ROAD_ACCIDENT", "MEDICAL_EMERGENCY", "BUILDING_COLLAPSE", "GAS_LEAK",
    "CHEMICAL_SPILL", "ELECTRICAL_HAZARD", "CROWD_INCIDENT", "RESCUE_TRAPPED",
    "INFRASTRUCTURE_FAILURE", "DERIVED_RISK", "UNKNOWN",
]
IncidentType = Literal[
    "FIRE_STRUCTURE", "FIRE_INDUSTRIAL", "FIRE_VEHICLE", "FLOOD", "WATERLOGGING",
    "ROAD_ACCIDENT", "MEDICAL_EMERGENCY", "BUILDING_COLLAPSE", "GAS_LEAK",
    "CHEMICAL_SPILL", "ELECTRICAL_HAZARD", "CROWD_INCIDENT", "RESCUE_TRAPPED",
    "INFRASTRUCTURE_FAILURE", "DERIVED_RISK", "UNKNOWN",
]

# ─── Incident Statuses ──────────────────────────────────────────────────────
INCIDENT_STATUS = [
    "REPORTED", "TRIAGED", "DISPATCHED", "ON_SCENE", "CONTAINED",
    "RESOLVED", "CLOSED", "MERGED", "FALSE_ALARM",
]
IncidentStatus = Literal[
    "REPORTED", "TRIAGED", "DISPATCHED", "ON_SCENE", "CONTAINED",
    "RESOLVED", "CLOSED", "MERGED", "FALSE_ALARM",
]

# ─── Severity Levels ────────────────────────────────────────────────────────
# Numeric bands over severity_score (0-100):
# CRITICAL ≥80, HIGH 60-79, MODERATE 35-59, LOW 15-34, INFO <15
SEVERITY = ["CRITICAL", "HIGH", "MODERATE", "LOW", "INFO"]
Severity = Literal["CRITICAL", "HIGH", "MODERATE", "LOW", "INFO"]

# ─── Source Types ────────────────────────────────────────────────────────────
SOURCE_TYPE = [
    "EMERGENCY_CALL", "CITIZEN_APP", "CITIZEN_SMS", "SOCIAL_MEDIA", "IOT_SENSOR",
    "CCTV_ANALYTICS", "FIELD_UNIT", "HOSPITAL", "GOV_DEPARTMENT",
    "OPERATOR_MANUAL", "SYSTEM_DERIVED",
]
SourceType = Literal[
    "EMERGENCY_CALL", "CITIZEN_APP", "CITIZEN_SMS", "SOCIAL_MEDIA", "IOT_SENSOR",
    "CCTV_ANALYTICS", "FIELD_UNIT", "HOSPITAL", "GOV_DEPARTMENT",
    "OPERATOR_MANUAL", "SYSTEM_DERIVED",
]

# ─── Unit Types ──────────────────────────────────────────────────────────────
UNIT_TYPE = [
    "AMBULANCE_BLS", "AMBULANCE_ALS", "FIRE_ENGINE", "FIRE_LADDER",
    "RESCUE_TECHNICAL", "HAZMAT", "POLICE_PATROL", "DISASTER_RESPONSE",
    "WATER_RESCUE", "UTILITY_CREW", "COMMAND_VEHICLE",
]
UnitType = Literal[
    "AMBULANCE_BLS", "AMBULANCE_ALS", "FIRE_ENGINE", "FIRE_LADDER",
    "RESCUE_TECHNICAL", "HAZMAT", "POLICE_PATROL", "DISASTER_RESPONSE",
    "WATER_RESCUE", "UTILITY_CREW", "COMMAND_VEHICLE",
]

# ─── Capabilities ────────────────────────────────────────────────────────────
CAPABILITY = [
    "MEDICAL_BASIC", "MEDICAL_ADVANCED", "FIRE_SUPPRESSION", "HIGH_RISE_ACCESS",
    "EXTRICATION", "HAZMAT_CONTAINMENT", "WATER_RESCUE", "CROWD_CONTROL",
    "HEAVY_LIFT", "POWER_ISOLATION", "COMMAND",
]
Capability = Literal[
    "MEDICAL_BASIC", "MEDICAL_ADVANCED", "FIRE_SUPPRESSION", "HIGH_RISE_ACCESS",
    "EXTRICATION", "HAZMAT_CONTAINMENT", "WATER_RESCUE", "CROWD_CONTROL",
    "HEAVY_LIFT", "POWER_ISOLATION", "COMMAND",
]

# ─── Unit Statuses ───────────────────────────────────────────────────────────
UNIT_STATUS = [
    "AVAILABLE", "ASSIGNED", "EN_ROUTE", "ON_SCENE", "RETURNING",
    "OUT_OF_SERVICE", "OFFLINE",
]
UnitStatus = Literal[
    "AVAILABLE", "ASSIGNED", "EN_ROUTE", "ON_SCENE", "RETURNING",
    "OUT_OF_SERVICE", "OFFLINE",
]

# ─── Assignment Statuses ─────────────────────────────────────────────────────
ASSIGNMENT_STATUS = [
    "PROPOSED", "APPROVED", "EN_ROUTE", "ON_SCENE", "COMPLETED",
    "REJECTED", "CANCELLED", "PREEMPTED",
]
AssignmentStatus = Literal[
    "PROPOSED", "APPROVED", "EN_ROUTE", "ON_SCENE", "COMPLETED",
    "REJECTED", "CANCELLED", "PREEMPTED",
]

# ─── Relation Types ──────────────────────────────────────────────────────────
RELATION_TYPE = [
    "DUPLICATE_OF", "LIKELY_SAME_AS", "RELATED_TO", "CAUSED_BY", "CAUSES",
    "ESCALATION_OF",
]
RelationType = Literal[
    "DUPLICATE_OF", "LIKELY_SAME_AS", "RELATED_TO", "CAUSED_BY", "CAUSES",
    "ESCALATION_OF",
]

# ─── Roles ───────────────────────────────────────────────────────────────────
ROLE = ["ADMIN", "COMMANDER", "DISPATCHER", "ANALYST", "FIELD_UNIT", "VIEWER"]
Role = Literal["ADMIN", "COMMANDER", "DISPATCHER", "ANALYST", "FIELD_UNIT", "VIEWER"]

# ─── Alert Types ─────────────────────────────────────────────────────────────
ALERT_TYPE = [
    "NEW_CRITICAL", "SEVERITY_ESCALATED", "EVIDENCE_CONFLICT",
    "DUPLICATE_SUSPECTED", "COVERAGE_HOLE", "RESOURCE_SHORTAGE",
    "REALLOCATION_PROPOSED", "SLA_BREACH", "CASCADE_RISK",
    "UNIT_UNRESPONSIVE", "AI_DEGRADED",
]
AlertType = Literal[
    "NEW_CRITICAL", "SEVERITY_ESCALATED", "EVIDENCE_CONFLICT",
    "DUPLICATE_SUSPECTED", "COVERAGE_HOLE", "RESOURCE_SHORTAGE",
    "REALLOCATION_PROPOSED", "SLA_BREACH", "CASCADE_RISK",
    "UNIT_UNRESPONSIVE", "AI_DEGRADED",
]

# ─── Evidence Attributes (CLOSED registry) ──────────────────────────────────
# The AI may ONLY emit attributes from this list. (F15)
EVIDENCE_ATTRIBUTE = [
    "people_trapped", "casualties_reported", "fatalities_reported",
    "fire_active", "smoke_heavy", "structural_damage", "chemical_hazard",
    "gas_leak", "water_depth_high", "road_blocked", "power_down",
    "crowd_large", "spread_risk_high", "access_restricted",
]
EvidenceAttribute = Literal[
    "people_trapped", "casualties_reported", "fatalities_reported",
    "fire_active", "smoke_heavy", "structural_damage", "chemical_hazard",
    "gas_leak", "water_depth_high", "road_blocked", "power_down",
    "crowd_large", "spread_risk_high", "access_restricted",
]

# ─── Entity Types ────────────────────────────────────────────────────────────
ENTITY_TYPE = ["LANDMARK", "ROAD", "BUILDING", "VEHICLE", "ORGANISATION", "AREA"]
EntityType = Literal["LANDMARK", "ROAD", "BUILDING", "VEHICLE", "ORGANISATION", "AREA"]

# ─── ETA Methods ─────────────────────────────────────────────────────────────
ETA_METHOD = ["ROAD_GRAPH", "HAVERSINE_FALLBACK"]
EtaMethod = Literal["ROAD_GRAPH", "HAVERSINE_FALLBACK"]

# ─── Correlation Decision Bands ──────────────────────────────────────────────
CORRELATION_BAND = ["DUPLICATE", "LIKELY_SAME", "RELATED", "INDEPENDENT"]
CorrelationBand = Literal["DUPLICATE", "LIKELY_SAME", "RELATED", "INDEPENDENT"]

# ─── Cascade Effect Types ────────────────────────────────────────────────────
CASCADE_EFFECT_TYPE = ["ROAD_BLOCK", "ACCESS_DEGRADED", "DERIVED_INCIDENT", "DEMAND_SPIKE"]
CascadeEffectType = Literal["ROAD_BLOCK", "ACCESS_DEGRADED", "DERIVED_INCIDENT", "DEMAND_SPIKE"]

# ─── Confidence Semantics (F15, §13.6) ──────────────────────────────────────
# extraction_confidence: "how sure the model is that the text *says* this"
# asserted_probability: "if the source is right, how likely is the attribute true"
# source_reliability: calibrated prior on the channel
# These are three different numbers and must never be conflated.

# ─── Numeric Range Conventions (F17) ────────────────────────────────────────
# severity_score: 0–100 int
# All confidences/beliefs/probabilities: 0–1 float, 3 decimal places
# Never mix.

# ─── Frozen Correlation Thresholds (from §21.3) ─────────────────────────────
CORRELATION_THRESHOLDS = {
    "DUPLICATE": 0.86,
    "LIKELY_SAME": 0.68,
    "RELATED": 0.45,
}

# ─── Frozen Correlation Feature Weights (from §21.2) ────────────────────────
CORRELATION_WEIGHTS = {
    "f_dist": 0.26,
    "f_time": 0.18,
    "f_sem": 0.24,
    "f_type": 0.12,
    "f_entity": 0.12,
    "f_indep": -0.08,
}

# ─── Type Compatibility Matrix (from §21.2) ─────────────────────────────────
# identical = 1.0, same family = 0.7, cross-family = 0.0
TYPE_FAMILIES = {
    "FIRE": ["FIRE_STRUCTURE", "FIRE_INDUSTRIAL", "FIRE_VEHICLE"],
    "FLOOD": ["FLOOD", "WATERLOGGING"],
    "MEDICAL": ["MEDICAL_EMERGENCY", "RESCUE_TRAPPED"],
    "STRUCTURAL": ["BUILDING_COLLAPSE", "INFRASTRUCTURE_FAILURE"],
    "HAZMAT": ["GAS_LEAK", "CHEMICAL_SPILL"],
    "ROAD": ["ROAD_ACCIDENT"],
    "CROWD": ["CROWD_INCIDENT"],
    "ELECTRICAL": ["ELECTRICAL_HAZARD"],
}

# ─── Blocking Windows (from §21.1, tuning.ts) ───────────────────────────────
# { type_family: (radius_m, window_minutes) }
BLOCKING_WINDOWS = {
    "FIRE": (400, 45),
    "ROAD_ACCIDENT": (150, 20),
    "MEDICAL_EMERGENCY": (120, 15),
    "FLOOD": (1500, 180),
    "GAS_LEAK": (600, 60),
    "BUILDING_COLLAPSE": (250, 120),
    # Defaults for types not listed above
    "DEFAULT": (300, 30),
}
