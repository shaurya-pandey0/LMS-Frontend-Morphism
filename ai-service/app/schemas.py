"""Pydantic schemas — the strict contract for every boundary of the service.

Three layers are validated:
  1. Inbound requests  -> FastAPI validates against the *Request models.
  2. Raw LLM output    -> validated against the Ai* models before use; any
                          deviation raises ValidationError and triggers the
                          deterministic rule-based fallback.
  3. Outbound responses-> the *Response models returned to the caller.
"""

from __future__ import annotations

from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class Severity(str, Enum):
    POSITIVE = "positive"
    WARNING = "warning"
    INFO = "info"


class ContextMode(str, Enum):
    FULL = "full"
    LOCAL_VECTOR = "local_vector"


class InsightCategory(str, Enum):
    SLEEP = "SLEEP"
    SPENDING = "SPENDING"
    HABITS = "HABITS"
    HYDRATION = "HYDRATION"
    MOOD = "MOOD"
    GENERAL = "GENERAL"


# ---------------------------------------------------------------------------
# Shared domain objects
# ---------------------------------------------------------------------------
class Insight(BaseModel):
    """A single insight. Used both for LLM output and the public response."""

    model_config = ConfigDict(extra="ignore", use_enum_values=True)

    category: InsightCategory = InsightCategory.GENERAL
    severity: Severity = Severity.INFO
    title: str = Field(min_length=1, max_length=120)
    message: str = Field(min_length=1, max_length=600)

    @field_validator("category", mode="before")
    @classmethod
    def _coerce_category(cls, v):
        if isinstance(v, str):
            v = v.strip().upper()
            if v not in InsightCategory.__members__ and v not in {c.value for c in InsightCategory}:
                return InsightCategory.GENERAL.value
        return v

    @field_validator("severity", mode="before")
    @classmethod
    def _coerce_severity(cls, v):
        if isinstance(v, str):
            v = v.strip().lower()
            if v not in {s.value for s in Severity}:
                return Severity.INFO.value
        return v


class LifestyleContext(BaseModel):
    """Aggregated, anonymised lifestyle data supplied by the caller (Spring
    backend or frontend). This is the grounding 'retrieval' for insights/chat."""

    model_config = ConfigDict(extra="ignore")

    period_days: int = Field(default=7, ge=1, le=366)
    avg_sleep_hours: Optional[float] = Field(default=None, ge=0, le=24)
    min_sleep_hours: float = Field(default=6.0, ge=0, le=24)
    good_sleep_hours: float = Field(default=7.5, ge=0, le=24)
    weekly_spend: Optional[float] = Field(default=None, ge=0)
    spend_threshold: float = Field(default=1000.0, ge=0)
    expenses_by_category: Dict[str, float] = Field(default_factory=dict)
    avg_water_ml: Optional[float] = Field(default=None, ge=0)
    min_water_ml: float = Field(default=2000.0, ge=0)
    habit_consistency: Optional[float] = Field(default=None, ge=0, le=1)
    habit_consistency_threshold: float = Field(default=0.5, ge=0, le=1)
    mood_counts: Dict[str, int] = Field(default_factory=dict)
    journal_excerpts: List[str] = Field(default_factory=list, max_length=20)
    notes: Optional[str] = Field(default=None, max_length=2000)


# ---------------------------------------------------------------------------
# /insights
# ---------------------------------------------------------------------------
class InsightsRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_name: Optional[str] = Field(default=None, max_length=120)
    context: LifestyleContext
    model: Optional[str] = Field(default=None, description="Override the configured model")
    use_ai: bool = True


class InsightsResponse(BaseModel):
    source: str  # "ai" | "rules"
    model: Optional[str] = None
    insights: List[Insight]


class AiInsightList(BaseModel):
    """Exact shape the LLM must return for /insights."""

    model_config = ConfigDict(extra="ignore")
    insights: List[Insight] = Field(default_factory=list, max_length=12)


# ---------------------------------------------------------------------------
# /chat
# ---------------------------------------------------------------------------
class Role(str, Enum):
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"


class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="forbid", use_enum_values=True)

    role: Role
    content: str = Field(min_length=1, max_length=8000)


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    query: str = Field(min_length=1, max_length=4000)
    context: Optional[LifestyleContext] = None
    history: List[ChatMessage] = Field(default_factory=list, max_length=20)
    model: Optional[str] = None
    user_name: Optional[str] = Field(default=None, max_length=120)
    # Retrieval strategy. None -> use the service default (AI_RETRIEVAL_MODE).
    context_mode: Optional[ContextMode] = None
    # Required when context_mode == local_vector: identifies the user's store.
    user_key: Optional[str] = Field(default=None, max_length=200)


