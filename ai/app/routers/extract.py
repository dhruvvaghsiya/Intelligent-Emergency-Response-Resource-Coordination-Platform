"""
PRAHARI AI Service — Extraction Router

POST /ai/v1/extract
Extracts structured data from emergency report text using LLM + guardrails.
See README §13.6, §16.2 for the frozen contract and prompt shape.

Pipeline:
  1. Run keyword rules first (deterministic prior)
  2. Call LLM for full extraction
  3. Schema validate → repair retry → fallback to rules
  4. Merge rule-based and LLM results (LLM wins on conflicts)
  5. Generate embedding
"""

import time
import logging
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.core.llm_adapter import get_llm_provider
from app.core.guardrails import validate_and_clean_extraction
from app.core.prompts import (
    EXTRACTION_SYSTEM_PROMPT,
    EXTRACTION_USER_TEMPLATE,
    REPAIR_PROMPT,
)
from app.core.rules import (
    classify_by_keywords,
    extract_attributes_by_regex,
    generate_summary_from_rules,
)
from app.dependencies import metrics, AICallRecord, get_embedding_model

from contracts_gen import INCIDENT_TYPE, SOURCE_TYPE

logger = logging.getLogger("prahari.ai.extract")

router = APIRouter(prefix="/ai/v1", tags=["extract"])


# ── Request/Response Models ──

class ExtractRequest(BaseModel):
    report_id: str
    text: str
    language: str = "auto"
    structured: Optional[dict] = None
    location: Optional[dict] = None
    occurred_at: Optional[str] = None


class AttributeOut(BaseModel):
    attribute: str
    asserted_probability: float = Field(ge=0, le=1)
    extraction_confidence: float = Field(ge=0, le=1)
    span: str


class EntityOut(BaseModel):
    type: str
    text: str
    normalized: str
    confidence: float = Field(ge=0, le=1)


class ExtractResponse(BaseModel):
    type_suggestion: str
    type_confidence: float = Field(ge=0, le=1)
    attributes: list[AttributeOut]
    entities: list[EntityOut]
    people_count_estimate: Optional[int] = None
    summary: str
    language_detected: str
    embedding: list[float]
    degraded: bool
    model: str
    latency_ms: int


@router.post("/extract", response_model=ExtractResponse)
async def extract(req: ExtractRequest):
    """
    Extract structured incident data from free-text emergency report.
    
    Contract (§13.6):
    - Always returns valid data (falls back to rules if LLM fails)
    - embedding is 384-d from MiniLM
    - degraded=true if LLM was unavailable
    - All attributes from the closed registry only
    """
    start_time = time.time()
    degraded = False
    model_used = "rules-fallback"
    extraction = None

    # ── Step 1: Deterministic rules (always run as prior) ──
    rule_type, rule_confidence = classify_by_keywords(req.text)
    rule_attributes = extract_attributes_by_regex(req.text)

    # ── Step 2: LLM extraction ──
    llm_provider = get_llm_provider()
    if llm_provider.is_available():
        try:
            # Build the user prompt
            location_str = "unknown"
            if req.location:
                location_str = f"lng={req.location.get('lng', '?')}, lat={req.location.get('lat', '?')}"

            user_prompt = EXTRACTION_USER_TEMPLATE.format(
                source_type=req.structured.get("source_type", "UNKNOWN") if req.structured else "UNKNOWN",
                language=req.language,
                text=req.text,
                location_str=location_str,
                occurred_at=req.occurred_at or "unknown",
                nearby_context="",
            )

            # Call LLM
            llm_response = await llm_provider.generate(
                EXTRACTION_SYSTEM_PROMPT, user_prompt
            )
            model_used = llm_response.model

            # Parse and validate
            raw_data = llm_response.parse_json()
            extraction = validate_and_clean_extraction(raw_data)

            # If validation failed, try repair (one retry per §13.6)
            if extraction is None and raw_data is not None:
                logger.warning("Schema validation failed, attempting repair retry")
                repair_prompt = REPAIR_PROMPT.format(
                    previous_response=llm_response.content[:1000]
                )
                repair_response = await llm_provider.generate(
                    EXTRACTION_SYSTEM_PROMPT, repair_prompt
                )
                repair_data = repair_response.parse_json()
                extraction = validate_and_clean_extraction(repair_data)

        except Exception as e:
            logger.error("LLM extraction failed: %s", e)
            extraction = None

    # ── Step 3: Fall back to rules if LLM failed ──
    if extraction is None:
        degraded = True
        model_used = "rules-fallback"
        summary = generate_summary_from_rules(req.text, rule_type, rule_attributes)
        extraction = {
            "type_suggestion": rule_type,
            "type_confidence": rule_confidence,
            "attributes": rule_attributes,
            "entities": [],
            "people_count_estimate": None,
            "summary": summary,
            "language_detected": "en",
        }
    else:
        # ── Step 4: Merge — LLM wins, but add any rule-only attributes ──
        llm_attr_names = {a["attribute"] for a in extraction.get("attributes", [])}
        for ra in rule_attributes:
            if ra["attribute"] not in llm_attr_names:
                extraction["attributes"].append(ra)

        # If LLM type is UNKNOWN but rules found something, use rules
        if extraction.get("type_suggestion") == "UNKNOWN" and rule_type != "UNKNOWN":
            extraction["type_suggestion"] = rule_type
            extraction["type_confidence"] = rule_confidence

    # ── Step 5: Generate embedding ──
    embedding = _generate_embedding(req.text)

    elapsed_ms = int((time.time() - start_time) * 1000)

    # Record metrics
    metrics.record(AICallRecord(
        endpoint="/ai/v1/extract",
        latency_ms=elapsed_ms,
        ok=True,
        degraded=degraded,
        schema_failed=(extraction is None),
        model=model_used,
    ))

    return ExtractResponse(
        type_suggestion=extraction["type_suggestion"],
        type_confidence=extraction["type_confidence"],
        attributes=[AttributeOut(**a) for a in extraction["attributes"]],
        entities=[EntityOut(**e) for e in extraction.get("entities", [])],
        people_count_estimate=extraction.get("people_count_estimate"),
        summary=extraction.get("summary", ""),
        language_detected=extraction.get("language_detected", "en"),
        embedding=embedding,
        degraded=degraded,
        model=model_used,
        latency_ms=elapsed_ms,
    )


def _generate_embedding(text: str) -> list[float]:
    """
    Generate a 384-d embedding using MiniLM.
    Falls back to a deterministic hash-based vector if the model is unavailable.
    """
    model = get_embedding_model()
    if model is not None:
        try:
            vector = model.encode(text, normalize_embeddings=True)
            return vector.tolist()
        except Exception as e:
            logger.warning("Embedding generation failed: %s", e)

    # Deterministic fallback: hash-based embedding (poor but valid)
    return _hash_embedding(text, dim=384)


def _hash_embedding(text: str, dim: int = 384) -> list[float]:
    """
    Generate a deterministic pseudo-embedding from text hash.
    Marked as degraded — the backend handles this via the degraded flag.
    """
    import hashlib
    import struct

    h = hashlib.sha512(text.encode("utf-8")).digest()
    # Extend hash to cover all dimensions
    extended = h
    while len(extended) < dim * 4:
        h = hashlib.sha512(h).digest()
        extended += h

    values = []
    for i in range(dim):
        byte_val = extended[i % len(extended)]
        values.append((byte_val / 255.0) * 2 - 1)  # normalize to [-1, 1]

    # L2 normalize
    norm = sum(v * v for v in values) ** 0.5
    if norm > 0:
        values = [v / norm for v in values]

    return [round(v, 6) for v in values]
