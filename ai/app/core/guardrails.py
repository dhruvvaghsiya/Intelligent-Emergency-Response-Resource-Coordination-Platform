"""
PRAHARI AI Service — Guardrails

Post-processing layer between raw LLM output and the API response.
See README §13.6 and §16.2 for guardrail specifications.

Responsibilities:
  1. JSON Schema validation of LLM responses
  2. Closed vocabulary enforcement (drop unknown attributes, count them)
  3. Probability clamping to [0.05, 0.95]
  4. HTML escaping of all text fields
  5. Span length capping
  6. Retry with repair prompt on schema failure
"""

import html
import logging
from typing import Optional

from contracts_gen import (
    INCIDENT_TYPE,
    EVIDENCE_ATTRIBUTE,
    ENTITY_TYPE,
)

logger = logging.getLogger("prahari.ai.guardrails")

# Counters for monitoring
_dropped_attributes_count = 0
_schema_failure_count = 0
_total_validations = 0


def get_guardrail_stats() -> dict:
    """Return guardrail metrics for the health endpoint."""
    return {
        "dropped_attributes": _dropped_attributes_count,
        "schema_failures": _schema_failure_count,
        "total_validations": _total_validations,
    }


def validate_and_clean_extraction(data: Optional[dict]) -> Optional[dict]:
    """
    Validate and sanitize an extraction result from the LLM.
    Returns cleaned data or None if the data is fundamentally invalid.
    
    Post-processing (§16.2):
    - schema validate
    - drop unknown attributes (counted in metrics)
    - clamp probabilities to [0.05, 0.95]
    - strip HTML
    - cap span lengths
    """
    global _dropped_attributes_count, _schema_failure_count, _total_validations
    _total_validations += 1

    if data is None or not isinstance(data, dict):
        _schema_failure_count += 1
        return None

    cleaned = {}

    # ── type_suggestion ──
    type_sugg = data.get("type_suggestion", "UNKNOWN")
    if type_sugg not in INCIDENT_TYPE:
        logger.warning("Unknown type_suggestion '%s', defaulting to UNKNOWN", type_sugg)
        type_sugg = "UNKNOWN"
    cleaned["type_suggestion"] = type_sugg

    # ── type_confidence ──
    cleaned["type_confidence"] = _clamp_probability(
        data.get("type_confidence", 0.5)
    )

    # ── attributes (closed registry enforcement) ──
    raw_attrs = data.get("attributes", [])
    clean_attrs = []
    for attr in raw_attrs:
        if not isinstance(attr, dict):
            continue
        attr_name = attr.get("attribute", "")
        if attr_name not in EVIDENCE_ATTRIBUTE:
            _dropped_attributes_count += 1
            logger.info("Dropped non-registry attribute: '%s'", attr_name)
            continue

        clean_attrs.append({
            "attribute": attr_name,
            "asserted_probability": _clamp_probability(
                attr.get("asserted_probability", 0.5)
            ),
            "extraction_confidence": _clamp_probability(
                attr.get("extraction_confidence", 0.5)
            ),
            "span": _sanitize_text(
                attr.get("span", ""), max_length=200
            ),
        })
    cleaned["attributes"] = clean_attrs

    # ── entities ──
    raw_entities = data.get("entities", [])
    clean_entities = []
    for ent in raw_entities:
        if not isinstance(ent, dict):
            continue
        ent_type = ent.get("type", "")
        if ent_type not in ENTITY_TYPE:
            logger.info("Dropped non-registry entity type: '%s'", ent_type)
            continue
        clean_entities.append({
            "type": ent_type,
            "text": _sanitize_text(ent.get("text", ""), max_length=100),
            "normalized": _sanitize_text(ent.get("normalized", ""), max_length=100),
            "confidence": _clamp_probability(ent.get("confidence", 0.5)),
        })
    cleaned["entities"] = clean_entities

    # ── people_count_estimate ──
    pce = data.get("people_count_estimate")
    if pce is not None:
        try:
            pce = int(pce)
            if pce < 0 or pce > 10000:
                pce = None
        except (TypeError, ValueError):
            pce = None
    cleaned["people_count_estimate"] = pce

    # ── summary ──
    summary = data.get("summary", "")
    cleaned["summary"] = _sanitize_text(summary, max_length=140)

    # ── language_detected ──
    lang = data.get("language_detected", "en")
    if lang not in ("en", "hi", "gu", "hinglish"):
        lang = "en"
    cleaned["language_detected"] = lang

    return cleaned


def validate_briefing(data: Optional[dict]) -> Optional[dict]:
    """Validate and sanitize a briefing result from the LLM."""
    global _total_validations, _schema_failure_count
    _total_validations += 1

    if data is None or not isinstance(data, dict):
        _schema_failure_count += 1
        return None

    cleaned = {}
    cleaned["briefing"] = _sanitize_text(
        data.get("briefing", ""), max_length=400
    )
    
    bullets = data.get("bullet_points", [])
    if isinstance(bullets, list):
        cleaned["bullet_points"] = [
            _sanitize_text(str(b), max_length=200) for b in bullets[:5]
        ]
    else:
        cleaned["bullet_points"] = []

    return cleaned


def _clamp_probability(value, min_val: float = 0.05, max_val: float = 0.95) -> float:
    """
    Clamp probability to [0.05, 0.95].
    An LLM is NEVER allowed to assert certainty (§16.2).
    """
    try:
        v = float(value)
    except (TypeError, ValueError):
        return 0.5
    return round(max(min_val, min(max_val, v)), 3)


def _sanitize_text(text: str, max_length: int = 500) -> str:
    """
    Sanitize text output from the LLM.
    - HTML escape (prevents XSS when rendered in the frontend)
    - Truncate to max_length
    - Strip whitespace
    """
    if not isinstance(text, str):
        text = str(text) if text is not None else ""
    text = html.escape(text.strip())
    if len(text) > max_length:
        text = text[:max_length]
    return text
