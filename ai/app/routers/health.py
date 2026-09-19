"""
PRAHARI AI Service — Health Endpoint

GET /ai/v1/health
Returns AI service status, model readiness, and rolling performance metrics.
See README §13.6 for the frozen contract.
"""

from fastapi import APIRouter
from app.dependencies import metrics, get_embedding_model
from app.settings import settings

router = APIRouter(prefix="/ai/v1", tags=["health"])


@router.get("/health")
async def health():
    """
    Returns AI service health status.
    
    Contract (§13.6):
    {
      status: "ok" | "degraded" | "unhealthy",
      model_loaded: bool,
      llm_ok: bool,
      p50_ms: int,
      p95_ms: int,
      schema_failure_rate: float,
      fallback_rate: float,
      calls_last_5m: int
    }
    """
    stats = metrics.get_stats()
    embedding_loaded = get_embedding_model() is not None

    # LLM is "ok" if provider is mock (always works) or if a key is configured
    llm_ok = (
        settings.llm_provider == "mock"
        or bool(settings.get_api_key())
    )

    # Determine overall status
    if not embedding_loaded:
        status = "unhealthy"
    elif stats["fallback_rate"] > 0.5:
        status = "degraded"
    else:
        status = "ok"

    return {
        "status": status,
        "model_loaded": embedding_loaded,
        "llm_ok": llm_ok,
        "p50_ms": stats["p50_ms"],
        "p95_ms": stats["p95_ms"],
        "schema_failure_rate": stats["schema_failure_rate"],
        "fallback_rate": stats["fallback_rate"],
        "calls_last_5m": stats["calls_last_5m"],
    }
