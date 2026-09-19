"""
PRAHARI AI Service — Shared Dependencies

Singleton model instances (embeddings, classifier) loaded once at startup
and injected via FastAPI's dependency system.
"""

import time
import threading
from collections import deque
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class AICallRecord:
    """A single recorded AI endpoint call for health metrics."""
    endpoint: str
    latency_ms: int
    ok: bool
    degraded: bool
    schema_failed: bool
    model: str
    timestamp: float = field(default_factory=time.time)


class MetricsCollector:
    """
    Thread-safe collector for AI call metrics.
    Keeps a rolling window of the last 5 minutes of calls.
    Serves GET /ai/v1/health with p50, p95, failure/fallback rates.
    """

    def __init__(self, window_seconds: int = 300):
        self._window = window_seconds
        self._calls: deque[AICallRecord] = deque()
        self._lock = threading.Lock()

    def record(self, record: AICallRecord) -> None:
        with self._lock:
            self._calls.append(record)
            self._prune()

    def _prune(self) -> None:
        cutoff = time.time() - self._window
        while self._calls and self._calls[0].timestamp < cutoff:
            self._calls.popleft()

    def get_stats(self) -> dict:
        with self._lock:
            self._prune()
            calls = list(self._calls)

        if not calls:
            return {
                "calls_last_5m": 0,
                "p50_ms": 0,
                "p95_ms": 0,
                "schema_failure_rate": 0.0,
                "fallback_rate": 0.0,
            }

        latencies = sorted(c.latency_ms for c in calls)
        total = len(calls)
        schema_failures = sum(1 for c in calls if c.schema_failed)
        fallbacks = sum(1 for c in calls if c.degraded)

        p50_idx = max(0, int(total * 0.50) - 1)
        p95_idx = max(0, int(total * 0.95) - 1)

        return {
            "calls_last_5m": total,
            "p50_ms": latencies[p50_idx],
            "p95_ms": latencies[p95_idx],
            "schema_failure_rate": round(schema_failures / total, 3),
            "fallback_rate": round(fallbacks / total, 3),
        }


# ── Global singletons (initialized at app startup) ──

metrics = MetricsCollector()

# These are set by main.py lifespan; None until then
_embedding_model: Optional[object] = None
_classifier: Optional[object] = None


def get_embedding_model():
    """Return the loaded sentence-transformers model, or None if unavailable."""
    return _embedding_model


def get_classifier():
    """Return the trained TF-IDF + LinearSVC classifier, or None if unavailable."""
    return _classifier