class AiChatReply(BaseModel):
    """Exact shape the LLM must return for /chat."""

    model_config = ConfigDict(extra="ignore")
    reply: str = Field(min_length=1, max_length=4000)
    suggestions: List[str] = Field(default_factory=list, max_length=5)


class ChatResponse(BaseModel):
    source: str  # "ai" | "fallback"
    model: Optional[str] = None
    reply: str
    suggestions: List[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# /models  &  /health
# ---------------------------------------------------------------------------
class ModelsResponse(BaseModel):
    provider: str
    base_url: str
    default_model: Optional[str] = None
    models: List[str] = Field(default_factory=list)


class HealthResponse(BaseModel):
    status: str = "UP"
    provider: str
    base_url: str
    default_model: Optional[str] = None


# ---------------------------------------------------------------------------
# Vector store (local embeddings + TurboVec)
# ---------------------------------------------------------------------------
class JournalRecord(BaseModel):
    """A journal entry to embed and index."""

    model_config = ConfigDict(extra="ignore")

    id: str = Field(min_length=1, max_length=128)
    text: str = Field(min_length=1, max_length=20000)
    date: Optional[str] = Field(default=None, max_length=32)
    mood: Optional[str] = Field(default=None, max_length=40)


class VectorUpsertRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_key: str = Field(min_length=1, max_length=200)
    records: List[JournalRecord] = Field(min_length=1, max_length=500)
    model: Optional[str] = Field(default=None, description="Override embedding model")


class VectorUpsertResponse(BaseModel):
    user_key_hash: str
    upserted: int
    total: int
    dim: int
    backend: str


class VectorSearchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_key: str = Field(min_length=1, max_length=200)
    query: str = Field(min_length=1, max_length=4000)
    k: int = Field(default=5, ge=1, le=50)
    model: Optional[str] = None


class VectorHit(BaseModel):
    id: str
    score: float
    date: Optional[str] = None
    mood: Optional[str] = None
    snippet: str


class VectorSearchResponse(BaseModel):
    user_key_hash: str
    backend: str
    hits: List[VectorHit] = Field(default_factory=list)


class VectorDeleteResponse(BaseModel):
    user_key_hash: str
    deleted: bool


# ---------------------------------------------------------------------------
# /command
# ---------------------------------------------------------------------------
class CommandTarget(str, Enum):
    CHAT = "chat"
    EXPENSE = "expense"
    DAILY_LOG = "daily_log"


class CommandStatus(str, Enum):
    SUCCESS = "success"
    CLARIFICATION_NEEDED = "clarification_needed"
    ERROR = "error"


class CommandRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    target: CommandTarget
    text: str = Field(min_length=1, max_length=4000)
    date: str = Field(min_length=1, max_length=32, description="User's PC-local date (YYYY-MM-DD)")
    history: Optional[List[ChatMessage]] = Field(default_factory=list, description="Recent conversation turns")
    model: Optional[str] = Field(default=None, description="Override LLM model")


class ExtractedExpensePayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    date: Optional[str] = Field(default=None, description="Date in YYYY-MM-DD format")
    category: Optional[str] = Field(default=None, description="Category name e.g. Food, Transport, Utilities, etc.")
    amount: Optional[float] = Field(default=None, gt=0, description="Expense amount (strictly positive)")


class ExtractedMeal(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, description="Meal name e.g. Breakfast, Lunch, High Tea, Dinner, Snacks, Brunch")
    items: List[str] = Field(default_factory=list, description="Food items")


class ExtractedDailyLogPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    date: Optional[str] = Field(default=None, description="Date in YYYY-MM-DD format")
    sleepHours: Optional[float] = Field(default=None, ge=0, le=24)
    stepTarget: Optional[int] = Field(default=None, gt=0)
    waterIntake: Optional[float] = Field(default=None, ge=0)
    sleepQuality: Optional[int] = Field(default=None, ge=1, le=5)
    stressLevel: Optional[int] = Field(default=None, ge=1, le=5)
    energyLevel: Optional[int] = Field(default=None, ge=1, le=5)
    productivityLevel: Optional[int] = Field(default=None, ge=1, le=5)
    dayType: Optional[str] = Field(default=None, description="STUDY_WORK, DAY_OFF, TRAVEL, SICK, UNUSUAL")
    transactionalHabits: Optional[List[str]] = Field(default=None)
    embeddedHabits: Optional[List[str]] = Field(default=None)
    meals: Optional[List[ExtractedMeal]] = Field(default=None)
    morningMood: Optional[str] = Field(default=None)
    afternoonMood: Optional[str] = Field(default=None)
    eveningMood: Optional[str] = Field(default=None)


class CommandResponse(BaseModel):
    target: CommandTarget
    status: CommandStatus
    payload: Optional[Dict] = None
    message: str
