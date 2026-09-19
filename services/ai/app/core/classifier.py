"""
PRAHARI AI Service — Classifier Module (stub)

TF-IDF + LinearSVC classifier. Full implementation in Commit 6.
"""

import logging
import os
import pickle
from typing import Optional

logger = logging.getLogger("prahari.ai.classifier")

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "models", "classifier.pkl")


def load_classifier() -> Optional[object]:
    """
    Load a pre-trained TF-IDF + LinearSVC classifier from disk.
    Returns None if no trained model exists yet.
    """
    if os.path.exists(MODEL_PATH):
        try:
            with open(MODEL_PATH, "rb") as f:
                model = pickle.load(f)
            logger.info("Classifier loaded from %s", MODEL_PATH)
            return model
        except Exception as e:
            logger.warning("Failed to load classifier: %s", e)
            return None
    else:
        logger.info("No classifier model found at %s — skipping", MODEL_PATH)
        return None
