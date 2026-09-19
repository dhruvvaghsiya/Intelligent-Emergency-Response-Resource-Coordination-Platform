"""
PRAHARI AI Service — Correlation Scorer Router

POST /ai/v1/correlate-score
Six-feature weighted scoring for duplicate/related incident detection.
See README §13.6, §21 for the frozen contract and scoring algorithm.

Features (§21.2):
  f_dist  — spatial proximity (exp decay)
  f_time  — temporal proximity (exp decay)
  f_sem   — semantic similarity (cosine embedding)
  f_type  — type compatibility matrix
  f_entity — Jaccard over extracted entities
  f_indep — source independence (corroboration vs duplicate)

Decision bands (§21.3):
  ≥0.86 DUPLICATE | 0.68–0.86 LIKELY_SAME | 0.45–0.68 RELATED | <0.45 INDEPENDENT
"""

import math
import time
import logging
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.core.embeddings import cosine_similarity
from app.dependencies import metrics, AICallRecord
from contracts_gen import (
    CORRELATION_THRESHOLDS,
    CORRELATION_WEIGHTS,
    TYPE_FAMILIES,
    BLOCKING_WINDOWS,
    CorrelationBand,
)

logger = logging.getLogger("prahari.ai.correlate")

router = APIRouter(prefix="/ai/v1", tags=["correlate"])


# ── Request/Response Models ──

class IncidentData(BaseModel):
    text: str = ""
    embedding: Optional[list[float]] = None
    type: str = "UNKNOWN"
    entities: list[dict] = []
    occurred_at: Optional[str] = None
    location: Optional[dict] = None
    source_type: str = "UNKNOWN"


class CandidatePair(BaseModel):
    pair_id: str
    a: IncidentData
    b: IncidentData
    precomputed: dict = {}  # { distance_m, time_delta_s }


class CorrelateRequest(BaseModel):
    candidate_pairs: list[CandidatePair]


class ScoreResult(BaseModel):
    pair_id: str
    score: float = Field(ge=0, le=1)
    features: dict
    contributions: dict
    band: str
    explanation: str


class CorrelateResponse(BaseModel):
    scores: list[ScoreResult]
    degraded: bool
    model: str
    latency_ms: int


@router.post("/correlate-score", response_model=CorrelateResponse)
async def correlate_score(req: CorrelateRequest):
    """
    Score candidate pairs for duplicate/related detection.
    
    Contract (§13.6):
      req  { candidate_pairs: [{ pair_id, a, b, precomputed }] }
      res  { scores: [{ pair_id, score, features, contributions, band, explanation }] }
    """
    start = time.time()
    degraded = False
    results = []

    for pair in req.candidate_pairs:
        try:
            score_result = _score_pair(pair)
            results.append(score_result)
        except Exception as e:
            logger.error("Failed to score pair %s: %s", pair.pair_id, e)
            results.append(ScoreResult(
                pair_id=pair.pair_id,
                score=0.0,
                features={"f_dist": 0, "f_time": 0, "f_sem": 0, "f_type": 0, "f_entity": 0, "f_indep": 0},
                contributions={"f_dist": 0, "f_time": 0, "f_sem": 0, "f_type": 0, "f_entity": 0, "f_indep": 0},
                band="INDEPENDENT",
                explanation="Scoring failed — treated as independent",
            ))
            degraded = True

    elapsed = int((time.time() - start) * 1000)

    metrics.record(AICallRecord(
        endpoint="/ai/v1/correlate-score",
        latency_ms=elapsed,
        ok=True,
        degraded=degraded,
        schema_failed=False,
        model="correlation-scorer-v1",
    ))

    return CorrelateResponse(
        scores=results,
        degraded=degraded,
        model="correlation-scorer-v1",
        latency_ms=elapsed,
    )


