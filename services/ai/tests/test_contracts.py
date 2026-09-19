"""
PRAHARI AI Service — Contract Tests

Ensures that the Python contracts_gen.py stays in sync with the 
frozen TypeScript enums from packages/contracts.
"""

import sys
import os

# Add parent to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from contracts_gen import (
    INCIDENT_TYPE, INCIDENT_STATUS, SEVERITY, SOURCE_TYPE,
    UNIT_TYPE, CAPABILITY, UNIT_STATUS, ASSIGNMENT_STATUS,
    RELATION_TYPE, ROLE, ALERT_TYPE, EVIDENCE_ATTRIBUTE,
    ENTITY_TYPE, ETA_METHOD, CORRELATION_BAND, CASCADE_EFFECT_TYPE,
    CORRELATION_THRESHOLDS, CORRELATION_WEIGHTS, TYPE_FAMILIES,
    BLOCKING_WINDOWS,
)


class TestContractEnums:
    """Verify frozen enums are complete and have expected values."""

    def test_incident_types_count(self):
        assert len(INCIDENT_TYPE) == 16
        assert "FIRE_STRUCTURE" in INCIDENT_TYPE
        assert "UNKNOWN" in INCIDENT_TYPE

    def test_incident_types_frozen(self):
        expected = [
            "FIRE_STRUCTURE", "FIRE_INDUSTRIAL", "FIRE_VEHICLE", "FLOOD", "WATERLOGGING",
            "ROAD_ACCIDENT", "MEDICAL_EMERGENCY", "BUILDING_COLLAPSE", "GAS_LEAK",
            "CHEMICAL_SPILL", "ELECTRICAL_HAZARD", "CROWD_INCIDENT", "RESCUE_TRAPPED",
            "INFRASTRUCTURE_FAILURE", "DERIVED_RISK", "UNKNOWN",
        ]
        assert INCIDENT_TYPE == expected

    def test_severity_levels(self):
        assert SEVERITY == ["CRITICAL", "HIGH", "MODERATE", "LOW", "INFO"]

    def test_source_types_count(self):
        assert len(SOURCE_TYPE) == 11
        assert "EMERGENCY_CALL" in SOURCE_TYPE
        assert "SOCIAL_MEDIA" in SOURCE_TYPE

    def test_evidence_attributes_closed(self):
        assert len(EVIDENCE_ATTRIBUTE) == 14
        assert "people_trapped" in EVIDENCE_ATTRIBUTE
        assert "fire_active" in EVIDENCE_ATTRIBUTE
        # Ensure no non-registry attributes snuck in
        for attr in EVIDENCE_ATTRIBUTE:
            assert attr.islower(), f"Attribute '{attr}' must be lowercase"

    def test_entity_types(self):
        assert len(ENTITY_TYPE) == 6
        assert "LANDMARK" in ENTITY_TYPE
        assert "ROAD" in ENTITY_TYPE

    def test_correlation_thresholds_frozen(self):
        assert CORRELATION_THRESHOLDS["DUPLICATE"] == 0.86
        assert CORRELATION_THRESHOLDS["LIKELY_SAME"] == 0.68
        assert CORRELATION_THRESHOLDS["RELATED"] == 0.45

    def test_correlation_weights_sum_to_one(self):
        """Feature weights should roughly balance (allow for negative f_indep)."""
        total = sum(abs(v) for v in CORRELATION_WEIGHTS.values())
        assert 0.95 <= total <= 1.05, f"Weights sum to {total}, expected ~1.0"

    def test_correlation_weights_frozen(self):
        assert CORRELATION_WEIGHTS["f_dist"] == 0.26
        assert CORRELATION_WEIGHTS["f_time"] == 0.18
        assert CORRELATION_WEIGHTS["f_sem"] == 0.24
        assert CORRELATION_WEIGHTS["f_type"] == 0.12
        assert CORRELATION_WEIGHTS["f_entity"] == 0.12
        assert CORRELATION_WEIGHTS["f_indep"] == -0.08

    def test_type_families_cover_all_fire_types(self):
        fire_types = TYPE_FAMILIES["FIRE"]
        assert "FIRE_STRUCTURE" in fire_types
        assert "FIRE_INDUSTRIAL" in fire_types
        assert "FIRE_VEHICLE" in fire_types

    def test_blocking_windows_have_default(self):
        assert "DEFAULT" in BLOCKING_WINDOWS

    def test_correlation_bands(self):
        assert CORRELATION_BAND == ["DUPLICATE", "LIKELY_SAME", "RELATED", "INDEPENDENT"]

    def test_cascade_effect_types(self):
        assert CASCADE_EFFECT_TYPE == ["ROAD_BLOCK", "ACCESS_DEGRADED", "DERIVED_INCIDENT", "DEMAND_SPIKE"]

    def test_unit_types_count(self):
        assert len(UNIT_TYPE) == 11

    def test_roles(self):
        assert "ADMIN" in ROLE
        assert "DISPATCHER" in ROLE

    def test_assignment_statuses(self):
        assert "PROPOSED" in ASSIGNMENT_STATUS
        assert "PREEMPTED" in ASSIGNMENT_STATUS

    def test_relation_types(self):
        assert "DUPLICATE_OF" in RELATION_TYPE
        assert "CAUSED_BY" in RELATION_TYPE
