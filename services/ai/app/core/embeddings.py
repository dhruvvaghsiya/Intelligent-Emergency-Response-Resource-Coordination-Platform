"""
PRAHARI AI Service — Embeddings Module (stub)

Local sentence-transformers wrapper. Full implementation in Commit 5.
"""

import logging
from typing import Optional

logger = logging.getLogger("prahari.ai.embeddings")


def load_embedding_model() -> Optional[object]:
    """
    Load the sentence-transformers model.
    Returns None if the model cannot be loaded (dependency missing, etc.).
    """
    try:
        from sentence_transformers import SentenceTransformer
        from app.settings import settings
        model = SentenceTransformer(settings.embedding_model)
        return model
    except Exception as e:
        logger.warning("Could not load embedding model: %s", e)
        return None
