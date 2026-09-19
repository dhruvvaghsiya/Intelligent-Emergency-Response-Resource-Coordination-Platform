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
    llm_model: str = "gemini-1.5-flash"

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
