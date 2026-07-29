"""Configuration for the LifeTrack AI microservice.

The service talks to any OpenAI-compatible chat-completions API. Switching
providers is purely a matter of changing the base URL + API key (+ model):

    Provider    Default base URL
    --------    ----------------------------------------------------------
    lmstudio    http://localhost:1234/v1
    openai      https://api.openai.com/v1
    mistral     https://api.mistral.ai/v1
    gemini      https://generativelanguage.googleapis.com/v1beta/openai

All four expose ``GET /models`` and ``POST /chat/completions``, so the same
client code works against every one of them.
"""

from __future__ import annotations

import os
from functools import lru_cache
from typing import List, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict

_DEFAULT_BASE_URLS = {
    "lmstudio": "http://localhost:1234/v1",
    "openai": "https://api.openai.com/v1",
    "mistral": "https://api.mistral.ai/v1",
    "gemini": "https://generativelanguage.googleapis.com/v1beta/openai",
}


class Settings(BaseSettings):
    # Provider selection. Drives the default base URL when AI_BASE_URL is unset.
    ai_provider: str = "lmstudio"

    # Explicit overrides (take precedence over provider defaults).
    ai_base_url: Optional[str] = None
    ai_api_key: Optional[str] = None
    ai_model: Optional[str] = None

    # Fallback key name matching the repo's existing root .env.
    api_key_lm_studio: Optional[str] = None

    ai_temperature: float = 0.4
    ai_timeout_seconds: float = 60.0
    ai_max_tokens: int = 800

    # How to request structured output from the provider:
    #   auto        -> try json_schema, then json_object, then plain (recommended)
    #   json_schema -> OpenAI structured outputs / LM Studio structured output
    #   json_object -> OpenAI/Mistral JSON mode
    #   none        -> rely on the prompt only; validate the parsed result
    ai_json_mode: str = "auto"

    # --- Retrieval / local vector DB ----------------------------------------
    # Default context strategy for /chat:
    #   full         -> caller-supplied context is sent as-is (no embeddings)
    #   local_vector -> embed query locally + retrieve top-k journal snippets
    ai_retrieval_mode: str = "full"

    # Local embedding model id (as listed by GET /models on the provider).
    embedding_model: str = "text-embedding-nomic"

    # Per-user vector stores live under this directory.
    vector_data_dir: str = "./data/users"
    vector_top_k: int = 5
    vector_cache_users: int = 16            # max user indexes resident in RAM
    vector_bit_width: int = 4               # TurboQuant compression width
    vector_backend: str = "auto"            # auto | turbovec | numpy
    user_key_salt: str = "lifetrack-local"  # salts the on-disk user folder hash
    max_snippet_chars: int = 500

    # CORS origins for the React frontend (comma-separated).
    cors_allowed_origins: str = "http://localhost:5173,http://localhost:3000"

    model_config = SettingsConfigDict(
        env_file=(".env",),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # -- Derived helpers ------------------------------------------------------
    @property
    def provider(self) -> str:
        return (self.ai_provider or "lmstudio").strip().lower()

    @property
    def base_url(self) -> str:
        if self.ai_base_url:
            return self.ai_base_url.rstrip("/")
        return _DEFAULT_BASE_URLS.get(self.provider, _DEFAULT_BASE_URLS["lmstudio"]).rstrip("/")

    @property
    def api_key(self) -> str:
        # Prefer the explicit key, then the repo's existing LM Studio key var,
        # then anything in the environment. Local LM Studio may need no key.
        return (
            self.ai_api_key
            or self.api_key_lm_studio
            or os.getenv("API_KEY_LM_Studio", "")
            or "not-needed"
        )

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.cors_allowed_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