def _score_pair(pair: CandidatePair) -> ScoreResult:
    """Score a single candidate pair using the 6-feature model."""
    a = pair.a
    b = pair.b
    pre = pair.precomputed

    weights = CORRELATION_WEIGHTS.copy()
    has_sem = (a.embedding is not None and b.embedding is not None
               and len(a.embedding) > 0 and len(b.embedding) > 0)
    has_entity = len(a.entities) > 0 or len(b.entities) > 0

    # ── Feature 1: Distance (f_dist) ──
    distance_m = pre.get("distance_m", 10000)
    type_key = _get_type_family(a.type) or _get_type_family(b.type) or "DEFAULT"
    radius_m = BLOCKING_WINDOWS.get(type_key, BLOCKING_WINDOWS["DEFAULT"])[0]
    f_dist = math.exp(-distance_m / radius_m) if radius_m > 0 else 0.0

    # ── Feature 2: Time (f_time) ──
    time_delta_s = abs(pre.get("time_delta_s", 86400))
    window_min = BLOCKING_WINDOWS.get(type_key, BLOCKING_WINDOWS["DEFAULT"])[1]
    window_s = window_min * 60
    f_time = math.exp(-time_delta_s / window_s) if window_s > 0 else 0.0

    # ── Feature 3: Semantic similarity (f_sem) ──
    if has_sem:
        raw_cos = cosine_similarity(a.embedding, b.embedding)
        f_sem = max(0.0, (raw_cos + 1) / 2)  # map [-1,1] to [0,1], floor at 0
    else:
        f_sem = 0.0
        # Renormalize weights without f_sem
        weights = _renormalize_without(weights, "f_sem")

    # ── Feature 4: Type compatibility (f_type) ──
    f_type = _type_compatibility(a.type, b.type)

    # ── Feature 5: Entity overlap (f_entity) ──
    if has_entity:
        f_entity = _entity_jaccard(a.entities, b.entities)
    else:
        f_entity = 0.0
        if not has_entity:
            weights = _renormalize_without(weights, "f_entity")

    # ── Feature 6: Source independence (f_indep) ──
    f_indep = _source_independence(a.source_type, b.source_type)

    # ── Compute weighted score (logistic) ──
    features = {
        "f_dist": round(f_dist, 3),
        "f_time": round(f_time, 3),
        "f_sem": round(f_sem, 3),
        "f_type": round(f_type, 3),
        "f_entity": round(f_entity, 3),
        "f_indep": round(f_indep, 3),
    }

    # Weighted sum
    z = sum(weights.get(k, 0) * v for k, v in features.items())
    # Apply sigmoid for final score
    score = 1 / (1 + math.exp(-6 * (z - 0.35)))  # calibrated sigmoid
    score = round(max(0.0, min(1.0, score)), 3)

    # Contributions (how much each feature contributed)
    contributions = {}
    total_abs = sum(abs(weights.get(k, 0) * v) for k, v in features.items()) or 1
    for k, v in features.items():
        w = weights.get(k, 0)
        contributions[k] = round(abs(w * v) / total_abs * score, 3)

    # ── Decision band ──
    band = _classify_band(score)

    # ── Human-readable explanation ──
    explanation = _build_explanation(features, contributions, distance_m, time_delta_s, a, b)

    return ScoreResult(
        pair_id=pair.pair_id,
        score=score,
        features=features,
        contributions=contributions,
        band=band,
        explanation=explanation,
    )


def _get_type_family(incident_type: str) -> Optional[str]:
    """Get the family key for a given incident type."""
    for family, types in TYPE_FAMILIES.items():
        if incident_type in types:
            return family
    return None


def _type_compatibility(type_a: str, type_b: str) -> float:
    """
    Type compatibility matrix lookup.
    identical = 1.0, same family = 0.7, cross-family = 0.0
    """
    if type_a == type_b:
        return 1.0
    
    family_a = _get_type_family(type_a)
    family_b = _get_type_family(type_b)
    
    if family_a and family_b and family_a == family_b:
        return 0.7
    
    return 0.0


def _entity_jaccard(entities_a: list[dict], entities_b: list[dict]) -> float:
    """
    Jaccard similarity over extracted entities.
    Landmark matches weighted ×2 (§21.2).
    """
    if not entities_a and not entities_b:
        return 0.0

    set_a = set()
    set_b = set()
    landmark_matches = 0

    for e in entities_a:
        normalized = e.get("normalized", e.get("text", "")).lower().strip()
        if normalized:
            set_a.add(normalized)

    for e in entities_b:
        normalized = e.get("normalized", e.get("text", "")).lower().strip()
        if normalized:
            set_b.add(normalized)

    if not set_a and not set_b:
        return 0.0

    intersection = set_a & set_b
    union = set_a | set_b

    # Weight landmark matches ×2
    for match in intersection:
        for e in entities_a + entities_b:
            norm = e.get("normalized", e.get("text", "")).lower().strip()
            if norm == match and e.get("type") == "LANDMARK":
                landmark_matches += 1
                break

    base_jaccard = len(intersection) / len(union) if union else 0.0
    # Boost for landmark matches
    landmark_bonus = min(0.3, landmark_matches * 0.15)

    return min(1.0, base_jaccard + landmark_bonus)


