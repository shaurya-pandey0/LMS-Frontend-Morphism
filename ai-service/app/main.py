"""LifeTrack AI microservice (FastAPI).

Standalone, provider-agnostic service exposing:
  GET    /health           – service + provider info
  GET    /models           – list models available on the configured provider
  POST   /insights         – LLM insights, Pydantic-validated, rule fallback
  POST   /chat             – grounded assistant chat (full or local_vector mode)
  POST   /vectors/upsert   – embed + index a user's journal entries (local)
  POST   /vectors/search   – semantic search over a user's local index
  DELETE /vectors/{user_key} – drop a user's local store

Swap provider/key/model via environment variables (see app/config.py).
"""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .embeddings import EmbeddingClient, EmbeddingError
from .llm_client import LlmClient, LlmError
from .prompts import (
    build_chat_messages,
    build_daily_log_command_messages,
    build_expense_command_messages,
    build_insights_messages,
)
from .rules import rule_based_insights
from .schemas import (
    AiChatReply,
    AiInsightList,
    ChatRequest,
    ChatResponse,
    CommandRequest,
    CommandResponse,
    CommandStatus,
    CommandTarget,
    ContextMode,
    ExtractedDailyLogPayload,
    ExtractedExpenseList,
    ExtractedExpensePayload,
    HealthResponse,
    InsightsRequest,
    InsightsResponse,
    ModelsResponse,
    VectorDeleteResponse,
    VectorSearchRequest,
    VectorSearchResponse,
    VectorUpsertRequest,
    VectorUpsertResponse,
)
from .vector import index as vindex
from .vector.retrieval import retrieve_context
from .vector.store import UserStoreManager
import re

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("lifetrack.ai")

