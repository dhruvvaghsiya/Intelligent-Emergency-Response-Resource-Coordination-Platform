"""
PRAHARI AI Service — Embeddings Module

Local sentence-transformers wrapper for semantic similarity.
Model: all-MiniLM-L6-v2 (384-d vectors).
See README §9: local embeddings = no per-call cost, no rate limit, deterministic.

Used by:
  - /ai/v1/embed — batch embedding endpoint
  - /ai/v1/extract — single text embedding
  - /ai/v1/correlate-score — semantic similarity feature (f_sem)
"""

import logging
import hashlib
from typing import Optional

logger = logging.getLogger("prahari.ai.embeddings")

_model = None


def load_embedding_model():
    """
    Load the sentence-transformers model at startup.
    Returns the model or None if unavailable.
    """
    global _model
    try:
        from sentence_transformers import SentenceTransformer
        from app.settings import settings
        _model = SentenceTransformer(settings.embedding_model)
        logger.info("Loaded embedding model: %s", settings.embedding_model)
        return _model
    except Exception as e:
        logger.warning("Could not load embedding model: %s", e)
        return None


def get_model():
    """Get the loaded model instance."""
    return _model


def embed_texts(texts: list[str]) -> list[list[float]]:
    """
    Embed a batch of texts. Returns list of 384-d vectors.
    Falls back to hash-based embeddings if model is unavailable.
    """
    if _model is not None:
        try:
            vectors = _model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
            return [v.tolist() for v in vectors]
        except Exception as e:
            logger.warning("Batch embedding failed: %s", e)

    # Fallback: deterministic hash-based embeddings
    return [hash_embedding(t) for t in texts]


def embed_single(text: str) -> list[float]:
    """Embed a single text. Returns 384-d vector."""
    if _model is not None:
        try:
            vector = _model.encode(text, normalize_embeddings=True, show_progress_bar=False)
            return vector.tolist()
        except Exception as e:
            logger.warning("Single embedding failed: %s", e)

    return hash_embedding(text)


def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    if len(vec_a) != len(vec_b) or len(vec_a) == 0:
        return 0.0

    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = sum(a * a for a in vec_a) ** 0.5
    norm_b = sum(b * b for b in vec_b) ** 0.5

    if norm_a == 0 or norm_b == 0:
        return 0.0

    return dot / (norm_a * norm_b)


def hash_embedding(text: str, dim: int = 384) -> list[float]:
    """
    Deterministic pseudo-embedding from text hash.
    Poor quality but valid shape — used when model is unavailable.
    Backend marks degraded=true, f_sem is dropped from correlation.
    """
    h = hashlib.sha512(text.encode("utf-8")).digest()
    extended = h
    while len(extended) < dim:
        h = hashlib.sha512(h).digest()
        extended += h

    values = [(b / 255.0) * 2 - 1 for b in extended[:dim]]

    # L2 normalize
    norm = sum(v * v for v in values) ** 0.5
    if norm > 0:
        values = [v / norm for v in values]

    return [round(v, 6) for v in values]
