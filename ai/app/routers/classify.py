"""
PRAHARI AI Service — Classify Router

POST /ai/v1/classify
Classifies incident type using TF-IDF + LinearSVC (no LLM).
See README §13.6: sklearn-based, no LLM involved.
"""

import time
import logging

from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional

from app.core.classifier import get_classifier, train_classifier
from app.core.rules import classify_by_keywords
from app.dependencies import metrics, AICallRecord

logger = logging.getLogger("prahari.ai.classify")

router = APIRouter(prefix="/ai/v1", tags=["classify"])


class ClassifyRequest(BaseModel):
    text: str
    structured: Optional[dict] = None


class TopKItem(BaseModel):
    type: str
    confidence: float = Field(ge=0, le=1)


class ClassifyResponse(BaseModel):
    type: str
    confidence: float = Field(ge=0, le=1)
    top_k: list[TopKItem]
    degraded: bool
    model: str
    latency_ms: int


@router.post("/classify", response_model=ClassifyResponse)
async def classify(req: ClassifyRequest):
    """
    Classify incident type from text.
    
    Contract (§13.6):
      req  { text, structured? }
      res  { type, confidence, top_k[] }
    
    Uses TF-IDF + LinearSVC (sklearn, no LLM).
    Falls back to keyword rules if classifier is not trained.
    """
    start = time.time()

    classifier = get_classifier()
    degraded = False
    model_name = "tfidf-linearsvc"

    if classifier is not None:
        # Use trained classifier
        predicted_type, confidence, top_k = classifier.predict(req.text)
    else:
        # Try to train on the fly (first request)
        try:
            logger.info("No classifier found, training now...")
            classifier = train_classifier()
            predicted_type, confidence, top_k = classifier.predict(req.text)
        except Exception as e:
            logger.warning("Classifier training failed: %s — using keyword rules", e)
            # Fall back to keyword rules
            degraded = True
            model_name = "keyword-rules"
            predicted_type, confidence = classify_by_keywords(req.text)
            top_k = [{"type": predicted_type, "confidence": confidence}]

    elapsed = int((time.time() - start) * 1000)

    metrics.record(AICallRecord(
        endpoint="/ai/v1/classify",
        latency_ms=elapsed,
        ok=True,
        degraded=degraded,
        schema_failed=False,
        model=model_name,
    ))

    return ClassifyResponse(
        type=predicted_type,
        confidence=confidence,
        top_k=[TopKItem(**item) for item in top_k],
        degraded=degraded,
        model=model_name,
        latency_ms=elapsed,
    )
