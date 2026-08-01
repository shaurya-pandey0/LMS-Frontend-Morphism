"""Prompt construction.

The model is always asked to return a JSON object whose shape matches a
Pydantic schema. The context block is the structured 'retrieval' that grounds
both insights and chat (context-injection RAG; an optional vector DB could be
slotted in later without changing the contract).
"""

from __future__ import annotations

import json
from typing import List

from .schemas import ChatMessage, LifestyleContext, Role


def _context_block(ctx: LifestyleContext) -> str:
    payload = ctx.model_dump(exclude_none=True)
    return json.dumps(payload, ensure_ascii=False, indent=2)


INSIGHTS_SYSTEM = (
    "You are LifeTrack's lifestyle analyst. Given a user's aggregated lifestyle "
    "data, produce concise, actionable, encouraging insights.\n"
    "Return ONLY a JSON object with this exact shape:\n"
    '{ "insights": [ { "category": <one of SLEEP|SPENDING|HABITS|HYDRATION|MOOD|GENERAL>, '
    '"severity": <one of positive|warning|info>, "title": <short string>, '
    '"message": <one or two sentences> } ] }\n'
    "Rules: base every insight strictly on the provided data; do not invent "
    "numbers; emit 2-6 insights; no text outside the JSON object."
)


def build_insights_messages(ctx: LifestyleContext, user_name: str | None) -> List[ChatMessage]:
    who = f" for {user_name}" if user_name else ""
    user = (
        f"Generate lifestyle insights{who} from the last {ctx.period_days} days.\n"
        f"DATA:\n{_context_block(ctx)}"
    )
    return [
        ChatMessage(role=Role.SYSTEM, content=INSIGHTS_SYSTEM),
        ChatMessage(role=Role.USER, content=user),
    ]


CHAT_SYSTEM = (
    "You are LifeTrack's friendly lifestyle assistant. Answer the user's "
    "question using ONLY the lifestyle context provided; if the context is "
    "insufficient, say so honestly and suggest what to log. Be supportive and "
    "concise.\n"
    "Time Awareness:\n"
    "- The context includes `local_time` — the user's current local date and time.\n"
    "- Use it to give time-appropriate advice (morning routines, remaining hours "
    "in the day, meal timing, sleep schedule, etc.).\n"
    "Formatting Rules:\n"
    "- Use clean Markdown for all responses.\n"
    "- CRITICAL: Put every item in a numbered list (1., 2., 3.) or bulleted list (- ) on its OWN separate line with \\n\\n before it. NEVER collapse list items into a single line.\n"
    "- Bold key action terms or headings.\n"
    "Return ONLY a JSON object with this exact shape:\n"
    '{ "reply": <your answer as a string>, "suggestions": [ <up to 3 short '
    "follow-up questions the user might ask> ] }\n"
    "No text outside the JSON object."
)


def build_chat_messages(
    query: str,
    history: List[ChatMessage],
    ctx: LifestyleContext | None,
    user_name: str | None = None,
) -> List[ChatMessage]:
    messages: List[ChatMessage] = [ChatMessage(role=Role.SYSTEM, content=CHAT_SYSTEM)]
    if user_name:
        messages.append(ChatMessage(
            role=Role.SYSTEM,
            content=f"The user's name is {user_name}. Address them by name when natural.",
        ))
    if ctx is not None:
        messages.append(ChatMessage(
            role=Role.SYSTEM,
            content=f"LIFESTYLE CONTEXT (JSON):\n{_context_block(ctx)}",
        ))
    # Replay prior turns (already validated ChatMessage objects).
    messages.extend(history)
    messages.append(ChatMessage(role=Role.USER, content=query))
    return messages


EXPENSE_COMMAND_SYSTEM = (
    "You are LifeTrack's expense extraction assistant. Extract every expense "
    "described in the user's input.\n"
)

# What each category *means*. The model is asked to reason about the purpose of
# the spend, so it can place wording nobody anticipated ("sent money to the
# house owner") without a synonym table to maintain. Categories are
# deployment-configurable; any category without an entry here is offered to the
# model by name alone.
_CATEGORY_MEANINGS = {
    "food": "anything eaten or drunk — meals, groceries, eating out, ordering in, snacks, coffee.",
    "housing": "the cost of having somewhere to live — rent or money paid to a landlord, house owner or "
               "society, utility and electricity bills, water, maintenance, repairs, furnishings.",
    "travel": "moving from one place to another — fares, tickets, fuel, ride-hailing, parking, tolls.",
    "wellness": "health and self-care — doctors, medicines, tests, therapy, gym and fitness.",
    "misc": "use only when the purpose is genuinely unclear, or the user says they do not know or "
            "cannot remember.",
}


def _category_guide(categories: List[str]) -> str:
    lines = []
    for c in categories:
        meaning = _CATEGORY_MEANINGS.get(c.strip().lower())
        lines.append(f"   - {c}: {meaning}" if meaning else f"   - {c}")
    return "\n".join(lines)


