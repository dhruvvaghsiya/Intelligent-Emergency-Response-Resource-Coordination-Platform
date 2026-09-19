"""
PRAHARI AI Service — Correlation Scorer Tests

Tests for the 6-feature weighted scoring model.
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.routers.correlate import (
    _type_compatibility,
    _entity_jaccard,
    _source_independence,
    _classify_band,
)


class TestTypeCompatibility:
    """Tests for the type compatibility matrix."""

    def test_identical_types(self):
        assert _type_compatibility("FIRE_STRUCTURE", "FIRE_STRUCTURE") == 1.0

    def test_same_family(self):
        assert _type_compatibility("FIRE_STRUCTURE", "FIRE_INDUSTRIAL") == 0.7

    def test_cross_family(self):
        assert _type_compatibility("FIRE_STRUCTURE", "FLOOD") == 0.0

    def test_flood_waterlogging_same_family(self):
        assert _type_compatibility("FLOOD", "WATERLOGGING") == 0.7

    def test_unknown_types(self):
        assert _type_compatibility("UNKNOWN", "FIRE_STRUCTURE") == 0.0


class TestEntityJaccard:
    """Tests for entity overlap scoring."""

    def test_identical_entities(self):
        entities_a = [{"normalized": "Sabarmati", "type": "LANDMARK"}]
        entities_b = [{"normalized": "Sabarmati", "type": "LANDMARK"}]
        score = _entity_jaccard(entities_a, entities_b)
        assert score > 0.5

    def test_no_overlap(self):
        entities_a = [{"normalized": "Maninagar", "type": "AREA"}]
        entities_b = [{"normalized": "Bopal", "type": "AREA"}]
        score = _entity_jaccard(entities_a, entities_b)
        assert score == 0.0

    def test_empty_entities(self):
        assert _entity_jaccard([], []) == 0.0

    def test_partial_overlap(self):
        entities_a = [
            {"normalized": "Sabarmati", "type": "LANDMARK"},
            {"normalized": "Ashram Road", "type": "ROAD"},
        ]
        entities_b = [
            {"normalized": "Sabarmati", "type": "LANDMARK"},
            {"normalized": "CG Road", "type": "ROAD"},
        ]
        score = _entity_jaccard(entities_a, entities_b)
        assert 0.0 < score < 1.0


class TestSourceIndependence:
    """Tests for source independence scoring."""

    def test_same_source(self):
        score = _source_independence("CITIZEN_APP", "CITIZEN_APP")
        assert score > 0.5

    def test_different_group(self):
        score = _source_independence("CITIZEN_APP", "IOT_SENSOR")
        assert score < 0.5

    def test_same_group_different_source(self):
        score = _source_independence("CITIZEN_APP", "CITIZEN_SMS")
        assert 0.3 <= score <= 0.6


class TestDecisionBands:
    """Tests for score → band classification."""

    def test_duplicate_band(self):
        assert _classify_band(0.90) == "DUPLICATE"

    def test_likely_same_band(self):
        assert _classify_band(0.75) == "LIKELY_SAME"

    def test_related_band(self):
        assert _classify_band(0.50) == "RELATED"

    def test_independent_band(self):
        assert _classify_band(0.30) == "INDEPENDENT"

    def test_boundary_duplicate(self):
        assert _classify_band(0.86) == "DUPLICATE"

    def test_boundary_related(self):
        assert _classify_band(0.45) == "RELATED"
