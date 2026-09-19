"""
PRAHARI AI Service — Briefing Router

POST /ai/v1/briefing
Generates concise operational briefings for incidents using LLM.
See README §13.6 for the frozen contract.
"""

import time
import logging

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from app.core.llm_adapter import get_llm_provider
from app.core.guardrails import validate_briefing
from app.core.prompts import BRIEFING_SYSTEM_PROMPT, BRIEFING_USER_TEMPLATE, REPAIR_PROMPT
from app.dependencies import metrics, AICallRecord

logger = logging.getLogger("prahari.ai.briefing")

router = APIRouter(prefix="/ai/v1", tags=["briefing"])


class BriefingIncident(BaseModel):
    type: str = "UNKNOWN"
    severity: str = "MODERATE"
    severity_score: int = 50
    location: Optional[str] = None
    status: str = "REPORTED"
    report_count: int = 1
    assigned_units: int = 0
    evidence_summary: str = ""
    description: str = ""


class BriefingRequest(BaseModel):
    incident: BriefingIncident


class BriefingResponse(BaseModel):
    briefing: str
    bullet_points: list[str]
    degraded: bool
    model: str
    latency_ms: int


@router.post("/briefing", response_model=BriefingResponse)
async def briefing(req: BriefingRequest):
    """
    Generate operational briefing for an incident.
    
    Contract (§13.6):
      req  { incident }
      res  { briefing, bullet_points[], degraded }
    """
    start = time.time()
    degraded = False
    model_used = "rules-fallback"
    inc = req.incident

    llm = get_llm_provider()

    if llm.is_available():
        try:
            user_prompt = BRIEFING_USER_TEMPLATE.format(
                type=inc.type,
                severity=inc.severity,
                severity_score=inc.severity_score,
                location=inc.location or "Unknown",
                status=inc.status,
                report_count=inc.report_count,
                assigned_units=inc.assigned_units,
                evidence_summary=inc.evidence_summary or "No evidence summary available",
                description=inc.description or "No description provided",
            )

            response = await llm.generate(BRIEFING_SYSTEM_PROMPT, user_prompt)
            model_used = response.model

            raw = response.parse_json()
            result = validate_briefing(raw)

            if result is None and raw is not None:
                repair_prompt = REPAIR_PROMPT.format(previous_response=response.content[:500])
                repair_response = await llm.generate(BRIEFING_SYSTEM_PROMPT, repair_prompt)
                repair_raw = repair_response.parse_json()
                result = validate_briefing(repair_raw)

            if result is not None:
                elapsed = int((time.time() - start) * 1000)
                metrics.record(AICallRecord(
                    endpoint="/ai/v1/briefing", latency_ms=elapsed,
                    ok=True, degraded=False, schema_failed=False, model=model_used,
                ))
                return BriefingResponse(
                    briefing=result["briefing"],
                    bullet_points=result["bullet_points"],
                    degraded=False, model=model_used, latency_ms=elapsed,
                )
        except Exception as e:
            logger.error("LLM briefing failed: %s", e)

    # ── Fallback: deterministic briefing ──
    degraded = True
    model_used = "rules-fallback"

    type_labels = {
        "FIRE_STRUCTURE": "Structure fire", "FIRE_INDUSTRIAL": "Industrial fire",
        "FIRE_VEHICLE": "Vehicle fire", "FLOOD": "Flooding",
        "WATERLOGGING": "Waterlogging", "ROAD_ACCIDENT": "Road accident",
        "MEDICAL_EMERGENCY": "Medical emergency", "BUILDING_COLLAPSE": "Building collapse",
        "GAS_LEAK": "Gas leak", "CHEMICAL_SPILL": "Chemical spill",
        "ELECTRICAL_HAZARD": "Electrical hazard", "CROWD_INCIDENT": "Crowd incident",
        "RESCUE_TRAPPED": "Rescue operation", "INFRASTRUCTURE_FAILURE": "Infrastructure failure",
    }
    label = type_labels.get(inc.type, "Incident")

    briefing_text = (
        f"{label} ({inc.severity}) at {inc.location or 'unknown location'}. "
        f"Status: {inc.status}. {inc.report_count} report(s), "
        f"{inc.assigned_units} unit(s) assigned."
    )

    bullets = [f"Type: {label} (severity score {inc.severity_score})"]
    if inc.location:
        bullets.append(f"Location: {inc.location}")
    bullets.append(f"Status: {inc.status}")
    if inc.evidence_summary:
        bullets.append(f"Evidence: {inc.evidence_summary[:100]}")
    if inc.description:
        bullets.append(f"Description: {inc.description[:100]}")

    elapsed = int((time.time() - start) * 1000)
    metrics.record(AICallRecord(
        endpoint="/ai/v1/briefing", latency_ms=elapsed,
        ok=True, degraded=True, schema_failed=False, model=model_used,
    ))

    return BriefingResponse(
        briefing=briefing_text[:400],
        bullet_points=bullets[:5],
        degraded=True, model=model_used, latency_ms=elapsed,
    )
