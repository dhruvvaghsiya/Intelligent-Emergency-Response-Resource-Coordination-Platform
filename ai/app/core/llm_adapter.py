"""
PRAHARI AI Service — LLM Adapter

Unified interface for LLM providers (Gemini, OpenAI, Groq, Mock).
See README §16.1: LLM is used ONLY for:
  1. Turning unstructured multilingual text into structured claims
  2. Writing summaries
Every number that moves a vehicle is computed deterministically.

§13.6 guardrails:
  - Citizen text wrapped in <untrusted_report>...</untrusted_report>
  - Response must satisfy JSON Schema — 1 repair retry then fallback
  - Provider set via LLM_PROVIDER env var (gemini | openai | groq | mock)
"""

import json
import logging
import time
from abc import ABC, abstractmethod
from typing import Optional

from app.settings import settings

logger = logging.getLogger("prahari.ai.llm")


class LLMResponse:
    """Standardized response from any LLM provider."""

    def __init__(
        self,
        content: str,
        model: str,
        latency_ms: int,
        degraded: bool = False,
    ):
        self.content = content
        self.model = model
        self.latency_ms = latency_ms
        self.degraded = degraded

    def parse_json(self) -> Optional[dict]:
        """Parse the response content as JSON. Returns None on failure."""
        try:
            # Strip markdown code fences if present
            text = self.content.strip()
            if text.startswith("```json"):
                text = text[7:]
            elif text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            return json.loads(text.strip())
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning("Failed to parse LLM JSON response: %s", e)
            return None


