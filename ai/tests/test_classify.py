"""
PRAHARI AI Service — Classify Tests

Tests for the TF-IDF + LinearSVC classifier module.
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.classifier import train_classifier, _generate_bootstrap_data


class TestClassifier:
    """Tests for the incident type classifier."""

    def test_bootstrap_data_generation(self):
        data = _generate_bootstrap_data()
        assert len(data) > 100
        # Check all types are represented
        types = {d["type"] for d in data}
        assert "FIRE_STRUCTURE" in types
        assert "FLOOD" in types
        assert "ROAD_ACCIDENT" in types

    def test_bootstrap_data_has_all_types(self):
        data = _generate_bootstrap_data()
        types = {d["type"] for d in data}
        expected = {
            "FIRE_STRUCTURE", "FIRE_INDUSTRIAL", "FIRE_VEHICLE",
            "FLOOD", "WATERLOGGING", "ROAD_ACCIDENT",
            "MEDICAL_EMERGENCY", "BUILDING_COLLAPSE", "GAS_LEAK",
            "CHEMICAL_SPILL", "ELECTRICAL_HAZARD", "CROWD_INCIDENT",
            "RESCUE_TRAPPED", "INFRASTRUCTURE_FAILURE",
        }
        for t in expected:
            assert t in types, f"Missing type: {t}"

    def test_train_and_predict(self):
        classifier = train_classifier()
        assert classifier is not None

        # Test clear-cut case
        predicted_type, confidence, top_k = classifier.predict(
            "Fire in building, flames visible from windows"
        )
        assert predicted_type in [
            "FIRE_STRUCTURE", "FIRE_INDUSTRIAL", "FIRE_VEHICLE"
        ]
        assert confidence > 0.3
        assert len(top_k) > 0

    def test_predict_flood(self):
        classifier = train_classifier()
        predicted_type, confidence, top_k = classifier.predict(
            "Heavy flooding in residential area, water entering homes"
        )
        assert predicted_type in ["FLOOD", "WATERLOGGING"]
        assert confidence > 0.3

    def test_predict_returns_top_k(self):
        classifier = train_classifier()
        _, _, top_k = classifier.predict("Some emergency incident happened")
        assert len(top_k) >= 1
        # top_k should have type and confidence
        for item in top_k:
            assert "type" in item
            assert "confidence" in item
            assert 0.0 <= item["confidence"] <= 1.0