settings = get_settings()
app = FastAPI(title="LifeTrack AI Service", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Shared singletons.
store_manager = UserStoreManager(settings)


def _client() -> LlmClient:
    return LlmClient(settings)


def _embeddings() -> EmbeddingClient:
    return EmbeddingClient(settings)


def _resolve_model(override: str | None) -> str:
    return override or settings.ai_model or ""


# ---------------------------------------------------------------------------
# Meta
# ---------------------------------------------------------------------------
@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(
        status="UP",
        provider=settings.provider,
        base_url=settings.base_url,
        default_model=settings.ai_model,
    )


@app.get("/models", response_model=ModelsResponse)
async def models() -> ModelsResponse:
    try:
        available = await _client().list_models()
    except LlmError as exc:
        logger.warning("Could not fetch models: %s", exc)
        available = []
    return ModelsResponse(
        provider=settings.provider,
        base_url=settings.base_url,
        default_model=settings.ai_model,
        models=available,
    )


# ---------------------------------------------------------------------------
# Insights
# ---------------------------------------------------------------------------
@app.post("/insights", response_model=InsightsResponse)
async def insights(req: InsightsRequest) -> InsightsResponse:
    model = _resolve_model(req.model)

    if req.use_ai and model:
        try:
            messages = build_insights_messages(req.context, req.user_name)
            ai = await _client().structured(messages, AiInsightList, model=model)
            if ai.insights:
                return InsightsResponse(source="ai", model=model, insights=ai.insights)
            logger.info("AI returned no insights; using rule-based fallback")
        except LlmError as exc:
            logger.warning("Insights AI call failed, falling back to rules: %s", exc)

    return InsightsResponse(source="rules", model=None, insights=rule_based_insights(req.context))


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------
@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    model = _resolve_model(req.model)

    mode = req.context_mode or ContextMode(settings.ai_retrieval_mode)
    context = req.context

    # local_vector: build a compact, relevant context from the user's index.
    if mode == ContextMode.LOCAL_VECTOR and req.user_key:
        try:
            context, _hits = await retrieve_context(
                store_manager=store_manager,
                embeddings=_embeddings(),
                user_key=req.user_key,
                query=req.query,
                k=settings.vector_top_k,
                base_context=req.context,
                model=req.model,
            )
        except EmbeddingError as exc:
            logger.warning("Local retrieval failed (%s); using supplied context", exc)
            context = req.context
    elif mode == ContextMode.LOCAL_VECTOR and not req.user_key:
        logger.info("context_mode=local_vector but no user_key provided; using full context")

    if model:
        try:
            messages = build_chat_messages(req.query, req.history, context, req.user_name)
            ai = await _client().structured(messages, AiChatReply, model=model)
            return ChatResponse(source="ai", model=model, reply=ai.reply, suggestions=ai.suggestions)
        except LlmError as exc:
            logger.warning("Chat AI call failed, returning fallback: %s", exc)

    if context is not None:
        tips = rule_based_insights(context)
        summary = " ".join(f"{t.title}: {t.message}" for t in tips[:3])
        reply = (
            "The AI assistant is unavailable right now, but here's what your "
            f"recent data shows — {summary}"
        )
    else:
        reply = (
            "The AI assistant is unavailable right now, and no lifestyle context "
            "was provided. Please try again shortly."
        )
    return ChatResponse(source="fallback", model=None, reply=reply, suggestions=[])


# ---------------------------------------------------------------------------
# Vector store (local embeddings + TurboVec)
# ---------------------------------------------------------------------------
@app.post("/vectors/upsert", response_model=VectorUpsertResponse)
async def vectors_upsert(req: VectorUpsertRequest) -> VectorUpsertResponse:
    key_hash, store = await store_manager.get_or_create(req.user_key)
    model = req.model or settings.embedding_model
    async with store.lock:
        vectors = await _embeddings().embed([r.text for r in req.records], model=model)
        upserted = store.upsert(req.records, vectors, model=model)
        return VectorUpsertResponse(
            user_key_hash=key_hash,
            upserted=upserted,
            total=store.count,
            dim=store.dim,
            backend=store.backend,
        )


@app.post("/vectors/search", response_model=VectorSearchResponse)
async def vectors_search(req: VectorSearchRequest) -> VectorSearchResponse:
    key_hash, store = await store_manager.get_or_create(req.user_key)
    query_vec = await _embeddings().embed_one(req.query, model=req.model)
    hits = store.search(query_vec, req.k)
    return VectorSearchResponse(
        user_key_hash=key_hash,
        backend=store.backend or vindex.resolve_backend(settings.vector_backend),
        hits=hits,
    )


@app.delete("/vectors/{user_key}", response_model=VectorDeleteResponse)
async def vectors_delete(user_key: str) -> VectorDeleteResponse:
    key_hash, deleted = await store_manager.delete(user_key)
    return VectorDeleteResponse(user_key_hash=key_hash, deleted=deleted)


# ---------------------------------------------------------------------------
# Command Mode (Expense & Daily Log Extraction)
# ---------------------------------------------------------------------------
# Keyword table for the no-LLM path only. The LLM path reasons from the category
# descriptions in prompts.py instead, so new phrasings do not need an entry here.
_RULE_CATEGORY_KEYWORDS = {
    "food": "Food", "ate": "Food", "eat": "Food", "lunch": "Food", "dinner": "Food",
    "breakfast": "Food", "meal": "Food", "groceries": "Food", "coffee": "Food",
    "house": "Housing", "housing": "Housing", "rent": "Housing", "landlord": "Housing",
    "utilities": "Housing", "bills": "Housing", "electric": "Housing", "water": "Housing",
    "travel": "Travel", "transport": "Travel", "cab": "Travel", "bus": "Travel",
    "train": "Travel", "flight": "Travel", "taxi": "Travel", "gas": "Travel", "fuel": "Travel",
    "wellness": "Wellness", "health": "Wellness", "doctor": "Wellness",
    "medicine": "Wellness", "pharmacy": "Wellness", "gym": "Wellness",
}

_AMOUNT_RE = re.compile(r"(?:₹|rs\.?|rupees?|\$)?\s*(\d+(?:\.\d{1,2})?)", re.IGNORECASE)
# Splits "ate 500 and sent 344 to the house owner" into independent clauses.
_CLAUSE_SPLIT_RE = re.compile(r"\s*(?:,|;|&|\band\b|\balso\b|\bplus\b|\bthen\b)\s*", re.IGNORECASE)


def _first_amount(text: str) -> float | None:
    m = _AMOUNT_RE.search(text)
    if not m:
        return None
    try:
        val = float(m.group(1))
        return val if val > 0 else None
    except ValueError:
        return None


def _keyword_category(text: str, allowed: list[str]) -> str | None:
    lower = text.lower()
    allowed_lower = {c.lower(): c for c in allowed}
    for keyword, category in _RULE_CATEGORY_KEYWORDS.items():
        if keyword in lower and category.lower() in allowed_lower:
            return allowed_lower[category.lower()]
    return None


def _rule_extract_expenses(text: str, default_date: str, allowed: list[str]) -> list[ExtractedExpensePayload]:
    """Deterministic fallback for when no model is configured or the call fails.

    Splits the message into clauses so a multi-expense sentence still yields
    multiple drafts, matching the LLM path's cardinality.
    """
    clauses = [c for c in _CLAUSE_SPLIT_RE.split(text) if c and c.strip()]
    found: list[ExtractedExpensePayload] = []
    for clause in clauses:
        amount = _first_amount(clause)
        if amount is None:
            continue
        found.append(ExtractedExpensePayload(
            date=default_date,
            category=_keyword_category(clause, allowed),
            amount=amount,
        ))

    if found:
        return found

    # No clause carried an amount; try the message as a whole.
    amount = _first_amount(text)
    return [ExtractedExpensePayload(
        date=default_date,
        category=_keyword_category(text, allowed),
        amount=amount,
    )]


def _rule_extract_daily_log(text: str, default_date: str) -> ExtractedDailyLogPayload:
    lower = text.lower()
    sleep = None
    m_sleep = re.search(r"(\d+(?:\.\d)?)\s*(?:hrs?|hours?)\s*(?:of\s*sleep)?", lower)
    if m_sleep:
        try:
            sleep = float(m_sleep.group(1))
        except ValueError:
            pass

    sleep_quality = None
    if "slept well" in lower or "slept good" in lower:
        sleep_quality = 4
    elif "slept great" in lower or "slept amazingly" in lower:
        sleep_quality = 5
    elif "slept okay" in lower or "decent sleep" in lower:
        sleep_quality = 3
    elif "slept bad" in lower or "slept poorly" in lower:
        sleep_quality = 2

    water = None
    m_water_ml = re.search(r"(\d+)\s*(?:ml|milliliters)", lower)
    if m_water_ml:
        try:
            water = float(m_water_ml.group(1))
        except ValueError:
            pass
    else:
        m_water_l = re.search(r"(\d+(?:\.\d)?)\s*(?:l|liters?)\b", lower)
        if m_water_l:
            try:
                water = float(m_water_l.group(1)) * 1000.0
            except ValueError:
                pass
        else:
            m_glasses = re.search(r"(\d+)\s*(?:glasses|cups)\b", lower)
            if m_glasses:
                try:
                    water = float(m_glasses.group(1)) * 250.0
                except ValueError:
                    pass

    steps = None
    m_steps_k = re.search(r"(\d+(?:\.\d)?)\s*k\s*(?:steps)?", lower)
    if m_steps_k:
        try:
            steps = int(float(m_steps_k.group(1)) * 1000)
        except ValueError:
            pass
    else:
        m_steps_num = re.search(r"(\d{1,3}(?:,\d{3})+|\d+)\s*steps", lower)
        if m_steps_num:
            try:
                steps = int(m_steps_num.group(1).replace(",", ""))
            except ValueError:
                pass
        else:
            m_dist_m = re.search(r"(\d+(?:\.\d)?)\s*(?:meters?|metres?|m)\b", lower)
            if m_dist_m:
                try:
                    meters = float(m_dist_m.group(1))
                    steps = int(meters * 1.31)
                except ValueError:
                    pass
            else:
                m_dist_km = re.search(r"(\d+(?:\.\d)?)\s*(?:km|kilometers?|kilometres?)\b", lower)
                if m_dist_km:
                    try:
                        km = float(m_dist_km.group(1))
                        steps = int(km * 1310)
                    except ValueError:
                        pass
                else:
                    m_dist_mi = re.search(r"(\d+(?:\.\d)?)\s*(?:miles?|mi)\b", lower)
                    if m_dist_mi:
                        try:
                            miles = float(m_dist_mi.group(1))
                            steps = int(miles * 2100)
                        except ValueError:
                            pass

    evening_mood = None
    if "feel good" in lower or "feeling good" in lower or "good today" in lower:
        evening_mood = "good"
    elif "feel happy" in lower or "feel great" in lower or "feeling great" in lower or "feeling happy" in lower:
        evening_mood = "great"
    elif "feel okay" in lower or "feeling okay" in lower or "okayish" in lower:
        evening_mood = "okay"
    elif "feel anxious" in lower or "feel tired" in lower or "feeling tired" in lower:
        evening_mood = "meh"

    return ExtractedDailyLogPayload(
        date=default_date,
        sleepHours=sleep,
        sleepQuality=sleep_quality,
        stepTarget=steps,
        waterIntake=water,
        eveningMood=evening_mood,
    )


VALID_DAILY_MOODS = {"great", "good", "okay", "meh", "bad"}
MOOD_MAPPING = {
    "happy": "great",
    "grateful": "great",
    "awesome": "great",
    "amazing": "great",
    "calm": "good",
    "content": "good",
    "fine": "okay",
    "okayish": "okay",
    "anxious": "meh",
    "tired": "meh",
    "stressed": "meh",
    "sad": "bad",
    "terrible": "bad",
    "horrible": "bad",
}


def _coerce_daily_mood(v: str | None) -> str | None:
    if not v:
        return None
    cleaned = v.strip().lower()
    if cleaned in VALID_DAILY_MOODS:
        return cleaned
    return MOOD_MAPPING.get(cleaned, "okay")


def _has_daily_log_fields(p: ExtractedDailyLogPayload) -> bool:
    if not p:
        return False
    return any([
        p.sleepHours is not None,
        p.stepTarget is not None,
        p.waterIntake is not None,
        p.sleepQuality is not None,
        p.stressLevel is not None,
        p.energyLevel is not None,
        p.productivityLevel is not None,
        p.dayType is not None,
        bool(p.transactionalHabits),
        bool(p.embeddedHabits),
        bool(p.meals),
        p.morningMood is not None,
        p.afternoonMood is not None,
        p.eveningMood is not None,
    ])


@app.post("/command", response_model=CommandResponse)
async def command(req: CommandRequest) -> CommandResponse:
    model = _resolve_model(req.model)
    target = req.target

    if target == CommandTarget.CHAT:
        return CommandResponse(
            target=CommandTarget.CHAT,
            status=CommandStatus.SUCCESS,
            message="Chat mode handled via standard chat interface.",
        )

    if target == CommandTarget.EXPENSE:
        allowed = settings.expense_category_list
        fallback_category = settings.fallback_expense_category

        # One message can describe several expenses, so extraction is
        # list-shaped. A single-object schema would force the model to keep one
        # spend and silently discard the rest.
        items: list[ExtractedExpensePayload] = []
        if model:
            try:
                messages = build_expense_command_messages(
                    req.text, req.date, req.history, allowed, fallback_category
                )
                extracted = await _client().structured(messages, ExtractedExpenseList, model=model)
                items = list(extracted.expenses)
            except LlmError as exc:
                logger.warning("Expense extraction LLM call failed, using rule fallback: %s", exc)

        if not any(i.amount is not None or i.category is not None for i in items):
            items = _rule_extract_expenses(req.text, req.date, allowed)

        drafts: list[dict] = []
        seen: set[tuple] = set()
        for item in items:
            amount = item.amount if (item.amount and item.amount > 0) else None
            if amount is None:
                continue

            category = (item.category or "").strip()
            if category:
                matched = next((c for c in allowed if c.lower() == category.lower()), None)
                if matched is None:
                    # Spring would reject this value, so map it rather than 400 later.
                    logger.info("Model returned unknown category %r; using %r", category, fallback_category)
                category = matched or fallback_category
            else:
                category = fallback_category

            date = (item.date or "").strip() or req.date

            key = (date, category, amount)
            if key in seen:
                continue  # guard against the model repeating an entry
            seen.add(key)
            drafts.append({"date": date, "category": category, "amount": amount})

        # Two-turn flow: "spent on food" then "500". Only safe when a single
        # expense is on the table, otherwise one amount would be stamped on all.
        if not drafts and len(items) <= 1 and req.history:
            for turn in reversed(req.history):
                recovered = _first_amount(turn.content)
                if recovered is not None:
                    lone = items[0] if items else None
                    category = (lone.category or "").strip() if lone else ""
                    matched = next((c for c in allowed if c.lower() == category.lower()), None)
                    drafts.append({
                        "date": req.date,
                        "category": matched or fallback_category,
                        "amount": recovered,
                    })
                    break

        if not drafts:
            return CommandResponse(
                target=CommandTarget.EXPENSE,
                status=CommandStatus.CLARIFICATION_NEEDED,
                payload=None,
                payloads=[],
                message="Please specify the missing expense amount (e.g. ₹500).",
            )

        if len(drafts) == 1:
            d = drafts[0]
            message = (
                f"I've prepared an expense draft of ₹{d['amount']:.2f} for "
                f"'{d['category']}' on {d['date']}. Please review and confirm below."
            )
        else:
            summary = ", ".join(f"₹{d['amount']:.2f} for '{d['category']}'" for d in drafts)
            message = (
                f"I found {len(drafts)} expenses in that message: {summary}. "
                "Review and confirm each one below."
            )

        return CommandResponse(
            target=CommandTarget.EXPENSE,
            status=CommandStatus.SUCCESS,
            payload=drafts[0],
            payloads=drafts,
            message=message,
        )

    if target == CommandTarget.DAILY_LOG:
        extracted_log: ExtractedDailyLogPayload | None = None
        if model:
            try:
                messages = build_daily_log_command_messages(req.text, req.date, req.history)
                extracted_log = await _client().structured(messages, ExtractedDailyLogPayload, model=model)
            except LlmError as exc:
                logger.warning("Daily Log extraction LLM call failed, using rule fallback: %s", exc)

        if extracted_log is None or not _has_daily_log_fields(extracted_log):
            extracted_log = _rule_extract_daily_log(req.text, req.date)

        if extracted_log is None or not _has_daily_log_fields(extracted_log):
            return CommandResponse(
                target=CommandTarget.DAILY_LOG,
                status=CommandStatus.CLARIFICATION_NEEDED,
                payload=None,
                message="I couldn't identify any daily log details from your message. Please specify metrics like sleep hours, step target, water intake, moods, or meals.",
            )

        date = (extracted_log.date.strip() if (extracted_log.date and extracted_log.date.strip()) else None) or req.date
        payload = {"date": date}

        if extracted_log.sleepHours is not None and 0 <= extracted_log.sleepHours <= 24:
            payload["sleepHours"] = extracted_log.sleepHours
        if extracted_log.stepTarget is not None and extracted_log.stepTarget > 0:
            payload["stepTarget"] = extracted_log.stepTarget
        if extracted_log.waterIntake is not None and extracted_log.waterIntake >= 0:
            payload["waterIntake"] = extracted_log.waterIntake
        if extracted_log.sleepQuality is not None and 1 <= extracted_log.sleepQuality <= 5:
            payload["sleepQuality"] = extracted_log.sleepQuality
        if extracted_log.stressLevel is not None and 1 <= extracted_log.stressLevel <= 5:
            payload["stressLevel"] = extracted_log.stressLevel
        if extracted_log.energyLevel is not None and 1 <= extracted_log.energyLevel <= 5:
            payload["energyLevel"] = extracted_log.energyLevel
        if extracted_log.productivityLevel is not None and 1 <= extracted_log.productivityLevel <= 5:
            payload["productivityLevel"] = extracted_log.productivityLevel
        if extracted_log.dayType and extracted_log.dayType.upper() in {"STUDY_WORK", "DAY_OFF", "TRAVEL", "SICK", "UNUSUAL"}:
            payload["dayType"] = extracted_log.dayType.upper()
        if extracted_log.transactionalHabits:
            payload["transactionalHabits"] = [h for h in extracted_log.transactionalHabits if h and h.strip()]
        if extracted_log.embeddedHabits:
            payload["embeddedHabits"] = [h for h in extracted_log.embeddedHabits if h and h.strip()]
        if extracted_log.meals:
            payload["meals"] = [{"name": m.name, "items": m.items} for m in extracted_log.meals if m and m.name]
        m_mood = _coerce_daily_mood(extracted_log.morningMood)
        if m_mood:
            payload["morningMood"] = m_mood
        a_mood = _coerce_daily_mood(extracted_log.afternoonMood)
        if a_mood:
            payload["afternoonMood"] = a_mood
        e_mood = _coerce_daily_mood(extracted_log.eveningMood)
        if e_mood:
            payload["eveningMood"] = e_mood

        note = ""
        if extracted_log.stepTarget and any(w in req.text.lower() for w in ["meter", " m ", "km", "mile"]):
            note = f" (estimated ~{extracted_log.stepTarget} steps based on distance)"

        # Always exactly one: a daily log is merged per date, not appended, so
        # several mentions of the same day collapse into a single draft.
        return CommandResponse(
            target=CommandTarget.DAILY_LOG,
            status=CommandStatus.SUCCESS,
            payload=payload,
            payloads=[payload],
            message=f"I've prepared a daily log draft for {date}{note}. Please review and confirm below.",
        )

    return CommandResponse(
        target=target,
        status=CommandStatus.ERROR,
        message="Unknown target mode.",
    )