class BaseLLMProvider(ABC):
    """Abstract base class for LLM providers."""

    @abstractmethod
    async def generate(self, system_prompt: str, user_prompt: str) -> LLMResponse:
        """Generate a response from the LLM."""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Check if the provider is ready to accept requests."""
        pass


class MockProvider(BaseLLMProvider):
    """
    Fully offline mock provider. Returns plausible structured responses
    without any network calls. MUST work for a complete demo (§13.9).
    """

    def is_available(self) -> bool:
        return True

    async def generate(self, system_prompt: str, user_prompt: str) -> LLMResponse:
        start = time.time()

        # Extract key information from the prompt to generate contextual responses
        text_lower = user_prompt.lower()

        # Determine incident type from keywords
        type_suggestion = "UNKNOWN"
        type_confidence = 0.5
        if any(w in text_lower for w in ["fire", "blaze", "flame", "burning", "aag"]):
            if any(w in text_lower for w in ["factory", "industrial", "chemical", "plant"]):
                type_suggestion = "FIRE_INDUSTRIAL"
                type_confidence = 0.88
            elif any(w in text_lower for w in ["car", "vehicle", "truck"]):
                type_suggestion = "FIRE_VEHICLE"
                type_confidence = 0.85
            else:
                type_suggestion = "FIRE_STRUCTURE"
                type_confidence = 0.82
        elif any(w in text_lower for w in ["flood", "water", "submerge", "waterlog"]):
            if any(w in text_lower for w in ["waterlog", "stagnant"]):
                type_suggestion = "WATERLOGGING"
            else:
                type_suggestion = "FLOOD"
            type_confidence = 0.80
        elif any(w in text_lower for w in ["accident", "crash", "collision", "pileup"]):
            type_suggestion = "ROAD_ACCIDENT"
            type_confidence = 0.85
        elif any(w in text_lower for w in ["collapse", "building fell", "rubble"]):
            type_suggestion = "BUILDING_COLLAPSE"
            type_confidence = 0.87
        elif any(w in text_lower for w in ["gas leak", "smell gas", "lpg"]):
            type_suggestion = "GAS_LEAK"
            type_confidence = 0.83
        elif any(w in text_lower for w in ["chemical", "toxic", "hazmat", "spill"]):
            type_suggestion = "CHEMICAL_SPILL"
            type_confidence = 0.84
        elif any(w in text_lower for w in ["heart", "cardiac", "stroke", "medical"]):
            type_suggestion = "MEDICAL_EMERGENCY"
            type_confidence = 0.78
        elif any(w in text_lower for w in ["trapped", "stuck", "rescue"]):
            type_suggestion = "RESCUE_TRAPPED"
            type_confidence = 0.76
        elif any(w in text_lower for w in ["stampede", "crowd", "overcrowd"]):
            type_suggestion = "CROWD_INCIDENT"
            type_confidence = 0.79
        elif any(w in text_lower for w in ["electric", "power line", "electrocution"]):
            type_suggestion = "ELECTRICAL_HAZARD"
            type_confidence = 0.80

        # Extract attributes based on keywords
        attributes = []
        attr_checks = [
            ("people_trapped", ["trapped", "stuck inside", "pinned", "rescue needed", "people inside"]),
            ("casualties_reported", ["injured", "hurt", "casualty", "casualties", "wound", "bleeding"]),
            ("fatalities_reported", ["dead", "died", "killed", "fatal", "deceased", "body"]),
            ("fire_active", ["fire", "flames", "blaze", "burning", "ablaze"]),
            ("smoke_heavy", ["thick smoke", "heavy smoke", "black smoke", "smoke billowing"]),
            ("structural_damage", ["collapse", "crumbling", "damaged", "cracked", "tilting"]),
            ("chemical_hazard", ["chemical", "toxic", "hazardous", "hazmat", "ammonia"]),
            ("gas_leak", ["gas leak", "smell gas", "lpg", "propane", "hissing"]),
            ("water_depth_high", ["waist deep", "knee deep", "submerged", "water level high"]),
            ("road_blocked", ["road blocked", "road closed", "no passage", "route blocked"]),
            ("power_down", ["power out", "power cut", "blackout", "no electricity"]),
            ("crowd_large", ["large crowd", "thousands", "hundreds of people", "mob"]),
            ("spread_risk_high", ["spreading", "expanding", "getting worse", "intensifying"]),
            ("access_restricted", ["access blocked", "unreachable", "cannot reach", "narrow lane"]),
        ]

        for attr_name, keywords in attr_checks:
            for kw in keywords:
                if kw in text_lower:
                    attributes.append({
                        "attribute": attr_name,
                        "asserted_probability": round(0.65 + (type_confidence - 0.5) * 0.4, 3),
                        "extraction_confidence": round(0.70 + (type_confidence - 0.5) * 0.3, 3),
                        "span": kw,
                    })
                    break

        # Extract entities (landmarks, roads, etc.)
        entities = []
        ahmedabad_landmarks = {
            "sabarmati": ("Sabarmati Riverfront", "LANDMARK"),
            "riverfront": ("Sabarmati Riverfront", "LANDMARK"),
            "maninagar": ("Maninagar", "AREA"),
            "vatva": ("Vatva", "AREA"),
            "sg highway": ("SG Highway", "ROAD"),
            "ashram road": ("Ashram Road", "ROAD"),
            "relief road": ("Relief Road", "ROAD"),
            "cg road": ("CG Road", "ROAD"),
            "iscon": ("ISCON", "LANDMARK"),
            "paldi": ("Paldi", "AREA"),
            "navrangpura": ("Navrangpura", "AREA"),
            "satellite": ("Satellite", "AREA"),
            "bopal": ("Bopal", "AREA"),
            "gidc": ("GIDC", "AREA"),
            "narol": ("Narol", "AREA"),
            "naroda": ("Naroda", "AREA"),
            "odhav": ("Odhav", "AREA"),
        }

        for keyword, (normalized, entity_type) in ahmedabad_landmarks.items():
            if keyword in text_lower:
                entities.append({
                    "type": entity_type,
                    "text": keyword,
                    "normalized": normalized,
                    "confidence": 0.90,
                })

        # Count people if mentioned
        people_count = None
        import re
        count_match = re.search(r"(\d+)\s*(?:people|persons?|workers?|victims?)", text_lower)
        if count_match:
            people_count = int(count_match.group(1))

        # Generate summary
        summary_text = user_prompt[:100].strip()
        if len(summary_text) > 100:
            summary_text = summary_text[:97] + "..."

        # Detect language
        lang = "en"
        hindi_markers = ["hai", "mein", "ka", "ki", "ko", "aag", "paani", "log"]
        gujarati_markers = ["che", "ma", "ni", "thi", "pur"]
        if any(w in text_lower.split() for w in hindi_markers):
            lang = "hi"
        elif any(w in text_lower.split() for w in gujarati_markers):
            lang = "gu"

        response_data = {
            "type_suggestion": type_suggestion,
            "type_confidence": type_confidence,
            "attributes": attributes,
            "entities": entities,
            "people_count_estimate": people_count,
            "summary": summary_text,
            "language_detected": lang,
        }

        elapsed_ms = int((time.time() - start) * 1000)

        return LLMResponse(
            content=json.dumps(response_data),
            model="mock-v1",
            latency_ms=elapsed_ms,
            degraded=False,
        )


class GeminiProvider(BaseLLMProvider):
    """Google Gemini provider (recommended: gemini-1.5-flash)."""

    def __init__(self):
        self._client = None
        self._model_name = settings.llm_model or "gemini-1.5-flash"

    def _get_client(self):
        if self._client is None:
            import google.generativeai as genai
            genai.configure(api_key=settings.get_api_key())
            self._client = genai.GenerativeModel(
                self._model_name,
                generation_config={
                    "response_mime_type": "application/json",
                    "temperature": 0.1,
                },
            )
        return self._client

    def is_available(self) -> bool:
        return bool(settings.get_api_key())

    async def generate(self, system_prompt: str, user_prompt: str) -> LLMResponse:
        start = time.time()
        try:
            model = self._get_client()
            full_prompt = f"{system_prompt}\n\n{user_prompt}"
            response = model.generate_content(full_prompt)
            elapsed = int((time.time() - start) * 1000)
            return LLMResponse(
                content=response.text,
                model=self._model_name,
                latency_ms=elapsed,
            )
        except Exception as e:
            elapsed = int((time.time() - start) * 1000)
            logger.error("Gemini API error: %s", e)
            raise


class OpenAIProvider(BaseLLMProvider):
    """OpenAI provider (gpt-4o-mini class)."""

    def __init__(self):
        self._client = None
        self._model_name = settings.llm_model or "gpt-4o-mini"

    def _get_client(self):
        if self._client is None:
            from openai import OpenAI
            self._client = OpenAI(api_key=settings.get_api_key())
        return self._client

    def is_available(self) -> bool:
        return bool(settings.get_api_key())

    async def generate(self, system_prompt: str, user_prompt: str) -> LLMResponse:
        start = time.time()
        try:
            client = self._get_client()
            response = client.chat.completions.create(
                model=self._model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
            )
            elapsed = int((time.time() - start) * 1000)
            return LLMResponse(
                content=response.choices[0].message.content,
                model=self._model_name,
                latency_ms=elapsed,
            )
        except Exception as e:
            elapsed = int((time.time() - start) * 1000)
            logger.error("OpenAI API error: %s", e)
            raise


class GroqProvider(BaseLLMProvider):
    """
    Groq provider — fast inference with Llama/Mixtral models.
    Uses the OpenAI-compatible API.
    """

    def __init__(self):
        self._client = None
        self._model_name = settings.llm_model or "llama-3.1-70b-versatile"

    def _get_client(self):
        if self._client is None:
            from openai import OpenAI
            self._client = OpenAI(
                api_key=settings.get_api_key(),
                base_url="https://api.groq.com/openai/v1",
            )
        return self._client

    def is_available(self) -> bool:
        return bool(settings.get_api_key())

    async def generate(self, system_prompt: str, user_prompt: str) -> LLMResponse:
        start = time.time()
        try:
            client = self._get_client()
            response = client.chat.completions.create(
                model=self._model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
            )
            elapsed = int((time.time() - start) * 1000)
            return LLMResponse(
                content=response.choices[0].message.content,
                model=f"groq/{self._model_name}",
                latency_ms=elapsed,
            )
        except Exception as e:
            elapsed = int((time.time() - start) * 1000)
            logger.error("Groq API error: %s", e)
            raise


# ── Provider Factory ──

_provider_instance: Optional[BaseLLMProvider] = None


def get_llm_provider() -> BaseLLMProvider:
    """Get the configured LLM provider singleton."""
    global _provider_instance
    if _provider_instance is not None:
        return _provider_instance

    provider_name = settings.llm_provider.lower()

    if provider_name == "mock":
        _provider_instance = MockProvider()
    elif provider_name == "gemini":
        _provider_instance = GeminiProvider()
    elif provider_name == "openai":
        _provider_instance = OpenAIProvider()
    elif provider_name == "groq":
        _provider_instance = GroqProvider()
    else:
        logger.warning(
            "Unknown LLM_PROVIDER '%s', falling back to mock", provider_name
        )
        _provider_instance = MockProvider()

    logger.info("LLM provider initialized: %s", provider_name)
    return _provider_instance
