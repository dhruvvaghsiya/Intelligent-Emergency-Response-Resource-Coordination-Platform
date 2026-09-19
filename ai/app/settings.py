"""
PRAHARI AI Service — Application Settings

Environment variables loaded from .env, with defaults for development.
See README §13.9 for the frozen env var contract.
"""

from pydantic_settings import BaseSettings
from typing import Literal


class Settings(BaseSettings):
    """AI service configuration. All env vars are prefixed-free per §13.9."""

    # ── LLM Configuration ──
    llm_provider: Literal["gemini", "openai", "groq", "mock"] = "mock"
    llm_api_key: str = ""
    groq_api_key: str = ""
    openai_api_key: str = ""
    gemini_api_key: str = ""
    llm_model: str = "gemini-1.5-flash"

    def get_api_key(self) -> str:
        """Returns the effective API key for the active provider."""
        if self.llm_api_key:
            return self.llm_api_key
        if self.llm_provider == "groq" and self.groq_api_key:
            return self.groq_api_key
        if self.llm_provider == "openai" and self.openai_api_key:
            return self.openai_api_key
        if self.llm_provider == "gemini" and self.gemini_api_key:
            return self.gemini_api_key
        return self.groq_api_key or self.openai_api_key or self.gemini_api_key or ""

    # ── Embedding Model ──
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"

    # ── Server ──
    ai_port: int = 8000

    # ── Operational ──
    log_level: str = "info"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
    }


settings = Settings()
