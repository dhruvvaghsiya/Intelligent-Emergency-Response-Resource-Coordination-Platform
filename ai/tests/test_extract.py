"""
PRAHARI AI Service — Extract Tests

Tests for the extraction pipeline, including rule-based classification
and attribute extraction.
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.rules import classify_by_keywords, extract_attributes_by_regex, generate_summary_from_rules


class TestKeywordClassification:
    """Tests for keyword-based incident type classification."""

    def test_fire_structure(self):
        text = "Fire in building on 3rd floor, smoke visible"
        t, c = classify_by_keywords(text)
        assert t == "FIRE_STRUCTURE"
        assert c >= 0.5

    def test_fire_industrial(self):
        text = "Fire at chemical factory in industrial area"
        t, c = classify_by_keywords(text)
        assert t == "FIRE_INDUSTRIAL"
        assert c >= 0.5

    def test_flood(self):
        text = "Severe flooding in residential area, water entering homes"
        t, c = classify_by_keywords(text)
        assert t == "FLOOD"
        assert c >= 0.5

    def test_road_accident(self):
        text = "Major accident on highway, 3 vehicles crashed"
        t, c = classify_by_keywords(text)
        assert t == "ROAD_ACCIDENT"
        assert c >= 0.5

    def test_building_collapse(self):
        text = "Building collapsed in old city, people trapped under rubble"
        t, c = classify_by_keywords(text)
        assert t == "BUILDING_COLLAPSE"
        assert c >= 0.5

    def test_gas_leak(self):
        text = "Strong gas leak smell in residential colony"
        t, c = classify_by_keywords(text)
        assert t == "GAS_LEAK"
        assert c >= 0.5

    def test_unknown(self):
        text = "The weather today is pleasant and sunny"
        t, c = classify_by_keywords(text)
        assert t == "UNKNOWN"
        assert c <= 0.3

    def test_hindi(self):
        text = "Aag lagi hai building mein, bahut dhuan aa raha hai"
        t, c = classify_by_keywords(text)
        assert t != "UNKNOWN"
        assert c >= 0.3

    def test_stampede(self):
        text = "Stampede at religious event, people injured"
        t, c = classify_by_keywords(text)
        assert t == "CROWD_INCIDENT"


class TestAttributeExtraction:
    """Tests for regex-based attribute extraction."""

    def test_fire_attributes(self):
        text = "Building on fire, heavy smoke, flames spreading rapidly"
        attrs = extract_attributes_by_regex(text)
        attr_names = {a["attribute"] for a in attrs}
        assert "fire_active" in attr_names
        assert "smoke_heavy" in attr_names or "spread_risk_high" in attr_names

    def test_people_trapped(self):
        text = "People trapped inside the collapsed building, rescue needed"
        attrs = extract_attributes_by_regex(text)
        attr_names = {a["attribute"] for a in attrs}
        assert "people_trapped" in attr_names

    def test_casualties(self):
        text = "5 people injured in the accident, bleeding heavily"
        attrs = extract_attributes_by_regex(text)
        attr_names = {a["attribute"] for a in attrs}
        assert "casualties_reported" in attr_names

    def test_no_false_attributes(self):
        text = "The weather is nice today"
        attrs = extract_attributes_by_regex(text)
        assert len(attrs) == 0

    def test_all_attributes_in_registry(self):
        """All extracted attributes must be from the closed registry."""
        from contracts_gen import EVIDENCE_ATTRIBUTE
        text = "Fire active, people trapped, gas leak, heavy smoke, road blocked, power outage"
        attrs = extract_attributes_by_regex(text)
        for a in attrs:
            assert a["attribute"] in EVIDENCE_ATTRIBUTE, f"'{a['attribute']}' not in registry"

    def test_probability_bounds(self):
        text = "Massive fire spreading rapidly"
        attrs = extract_attributes_by_regex(text)
        for a in attrs:
            assert 0.0 <= a["asserted_probability"] <= 1.0
            assert 0.0 <= a["extraction_confidence"] <= 1.0


class TestSummaryGeneration:
    """Tests for rule-based summary generation."""

    def test_summary_length(self):
        text = "Fire in building, multiple people trapped, heavy smoke"
        attrs = extract_attributes_by_regex(text)
        summary = generate_summary_from_rules(text, "FIRE_STRUCTURE", attrs)
        assert len(summary) <= 140

    def test_summary_not_empty(self):
        summary = generate_summary_from_rules("test", "UNKNOWN", [])
        assert len(summary) > 0
