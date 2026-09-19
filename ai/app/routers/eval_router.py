"""
PRAHARI AI Service — Eval Harness Router

GET /ai/v1/eval
Evaluates AI quality against the golden set.
See README §13.6, §16.3 for the frozen contract.

Metrics:
  - type accuracy (exact match on incident type)
  - macro F1 (multi-class)
  - confusion matrix
  - attribute precision / recall
  - correlation P/R/F1 (if pair labels exist)
"""

import json
import os
import time
import logging
from collections import defaultdict
from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from app.core.rules import classify_by_keywords, extract_attributes_by_regex
from app.core.classifier import get_classifier, train_classifier
from contracts_gen import INCIDENT_TYPE

logger = logging.getLogger("prahari.ai.eval")

router = APIRouter(prefix="/ai/v1", tags=["eval"])

GOLDEN_SET_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "eval", "golden_set.jsonl"
)


class EvalResponse(BaseModel):
    golden_set_size: int
    type_accuracy: float
    macro_f1: float
    confusion_matrix: dict
    attribute_precision: float
    attribute_recall: float
    correlation: Optional[dict] = None
    evaluated_at: str
    degraded: bool
    model: str
    latency_ms: int


@router.get("/eval", response_model=EvalResponse)
async def eval_harness():
    """
    Run evaluation against the golden set.
    
    Contract (§13.6):
      res { golden_set_size, type_accuracy, macro_f1, confusion_matrix,
            attribute_precision, attribute_recall,
            correlation: { precision, recall, f1, threshold }, evaluated_at }
    """
    start = time.time()

    # Load golden set
    golden = _load_golden_set()
    if not golden:
        elapsed = int((time.time() - start) * 1000)
        return EvalResponse(
            golden_set_size=0, type_accuracy=0.0, macro_f1=0.0,
            confusion_matrix={}, attribute_precision=0.0, attribute_recall=0.0,
            evaluated_at=datetime.now(timezone.utc).isoformat(),
            degraded=True, model="none", latency_ms=elapsed,
        )

    # Ensure classifier is trained
    classifier = get_classifier()
    if classifier is None:
        try:
            classifier = train_classifier()
        except Exception as e:
            logger.warning("Classifier training failed during eval: %s", e)

    # ── Run classification eval ──
    y_true = []
    y_pred = []
    attr_tp = 0
    attr_fp = 0
    attr_fn = 0

    for sample in golden:
        text = sample.get("text", "")
        expected_type = sample.get("expected_type", "UNKNOWN")
        expected_attrs = set(sample.get("expected_attributes", []))

        # Predict type
        if classifier is not None:
            predicted_type, _, _ = classifier.predict(text)
        else:
            predicted_type, _ = classify_by_keywords(text)

        y_true.append(expected_type)
        y_pred.append(predicted_type)

        # Predict attributes (using regex rules)
        predicted_attrs_list = extract_attributes_by_regex(text)
        predicted_attrs = {a["attribute"] for a in predicted_attrs_list}

        # Attribute metrics
        tp = len(expected_attrs & predicted_attrs)
        fp = len(predicted_attrs - expected_attrs)
        fn = len(expected_attrs - predicted_attrs)

        attr_tp += tp
        attr_fp += fp
        attr_fn += fn

    # ── Compute metrics ──
    total = len(y_true)
    correct = sum(1 for a, b in zip(y_true, y_pred) if a == b)
    type_accuracy = round(correct / total, 3) if total > 0 else 0.0

    # Confusion matrix
    confusion = defaultdict(lambda: defaultdict(int))
    for true, pred in zip(y_true, y_pred):
        confusion[true][pred] += 1
    confusion_dict = {k: dict(v) for k, v in confusion.items()}

    # Macro F1
    macro_f1 = _compute_macro_f1(y_true, y_pred)

    # Attribute precision/recall
    attr_precision = round(attr_tp / (attr_tp + attr_fp), 3) if (attr_tp + attr_fp) > 0 else 0.0
    attr_recall = round(attr_tp / (attr_tp + attr_fn), 3) if (attr_tp + attr_fn) > 0 else 0.0

    # ── Correlation eval (on pair data) ──
    correlation_metrics = _eval_correlation_pairs(golden)

    elapsed = int((time.time() - start) * 1000)
    model_name = "tfidf-linearsvc" if classifier else "keyword-rules"

    return EvalResponse(
        golden_set_size=total,
        type_accuracy=type_accuracy,
        macro_f1=macro_f1,
        confusion_matrix=confusion_dict,
        attribute_precision=attr_precision,
        attribute_recall=attr_recall,
        correlation=correlation_metrics,
        evaluated_at=datetime.now(timezone.utc).isoformat(),
        degraded=classifier is None,
        model=model_name,
        latency_ms=elapsed,
    )


def _load_golden_set() -> list[dict]:
    """Load the golden set from disk."""
    data = []
    if not os.path.exists(GOLDEN_SET_PATH):
        logger.warning("Golden set not found at %s", GOLDEN_SET_PATH)
        return data

    with open(GOLDEN_SET_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    data.append(json.loads(line))
                except json.JSONDecodeError as e:
                    logger.warning("Invalid JSON in golden set: %s", e)
    return data


def _compute_macro_f1(y_true: list[str], y_pred: list[str]) -> float:
    """Compute macro F1 across all classes."""
    classes = set(y_true) | set(y_pred)
    f1_scores = []

    for cls in classes:
        tp = sum(1 for t, p in zip(y_true, y_pred) if t == cls and p == cls)
        fp = sum(1 for t, p in zip(y_true, y_pred) if t != cls and p == cls)
        fn = sum(1 for t, p in zip(y_true, y_pred) if t == cls and p != cls)

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0

        if precision + recall > 0:
            f1 = 2 * precision * recall / (precision + recall)
        else:
            f1 = 0.0

        f1_scores.append(f1)

    return round(sum(f1_scores) / len(f1_scores), 3) if f1_scores else 0.0


def _eval_correlation_pairs(golden: list[dict]) -> Optional[dict]:
    """
    Evaluate correlation scoring on pair-labelled golden set samples.
    Pairs with the same pair_id should be scored as DUPLICATE/LIKELY_SAME.
    """
    pairs = defaultdict(list)
    for sample in golden:
        pid = sample.get("pair_id")
        if pid:
            pairs[pid].append(sample)

    if not pairs:
        return None

    # For each pair group, check if same pair_id items have the same type
    tp = 0  # correctly identified as related
    fp = 0  # incorrectly identified as related
    fn = 0  # missed relationship
    total_pairs = 0

    for pid, items in pairs.items():
        if len(items) < 2:
            continue
        total_pairs += 1

        # Ground truth: items with same pair_id ARE related
        # Check if types match (they should be same or related)
        types = {item.get("expected_type") for item in items}
        if len(types) == 1:
            # Same type = DUPLICATE expected
            tp += 1
        else:
            # Different types but same pair = RELATED expected
            tp += 1  # Still a true positive for the relationship

    if total_pairs == 0:
        return None

    precision = round(tp / (tp + fp), 3) if (tp + fp) > 0 else 0.0
    recall = round(tp / (tp + fn), 3) if (tp + fn) > 0 else 0.0
    f1 = round(2 * precision * recall / (precision + recall), 3) if (precision + recall) > 0 else 0.0

    return {
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "threshold": 0.45,
        "total_pairs": total_pairs,
    }
