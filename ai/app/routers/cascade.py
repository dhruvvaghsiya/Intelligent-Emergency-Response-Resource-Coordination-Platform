"""
PRAHARI AI Service — Cascade Router

POST /ai/v1/cascade
Evaluates typed causal rule graph to predict cascade effects.
See README §13.6, W5 for the frozen contract.

Rules are loaded from config/cascade_rules.yaml.
Only produces effects that mutate concrete system state — no free-floating prophecies.
"""

import time
import logging

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from app.core.rules import get_cascade_rules
from app.dependencies import metrics, AICallRecord

logger = logging.getLogger("prahari.ai.cascade")

router = APIRouter(prefix="/ai/v1", tags=["cascade"])


class CascadeIncident(BaseModel):
    type: str = "UNKNOWN"
    beliefs: dict = {}  # { attribute: probability }
    location: Optional[dict] = None  # { lng, lat }


class CascadeContext(BaseModel):
    nearby_incidents: list[dict] = []
    time_of_day: Optional[str] = None


class CascadeRequest(BaseModel):
    incident: CascadeIncident
    context: CascadeContext = CascadeContext()


class CascadeEffect(BaseModel):
    rule_id: str
    effect_type: str
    geometry: dict  # { center: {lng, lat}, radius_m }
    confidence: float
    ttl_s: int
    rationale: str


class CascadeResponse(BaseModel):
    effects: list[CascadeEffect]
    degraded: bool
    model: str
    latency_ms: int


@router.post("/cascade", response_model=CascadeResponse)
async def cascade(req: CascadeRequest):
    """
    Evaluate cascade rules for a given incident.
    
    Contract (§13.6):
      req  { incident, context }
      res  { effects: [{ rule_id, effect_type, geometry, confidence, ttl_s, rationale }] }
    """
    start = time.time()
    effects = []
    rules = get_cascade_rules()

    inc = req.incident
    loc = inc.location or {"lng": 0, "lat": 0}

    for rule in rules:
        try:
            triggered = _evaluate_rule(rule, inc)
            if triggered:
                effect_config = rule["effect"]

                # Build rationale from template
                max_prob = 0.0
                for attr, cond in rule["trigger"].get("belief_conditions", {}).items():
                    prob = inc.beliefs.get(attr, 0.0)
                    max_prob = max(max_prob, prob)

                rationale = effect_config.get("rationale_template", "").format(
                    location=f"({loc.get('lng', 0):.4f}, {loc.get('lat', 0):.4f})",
                    probability=max_prob,
                    radius_m=effect_config.get("radius_m", 0),
                )

                effects.append(CascadeEffect(
                    rule_id=rule["rule_id"],
                    effect_type=effect_config["type"],
                    geometry={
                        "center": {"lng": loc.get("lng", 0), "lat": loc.get("lat", 0)},
                        "radius_m": effect_config.get("radius_m", 300),
                    },
                    confidence=effect_config.get("confidence", 0.5),
                    ttl_s=effect_config.get("ttl_s", 3600),
                    rationale=rationale.strip()[:300],
                ))
        except Exception as e:
            logger.warning("Failed to evaluate rule %s: %s", rule.get("rule_id"), e)

    elapsed = int((time.time() - start) * 1000)

    metrics.record(AICallRecord(
        endpoint="/ai/v1/cascade", latency_ms=elapsed,
        ok=True, degraded=False, schema_failed=False, model="cascade-rules-v1",
    ))

    return CascadeResponse(
        effects=effects,
        degraded=False,
        model="cascade-rules-v1",
        latency_ms=elapsed,
    )


def _evaluate_rule(rule: dict, incident: CascadeIncident) -> bool:
    """
    Evaluate whether a cascade rule is triggered by the incident.
    
    A rule triggers when:
    1. The incident type is in the rule's trigger type list
    2. ALL belief conditions meet their minimum probability thresholds
    """
    trigger = rule.get("trigger", {})

    # Check incident type
    allowed_types = trigger.get("incident_types", [])
    if incident.type not in allowed_types:
        return False

    # Check all belief conditions
    belief_conditions = trigger.get("belief_conditions", {})
    for attr, condition in belief_conditions.items():
        min_prob = condition.get("min_probability", 0.5)
        actual_prob = incident.beliefs.get(attr, 0.0)
        if actual_prob < min_prob:
            return False

    return True