def _expense_system(categories: List[str], fallback: str) -> str:
    return (
        EXPENSE_COMMAND_SYSTEM
        + "A single message often describes MORE THAN ONE expense. Return one entry per "
          "distinct spend.\n"
          "Rules:\n"
          "1. Base extraction on the input text and prior conversation. NEVER invent an amount.\n"
          "2. Each separate amount is normally its own expense. Do not merge two amounts into "
          "one entry, and do not split one amount across several entries.\n"
          "3. Amounts are positive numbers. Assume Indian Rupees (₹) unless stated otherwise. "
          "Omit any expense whose amount the message does not state — never emit 0 or null "
          "as an amount.\n"
          "4. Leave date null unless the message states one. Each expense may have its own date.\n"
          "5. Choose each expense's category by asking what the money was FOR, and who received "
          "it. Reason about the purpose; do not match keywords. Categories:\n"
        + _category_guide(categories)
        + f"\n6. Use exactly one of these names, spelled as shown: {', '.join(categories)}. "
          f"When the purpose is genuinely unclear, use '{fallback}'. Categorise each expense "
          "independently — one unclear item does not make the others unclear.\n"
          "7. If the message describes no spending at all, return an empty list.\n"
          "8. Return ONLY a JSON object of this exact shape:\n"
          '{ "expenses": [ { "date": <YYYY-MM-DD or null>, "category": <string>, '
          '"amount": <number> } ] }\n'
          "No text outside the JSON object.\n"
          "Example — \"paid 1200 for groceries and 8000 to my landlord\" yields two entries: "
          "one Food of 1200 and one Housing of 8000."
    )


def build_expense_command_messages(
    text: str,
    default_date: str,
    history: List[ChatMessage] | None = None,
    categories: List[str] | None = None,
    fallback_category: str = "Misc",
) -> List[ChatMessage]:
    cats = categories or ["Food", "Housing", "Travel", "Wellness", "Misc"]
    messages: List[ChatMessage] = [
        ChatMessage(role=Role.SYSTEM, content=_expense_system(cats, fallback_category))
    ]
    if history:
        messages.extend(history)
    content = f"User input: {text}\nDefault date if unspecified: {default_date}"
    messages.append(ChatMessage(role=Role.USER, content=content))
    return messages


DAILY_LOG_COMMAND_SYSTEM = (
    "You are LifeTrack's daily log extraction assistant. Your job is to extract structured partial daily log fields "
    "from the user's input text.\n"
    "Rules:\n"
    "1. Base your extraction on the provided text and prior conversation history. NEVER invent missing information or ratings.\n"
    "2. Step counts & distance conversions:\n"
    "   - Convert '5k' or '5k steps' to integer 5000, '10k steps' to 10000, '5.5k' to 5500.\n"
    "   - If user mentions distance (meters/km/miles) or asks for step estimates (e.g. '500 meters', '2 km', '3 miles', 'how many steps in 500m'): ESTIMATE AND CONVERT to steps! (Approx: 1 meter = 1.31 steps, 500m = ~655 steps, 1 km = ~1310 steps, 1 mile = ~2100 steps).\n"
    "3. Water intake & volume conversions:\n"
    "   - Convert liters to ml (e.g. '2L' or '2 liters' to 2000).\n"
    "   - Convert glasses/cups to ml (1 glass = ~250 ml, e.g. '4 glasses' = 1000, '8 glasses' = 2000).\n"
    "4. Ratings (sleepQuality, stressLevel, energyLevel, productivityLevel) must be integers between 1 and 5 if mentioned or implied (e.g. 'slept well' -> sleepQuality 4, 'slept great' -> 5, 'slept bad' -> 2), else null.\n"
    "5. dayType must be one of: STUDY_WORK, DAY_OFF, TRAVEL, SICK, UNUSUAL if mentioned, else null.\n"
    "6. Daily moods (morningMood, afternoonMood, eveningMood) MUST be strictly one of: great, good, okay, meh, bad (all lowercase). Map words like 'happy'/'grateful'/'feel good' to 'great' or 'good', 'calm' to 'good', 'anxious'/'tired' to 'meh', 'sad' to 'bad'. If general mood for today is stated ('feel good today'), map to eveningMood.\n"
    "7. Return ONLY a JSON object matching this exact shape:\n"
    '{\n'
    '  "date": <YYYY-MM-DD string or null>,\n'
    '  "sleepHours": <number or null>,\n'
    '  "stepTarget": <integer or null>,\n'
    '  "waterIntake": <number or null>,\n'
    '  "sleepQuality": <integer 1-5 or null>,\n'
    '  "stressLevel": <integer 1-5 or null>,\n'
    '  "energyLevel": <integer 1-5 or null>,\n'
    '  "productivityLevel": <integer 1-5 or null>,\n'
    '  "dayType": <string or null>,\n'
    '  "transactionalHabits": [<strings>] or null,\n'
    '  "embeddedHabits": [<strings>] or null,\n'
    '  "meals": [ { "name": <string>, "items": [<strings>] } ] or null,\n'
    '  "morningMood": <string or null>,\n'
    '  "afternoonMood": <string or null>,\n'
    '  "eveningMood": <string or null>\n'
    '}\n'
    "No text outside the JSON object."
)


def build_daily_log_command_messages(text: str, default_date: str, history: List[ChatMessage] | None = None) -> List[ChatMessage]:
    messages: List[ChatMessage] = [ChatMessage(role=Role.SYSTEM, content=DAILY_LOG_COMMAND_SYSTEM)]
    if history:
        messages.extend(history)
    content = f"User input: {text}\nDefault date if unspecified: {default_date}"
    messages.append(ChatMessage(role=Role.USER, content=content))
    return messages
