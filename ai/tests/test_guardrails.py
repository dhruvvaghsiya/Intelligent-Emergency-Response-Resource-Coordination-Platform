"""
PRAHARI AI Service — Guardrails Tests

Tests for the guardrails layer: schema validation, vocabulary enforcement,
probability clamping, and sanitization.
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.guardrails import validate_and_clean_extraction, validate_briefing


class TestExtractionGuardrails:
    """Tests for extraction validation and cleaning."""

    def test_valid_extraction(self):
        data = {
            "type_suggestion": "FIRE_STRUCTURE",
            "type_confidence": 0.8,
            "attributes": [
                {"attribute": "fire_active", "asserted_probability": 0.85,
                 "extraction_confidence": 0.9, "span": "fire in building"},
            ],
            "entities": [
                {"type": "LANDMARK", "text": "sabarmati", "normalized": "Sabarmati",
                 "confidence": 0.9},
            ],
            "people_count_estimate": 5,
            "summary": "Structure fire reported near Sabarmati",
            "language_detected": "en",
        }
        result = validate_and_clean_extraction(data)
        assert result is not None
        assert result["type_suggestion"] == "FIRE_STRUCTURE"
        assert len(result["attributes"]) == 1
        assert len(result["entities"]) == 1

    def test_none_input(self):
        assert validate_and_clean_extraction(None) is None

    def test_empty_dict(self):
        result = validate_and_clean_extraction({})
        assert result is not None
        assert result["type_suggestion"] == "UNKNOWN"

    def test_unknown_type_defaults(self):
        data = {"type_suggestion": "EARTHQUAKE", "type_confidence": 0.9}
        result = validate_and_clean_extraction(data)
        assert result["type_suggestion"] == "UNKNOWN"

    def test_probability_clamping_high(self):
        data = {
            "type_suggestion": "FLOOD",
            "type_confidence": 1.0,
            "attributes": [],
        }
        result = validate_and_clean_extraction(data)
        assert result["type_confidence"] == 0.95

    def test_probability_clamping_low(self):
        data = {
            "type_suggestion": "FLOOD",
            "type_confidence": 0.0,
        }
        result = validate_and_clean_extraction(data)
        assert result["type_confidence"] == 0.05

    def test_unknown_attributes_dropped(self):
        data = {
            "type_suggestion": "FIRE_STRUCTURE",
            "type_confidence": 0.7,
            "attributes": [
                {"attribute": "fire_active", "asserted_probability": 0.7,
                 "extraction_confidence": 0.7, "span": "fire"},
                {"attribute": "FAKE_ATTRIBUTE", "asserted_probability": 0.9,
                 "extraction_confidence": 0.9, "span": "fake"},
            ],
        }
        result = validate_and_clean_extraction(data)
        assert len(result["attributes"]) == 1
        assert result["attributes"][0]["attribute"] == "fire_active"

    def test_unknown_entity_types_dropped(self):
        data = {
            "type_suggestion": "FLOOD",
            "type_confidence": 0.5,
            "entities": [
                {"type": "LANDMARK", "text": "river", "normalized": "River",
                 "confidence": 0.8},
                {"type": "SPACESHIP", "text": "ufo", "normalized": "UFO",
                 "confidence": 0.99},
            ],
        }
        result = validate_and_clean_extraction(data)
        assert len(result["entities"]) == 1

    def test_html_escaping(self):
        data = {
            "type_suggestion": "FIRE_STRUCTURE",
            "type_confidence": 0.7,
            "summary": '<script>alert("xss")</script>Fire reported',
        }
        result = validate_and_clean_extraction(data)
        assert "<script>" not in result["summary"]
        assert "&lt;script&gt;" in result["summary"]

    def test_summary_truncation(self):
        data = {
            "type_suggestion": "FIRE_STRUCTURE",
            "type_confidence": 0.7,
            "summary": "A" * 500,
        }
        result = validate_and_clean_extraction(data)
        assert len(result["summary"]) <= 140

    def test_people_count_bounds(self):
        data = {
            "type_suggestion": "FIRE_STRUCTURE",
            "type_confidence": 0.7,
            "people_count_estimate": -5,
        }
        result = validate_and_clean_extraction(data)
        assert result["people_count_estimate"] is None

    def test_people_count_too_high(self):
        data = {
            "type_suggestion": "FLOOD",
            "type_confidence": 0.5,
            "people_count_estimate": 999999,
        }
        result = validate_and_clean_extraction(data)
        assert result["people_count_estimate"] is None


class TestBriefingGuardrails:
    """Tests for briefing validation."""

    def test_valid_briefing(self):
        data = {
            "briefing": "Structure fire at Sabarmati area. 3 units responding.",
            "bullet_points": ["Active fire on 3rd floor", "2 people evacuated"],
        }
        result = validate_briefing(data)
        assert result is not None
        assert len(result["briefing"]) > 0
        assert len(result["bullet_points"]) == 2

    def test_none_briefing(self):
        assert validate_briefing(None) is None

    def test_briefing_truncation(self):
        data = {
            "briefing": "B" * 1000,
            "bullet_points": [],
        }
        result = validate_briefing(data)
        assert len(result["briefing"]) <= 400

    def test_bullet_points_max_5(self):
        data = {
            "briefing": "Test",
            "bullet_points": ["a", "b", "c", "d", "e", "f", "g"],
        }
        result = validate_briefing(data)
        assert len(result["bullet_points"]) <= 5
