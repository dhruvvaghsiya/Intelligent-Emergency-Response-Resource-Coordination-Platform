"""
PRAHARI AI Service — Embed Router

POST /ai/v1/embed
Batch embedding endpoint for text arrays.
See README §13.6 for the frozen contract.
"""

import time
import logging

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.embeddings import embed_texts, get_model
from app.dependencies import metrics, AICallRecord

logger = logging.getLogger("prahari.ai.embed")

router = APIRouter(prefix="/ai/v1", tags=["embed"])


class EmbedRequest(BaseModel):
    texts: list[str]


class EmbedResponse(BaseModel):
    vectors: list[list[float]]
    degraded: bool
    model: str
    latency_ms: int


@router.post("/embed", response_model=EmbedResponse)
async def embed(req: EmbedRequest):
    """
    Generate 384-d embeddings for a batch of texts.
    
    Contract (§13.6):
      req  { texts[] }
      res  { vectors: number[][] }
    """
    start = time.time()

    model = get_model()
    degraded = model is None
    model_name = "hash-fallback" if degraded else "all-MiniLM-L6-v2"

    vectors = embed_texts(req.texts)

    elapsed = int((time.time() - start) * 1000)

    metrics.record(AICallRecord(
        endpoint="/ai/v1/embed",
        latency_ms=elapsed,
        ok=True,
        degraded=degraded,
        schema_failed=False,
        model=model_name,
    ))

    return EmbedResponse(
        vectors=vectors,
        degraded=degraded,
        model=model_name,
        latency_ms=elapsed,
    )
