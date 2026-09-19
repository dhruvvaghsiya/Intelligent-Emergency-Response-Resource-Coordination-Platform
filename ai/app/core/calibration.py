"""
PRAHARI AI Service — Calibration Module

Source reliability priors, confidence semantics, and belief aggregation.
See README §23 for the specification.

Three different numbers (never conflated):
  extraction_confidence: "how sure the model is that the text *says* this"
  asserted_probability:  "if the source is right, how likely is the attribute true"
  source_reliability:    calibrated prior on the channel
"""

import math
import logging
from typing import Optional

from app.core.rules import get_source_priors, get_decay_tau, get_conflict_theta

logger = logging.getLogger("prahari.ai.calibration")


def get_source_reliability(source_type: str) -> float:
    """
    Get the reliability prior for a source type.
    Returns a float in [0, 1].
    """
    priors = get_source_priors()
    return priors.get(source_type, 0.50)


def compute_belief(
    extraction_confidence: float,
    asserted_probability: float,
    source_reliability: float,
) -> float:
    """
    Compute the final belief (posterior probability) for an evidence attribute.
    
    belief = extraction_confidence × asserted_probability × source_reliability
    
    This is the simplified product rule. In a full Bayesian system,
    we'd use proper updating, but this is sufficient for triage.
    """
    belief = extraction_confidence * asserted_probability * source_reliability
    return round(max(0.0, min(1.0, belief)), 3)


def aggregate_beliefs(
    evidence_list: list[dict],
    attribute: str,
) -> dict:
    """
    Aggregate multiple evidence items for the same attribute.
    
    Returns {
        "belief": float,            # net belief
        "supporting_weight": float, # total supporting evidence
        "refuting_weight": float,   # total refuting evidence
        "contested": bool,          # True if conflicting evidence
        "source_count": int,        # number of distinct sources
    }
    
    Evidence items: [{"belief": float, "source_type": str, "timestamp": float, "refutes": bool}]
    """
    if not evidence_list:
        return {
            "belief": 0.0,
            "supporting_weight": 0.0,
            "refuting_weight": 0.0,
            "contested": False,
            "source_count": 0,
        }

    theta = get_conflict_theta()
    decay_config = get_decay_tau()
    tau = decay_config.get(attribute, decay_config.get("default", 900))

    supporting_weight = 0.0
    refuting_weight = 0.0
    sources = set()
    now = max(e.get("timestamp", 0) for e in evidence_list)

    for ev in evidence_list:
        belief = ev.get("belief", 0.5)
        ts = ev.get("timestamp", now)
        source = ev.get("source_type", "UNKNOWN")
        refutes = ev.get("refutes", False)

        # Time decay: weight × exp(-Δt/τ)
        delta_t = max(0, now - ts)
        decay = math.exp(-delta_t / tau) if tau > 0 else 1.0
        weighted = belief * decay

        sources.add(source)

        if refutes:
            refuting_weight += weighted
        else:
            supporting_weight += weighted

    # Net belief: supporting - refuting, clamped
    net_belief = max(0.0, min(1.0, supporting_weight - refuting_weight))

    # Conflict detection: if both sides have significant weight
    contested = (supporting_weight >= theta and refuting_weight >= theta)

    return {
        "belief": round(net_belief, 3),
        "supporting_weight": round(supporting_weight, 3),
        "refuting_weight": round(refuting_weight, 3),
        "contested": contested,
        "source_count": len(sources),
    }
