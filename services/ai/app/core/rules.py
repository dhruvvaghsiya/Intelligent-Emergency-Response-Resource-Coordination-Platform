"""
PRAHARI AI Service — Deterministic Rule Engine

Keyword-based incident type classification and regex-based attribute extraction.
This is the deterministic fallback when LLM/classifier is unavailable (§16.4).
Also serves as the "prior" that runs first before the LLM.
"""

import os
import re
import logging
from typing import Optional

import yaml

from contracts_gen import (
    INCIDENT_TYPE,
    EVIDENCE_ATTRIBUTE,
    IncidentType,
    EvidenceAttribute,
)

logger = logging.getLogger("prahari.ai.rules")

# ── Load configs ──
_CONFIG_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "config")


def _load_yaml(filename: str) -> dict:
    path = os.path.join(_CONFIG_DIR, filename)
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


_type_keywords: Optional[dict] = None
_source_priors: Optional[dict] = None
_cascade_rules: Optional[dict] = None


def get_type_keywords() -> dict:
    global _type_keywords
    if _type_keywords is None:
        data = _load_yaml("type_keywords.yaml")
        _type_keywords = data.get("type_keywords", {})
    return _type_keywords


def get_attribute_patterns() -> dict:
    data = _load_yaml("type_keywords.yaml")
    return data.get("attribute_patterns", {})


def get_source_priors() -> dict:
    global _source_priors
    if _source_priors is None:
        data = _load_yaml("source_priors.yaml")
        _source_priors = data.get("source_priors", {})
    return _source_priors


def get_decay_tau() -> dict:
    data = _load_yaml("source_priors.yaml")
    return data.get("decay_tau", {})


def get_conflict_theta() -> float:
    data = _load_yaml("source_priors.yaml")
    return data.get("conflict_theta", 0.8)


def get_cascade_rules() -> list:
    global _cascade_rules
    if _cascade_rules is None:
        data = _load_yaml("cascade_rules.yaml")
        _cascade_rules = data.get("cascade_rules", [])
    return _cascade_rules


def classify_by_keywords(text: str) -> tuple[IncidentType, float]:
    """
    Classify incident type using keyword matching.
    Returns (type, confidence). Falls back to UNKNOWN with 0.1 confidence.
    
    Strategy: 
    1. Multi-keyword group matches score highest (more specific)
    2. Single keyword matches score lower
    3. First type with a group match wins
    """
    text_lower = text.lower()
    keywords_config = get_type_keywords()

    best_type: IncidentType = "UNKNOWN"
    best_confidence: float = 0.1
    best_match_quality: int = 0  # number of keywords matched

    for type_name, config in keywords_config.items():
        if type_name not in INCIDENT_TYPE:
            continue

        base_conf = config.get("base_confidence", 0.5)

        # Check multi-keyword groups (higher confidence)
        for group in config.get("keywords", []):
            if all(kw.lower() in text_lower for kw in group):
                match_quality = len(group)
                # Boost confidence for more specific matches
                adjusted_conf = min(0.95, base_conf + 0.05 * (match_quality - 1))
                if match_quality > best_match_quality or (
                    match_quality == best_match_quality and adjusted_conf > best_confidence
                ):
                    best_type = type_name
                    best_confidence = adjusted_conf
                    best_match_quality = match_quality

        # Check single keywords (lower confidence) — only if no group match yet
        if best_match_quality == 0:
            for kw in config.get("single_keywords", []):
                if kw.lower() in text_lower:
                    adjusted_conf = base_conf * 0.7  # single keywords are weaker
                    if adjusted_conf > best_confidence:
                        best_type = type_name
                        best_confidence = adjusted_conf
                        best_match_quality = 0

    return best_type, round(best_confidence, 3)


def extract_attributes_by_regex(text: str) -> list[dict]:
    """
    Extract evidence attributes using regex patterns.
    Returns list of {attribute, asserted_probability, extraction_confidence, span}.
    
    Only emits attributes from the CLOSED registry (§13.1, F15).
    """
    patterns_config = get_attribute_patterns()
    results = []

    for attr_name, config in patterns_config.items():
        if attr_name not in EVIDENCE_ATTRIBUTE:
            logger.warning("Skipping non-registry attribute: %s", attr_name)
            continue

        for pattern_str in config.get("patterns", []):
            try:
                match = re.search(pattern_str, text)
                if match:
                    results.append({
                        "attribute": attr_name,
                        "asserted_probability": config.get("default_probability", 0.6),
                        "extraction_confidence": 0.55,  # regex extraction is moderate confidence
                        "span": match.group(0),
                    })
                    break  # one match per attribute is enough
            except re.error as e:
                logger.warning("Invalid regex pattern for %s: %s", attr_name, e)

    return results


def generate_summary_from_rules(
    text: str,
    incident_type: str,
    attributes: list[dict],
) -> str:
    """
    Generate a ≤140 char neutral summary from structured data.
    Used as the fallback when LLM briefing is unavailable.
    """
    type_labels = {
        "FIRE_STRUCTURE": "Structure fire",
        "FIRE_INDUSTRIAL": "Industrial fire",
        "FIRE_VEHICLE": "Vehicle fire",
        "FLOOD": "Flooding",
        "WATERLOGGING": "Waterlogging",
        "ROAD_ACCIDENT": "Road accident",
        "MEDICAL_EMERGENCY": "Medical emergency",
        "BUILDING_COLLAPSE": "Building collapse",
        "GAS_LEAK": "Gas leak",
        "CHEMICAL_SPILL": "Chemical spill",
        "ELECTRICAL_HAZARD": "Electrical hazard",
        "CROWD_INCIDENT": "Crowd incident",
        "RESCUE_TRAPPED": "Rescue — trapped persons",
        "INFRASTRUCTURE_FAILURE": "Infrastructure failure",
        "DERIVED_RISK": "Derived risk",
        "UNKNOWN": "Incident",
    }

    label = type_labels.get(incident_type, "Incident")

    # Build attribute summary
    attr_parts = []
    for a in attributes[:3]:  # max 3 most important
        attr_name = a["attribute"].replace("_", " ")
        attr_parts.append(attr_name)

    if attr_parts:
        summary = f"{label} reported. Key factors: {', '.join(attr_parts)}."
    else:
        # Extract first meaningful fragment from text
        clean_text = text[:80].strip()
        if clean_text:
            summary = f"{label} reported: {clean_text}"
        else:
            summary = f"{label} reported. Details pending."

    return summary[:140]