def _source_independence(source_a: str, source_b: str) -> float:
    """
    Source independence scoring (§21.2).
    
    SAME reporter/device/channel → higher duplicate evidence (positive score)
    DIFFERENT independent sources → corroboration (lower duplicate score,
    but increases confidence that the event is REAL)
    """
    if source_a == source_b:
        # Same source type → likely duplicate submission
        return 0.8
    
    # Different source types → independent corroboration
    # Group sources by independence level
    citizen_sources = {"CITIZEN_APP", "CITIZEN_SMS", "SOCIAL_MEDIA"}
    official_sources = {"FIELD_UNIT", "GOV_DEPARTMENT", "HOSPITAL", "OPERATOR_MANUAL"}
    sensor_sources = {"IOT_SENSOR", "CCTV_ANALYTICS"}
    
    groups = [citizen_sources, official_sources, sensor_sources]
    
    group_a = None
    group_b = None
    for g in groups:
        if source_a in g:
            group_a = id(g)
        if source_b in g:
            group_b = id(g)
    
    if group_a is not None and group_b is not None and group_a != group_b:
        # Truly independent sources (e.g. citizen + sensor) = strong corroboration
        return 0.2
    elif group_a != group_b:
        return 0.3
    else:
        # Same group but different specific source
        return 0.5


def _classify_band(score: float) -> CorrelationBand:
    """Classify a score into a decision band (§21.3)."""
    if score >= CORRELATION_THRESHOLDS["DUPLICATE"]:
        return "DUPLICATE"
    elif score >= CORRELATION_THRESHOLDS["LIKELY_SAME"]:
        return "LIKELY_SAME"
    elif score >= CORRELATION_THRESHOLDS["RELATED"]:
        return "RELATED"
    else:
        return "INDEPENDENT"


def _renormalize_without(weights: dict, exclude_key: str) -> dict:
    """Renormalize weights excluding a missing feature."""
    result = {k: v for k, v in weights.items() if k != exclude_key}
    total = sum(abs(v) for v in result.values())
    if total > 0:
        original_total = sum(abs(v) for v in weights.values())
        scale = original_total / total
        result = {k: v * scale for k, v in result.items()}
    result[exclude_key] = 0.0
    return result


def _build_explanation(
    features: dict,
    contributions: dict,
    distance_m: float,
    time_delta_s: float,
    a: IncidentData,
    b: IncidentData,
) -> str:
    """Build a human-readable explanation string (§21.4)."""
    parts = []

    # Distance
    if distance_m < 1000:
        parts.append(f"{int(distance_m)} m apart")
    else:
        parts.append(f"{distance_m/1000:.1f} km apart")

    # Time
    if time_delta_s < 60:
        parts.append(f"{int(time_delta_s)} s apart")
    elif time_delta_s < 3600:
        parts.append(f"{int(time_delta_s/60)} min apart")
    else:
        parts.append(f"{time_delta_s/3600:.1f} hr apart")

    # Semantic
    if features["f_sem"] > 0:
        parts.append(f"text similarity {features['f_sem']:.2f}")

    # Type
    if a.type == b.type:
        parts.append(f"same type ({a.type})")
    elif features["f_type"] > 0:
        parts.append(f"related types ({a.type} / {b.type})")

    # Entities
    if features["f_entity"] > 0:
        shared = _get_shared_entities(a.entities, b.entities)
        if shared:
            parts.append(f"shares {'landmark' if any(e.get('type')=='LANDMARK' for e in a.entities+b.entities) else 'entity'} \"{shared[0]}\"")

    # Source independence
    if a.source_type != b.source_type:
        parts.append("different reporters (corroborating)")
    else:
        parts.append("same source type (duplicate likely)")

    return " · ".join(parts)


def _get_shared_entities(entities_a: list[dict], entities_b: list[dict]) -> list[str]:
    """Get shared entity names between two entity lists."""
    set_a = {e.get("normalized", e.get("text", "")).lower().strip() for e in entities_a}
    set_b = {e.get("normalized", e.get("text", "")).lower().strip() for e in entities_b}
    shared = set_a & set_b
    shared.discard("")
    return list(shared)[:3]
