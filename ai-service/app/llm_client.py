"""Provider-agnostic OpenAI-compatible LLM client.

Works against LM Studio, OpenAI, Mistral and Gemini (OpenAI-compat endpoint).
Every call that expects structured data requests JSON from the model and
validates it against a Pydantic schema, so nothing unvalidated is ever returned
to the rest of the service.

Providers disagree on how to constrain output, so the client negotiates the
structured-output mode automatically:

    json_schema  -> LM Studio (current), OpenAI structured outputs, Mistral, Gemini
    json_object  -> OpenAI / Mistral JSON mode, older runtimes
    none         -> prompt-only; rely on extraction + Pydantic validation

The first mode the provider accepts (no HTTP 400) is cached for the process.
"""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import List, Optional, Type, TypeVar

import httpx
from pydantic import BaseModel, ValidationError

from .config import Settings
from .schemas import ChatMessage

logger = logging.getLogger("lifetrack.ai.client")

T = TypeVar("T", bound=BaseModel)

# Cached structured-output mode that the configured provider accepts.
_WORKING_MODE: Optional[str] = None

# ai-service/prompt.md lives two levels up from this file (app/ -> ai-service/)
_PROMPT_FILE = Path(__file__).parent.parent / "prompt.md"


def _dump_prompt(body: dict) -> None:
    """Write the exact serialized request body to prompt.md, overwriting it each time."""
    try:
        _PROMPT_FILE.write_text(json.dumps(body), encoding="utf-8")
    except OSError:
        pass  # Never block a real LLM call due to file I/O errors


class LlmError(RuntimeError):
    """Raised when the provider call fails or returns unusable content."""


class LlmBadRequest(LlmError):
    """HTTP 400 — usually an unsupported parameter; safe to retry differently."""


class LlmClient:
    def __init__(self, settings: Settings):
        self._settings = settings
        self._base_url = settings.base_url
        self._headers = {
            "Authorization": f"Bearer {settings.api_key}",
            "Content-Type": "application/json",
        }

    # -- raw provider calls ---------------------------------------------------
    async def list_models(self) -> List[str]:
        url = f"{self._base_url}/models"
        try:
            async with httpx.AsyncClient(timeout=self._settings.ai_timeout_seconds) as client:
                resp = await client.get(url, headers=self._headers)
                resp.raise_for_status()
                payload = resp.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise LlmError(f"Failed to list models from {url}: {exc}") from exc

        data = payload.get("data", payload) if isinstance(payload, dict) else payload
        models: List[str] = []
        if isinstance(data, list):
            for item in data:
                if isinstance(item, dict) and item.get("id"):
                    models.append(str(item["id"]))
                elif isinstance(item, str):
                    models.append(item)
        return models

    async def _chat_completion(self, messages: List[dict], model: str, response_format: Optional[dict]) -> str:
        url = f"{self._base_url}/chat/completions"
        body = {
            "model": model,
            "messages": messages,
            "temperature": self._settings.ai_temperature,
            "max_tokens": self._settings.ai_max_tokens,
            "stream": False,
        }
        if response_format is not None:
            body["response_format"] = response_format

        try:
            async with httpx.AsyncClient(timeout=self._settings.ai_timeout_seconds) as client:
                _dump_prompt(body)
                resp = await client.post(url, headers=self._headers, json=body)
        except httpx.HTTPError as exc:
            raise LlmError(f"Chat completion request failed at {url}: {exc}") from exc

        if resp.status_code == 400:
            raise LlmBadRequest(f"400 from {url}: {resp.text[:300]}")
        try:
            resp.raise_for_status()
            payload = resp.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise LlmError(f"Chat completion failed at {url}: {exc}") from exc

        try:
            return payload["choices"][0]["message"]["content"] or ""
        except (KeyError, IndexError, TypeError) as exc:
            raise LlmError(f"Unexpected completion response shape: {exc}") from exc

    # -- structured (Pydantic-validated) call ---------------------------------
    async def structured(self, messages: List[ChatMessage], schema: Type[T], model: str) -> T:
        """Call the model and validate its JSON output against ``schema``.

        Negotiates the structured-output mode the provider supports, then
        validates the parsed JSON. Raises :class:`LlmError` on any failure so
        the caller can fall back to deterministic rules.
        """
        global _WORKING_MODE
        dumped = [m.model_dump() for m in messages]

        last_error: Optional[LlmError] = None
        for mode in self._candidate_modes():
            response_format = self._build_response_format(mode, schema)
            try:
                raw = await self._chat_completion(dumped, model=model, response_format=response_format)
            except LlmBadRequest as exc:
                logger.info("Provider rejected json mode '%s' (%s); trying next.", mode, exc)
                last_error = exc
                continue
            # Call succeeded for this mode; remember it for next time.
            _WORKING_MODE = mode
            data = _extract_json(raw)
            if data is None:
                raise LlmError("Model did not return parseable JSON")
            try:
                return schema.model_validate(data)
            except ValidationError as exc:
                logger.warning("LLM output failed schema validation: %s", exc)
                raise LlmError(f"LLM output failed schema validation: {exc}") from exc

        raise last_error or LlmError("No usable structured-output mode")

    def _candidate_modes(self) -> List[str]:
        configured = (self._settings.ai_json_mode or "auto").strip().lower()
        if configured != "auto":
            return [configured]
        order = ["json_schema", "json_object", "none"]
        if _WORKING_MODE in order:
            # Put the known-good mode first.
            order.remove(_WORKING_MODE)
            order.insert(0, _WORKING_MODE)
        return order

    @staticmethod
    def _build_response_format(mode: str, schema: Type[BaseModel]) -> Optional[dict]:
        if mode == "json_object":
            return {"type": "json_object"}
        if mode == "json_schema":
            return {
                "type": "json_schema",
                "json_schema": {
                    "name": schema.__name__,
                    "strict": False,
                    "schema": _grammar_safe_schema(schema.model_json_schema()),
                },
            }
        return None  # "none"


def _extract_json(text: str):
    """Best-effort extraction of a JSON object from a model response."""
    if not text:
        return None
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.IGNORECASE).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{.*\}", text, flags=re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            return None
    return None


# Constraints that bloat a GBNF grammar (e.g. maxLength -> char{1,N}). llama.cpp
# rejects large repetition counts ("number of repetitions exceeds sane
# defaults"), which silently disables structured output. We keep the *shape*
# in the grammar and rely on Pydantic to enforce these limits on our side.
_GRAMMAR_UNSAFE_KEYS = {
    "minLength", "maxLength", "pattern",
    "minItems", "maxItems",
    "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "multipleOf",
}


def _grammar_safe_schema(node):
    """Recursively strip length/count/range constraints from a JSON schema."""
    if isinstance(node, dict):
        return {
            k: _grammar_safe_schema(v)
            for k, v in node.items()
            if k not in _GRAMMAR_UNSAFE_KEYS
        }
    if isinstance(node, list):
        return [_grammar_safe_schema(v) for v in node]
    return node
