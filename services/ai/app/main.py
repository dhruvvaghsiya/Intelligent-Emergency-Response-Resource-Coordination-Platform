"""
PRAHARI AI Service — FastAPI Application Entry Point

Modular monolith's AI sidecar. Runs on port 8000 (§13.9).
Called exclusively by apps/api with a 2s timeout + circuit breaker (§13.6).

Startup loads:
  1. Sentence-transformers embedding model (MiniLM-L6-v2, 384-d)
  2. TF-IDF + LinearSVC classifier (if training data exists)
  3. LLM adapter (gemini | openai | mock)
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.settings import settings
from app import dependencies

logger = logging.getLogger("prahari.ai")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models on startup, cleanup on shutdown."""
    logger.info(
        "Starting PRAHARI AI service | provider=%s model=%s embedding=%s",
        settings.llm_provider,
        settings.llm_model,
        settings.embedding_model,
    )

    # ── Load embedding model ──
    try:
        from app.core.embeddings import load_embedding_model
        dependencies._embedding_model = load_embedding_model()
        logger.info("Embedding model loaded successfully")
    except Exception as e:
        logger.warning("Embedding model failed to load: %s — embeddings will be unavailable", e)
        dependencies._embedding_model = None

    # ── Load classifier ──
    try:
        from app.core.classifier import load_classifier
        dependencies._classifier = load_classifier()
        if dependencies._classifier is not None:
            logger.info("Classifier loaded successfully")
        else:
            logger.info("No trained classifier found — will use keyword rules as fallback")
    except Exception as e:
        logger.warning("Classifier failed to load: %s — will use keyword rules", e)
        dependencies._classifier = None

    yield

    # ── Cleanup ──
    logger.info("Shutting down PRAHARI AI service")
    dependencies._embedding_model = None
    dependencies._classifier = None


app = FastAPI(
    title="PRAHARI AI Service",
    description="AI sidecar for the PRAHARI emergency response platform. "
                "Handles extraction, classification, embedding, correlation scoring, "
                "briefing generation, cascade evaluation, and self-evaluation.",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS (allow the API server to call us) ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4000", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register routers ──
from app.routers.health import router as health_router
from app.routers.extract import router as extract_router
from app.routers.embed import router as embed_router
from app.routers.classify import router as classify_router

app.include_router(health_router)
app.include_router(extract_router)
app.include_router(embed_router)
app.include_router(classify_router)

# Additional routers will be registered as they are built:
# from app.routers.correlate import router as correlate_router
# from app.routers.briefing import router as briefing_router
# from app.routers.cascade import router as cascade_router
# from app.routers.eval_router import router as eval_router


@app.get("/")
async def root():
    return {
        "service": "prahari-ai",
        "version": "1.0.0",
        "provider": settings.llm_provider,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.ai_port,
        reload=True,
        log_level=settings.log_level,
    )
