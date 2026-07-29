"""Local embedding client.

Calls the provider's OpenAI-compatible ``POST /v1/embeddings`` endpoint. With
LM Studio this runs the locally-hosted Nomic model (``text-embedding-nomic``),
so journal text never leaves the machine. The response is validated with
Pydantic before any vector is used.
"""

from __future__ import annotations

import logging
from typing import List, Optional

import httpx
from pydantic import BaseModel, ConfigDict, ValidationError

from .config import Settings

logger = logging.getLogger("lifetrack.ai.embeddings")


class EmbeddingError(RuntimeError):
    pass


class _EmbeddingItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    embedding: List[float]
    index: int = 0


class _EmbeddingResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    data: List[_EmbeddingItem]


class EmbeddingClient:
    def __init__(self, settings: Settings):
        self._settings = settings
        self._base_url = settings.base_url
        self._headers = {
            "Authorization": f"Bearer {settings.api_key}",
            "Content-Type": "application/json",
        }

    async def embed(self, texts: List[str], model: Optional[str] = None) -> List[List[float]]:
        if not texts:
            return []
        url = f"{self._base_url}/embeddings"
        body = {"model": model or self._settings.embedding_model, "input": texts}
        try:
            async with httpx.AsyncClient(timeout=self._settings.ai_timeout_seconds) as client:
                resp = await client.post(url, headers=self._headers, json=body)
                resp.raise_for_status()
                payload = resp.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise EmbeddingError(f"Embedding request failed at {url}: {exc}") from exc

        try:
            parsed = _EmbeddingResponse.model_validate(payload)
        except ValidationError as exc:
            raise EmbeddingError(f"Embedding response failed validation: {exc}") from exc

        # Preserve input order.
        ordered = sorted(parsed.data, key=lambda d: d.index)
        return [item.embedding for item in ordered]

    async def embed_one(self, text: str, model: Optional[str] = None) -> List[float]:
        vectors = await self.embed([text], model=model)
        if not vectors:
            raise EmbeddingError("No embedding returned")
        return vectors[0]
