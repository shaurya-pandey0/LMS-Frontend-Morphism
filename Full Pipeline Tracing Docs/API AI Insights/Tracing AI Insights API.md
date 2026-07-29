# Tracing the AI Insights Pipeline

This guide demonstrates the complete LifeTrack **✨ AI** feature during an interview:

1. authenticate with Spring Boot;
2. load the user's persisted insight preferences;
3. aggregate the user's lifestyle data in Spring;
4. send that context to the Python AI service;
5. construct the final LLM request;
6. validate the model's structured response;
7. fall back to deterministic rules if the model is unavailable.

The feature spans two APIs:

```text
Spring Boot Swagger: http://localhost:8080/swagger-ui/index.html
FastAPI docs:        http://localhost:8100/docs
```

## What this pipeline demonstrates

```text
Dashboard ✨ AI click
    -> GET Spring /api/ai-context with JWT
    -> AiContextService queries MySQL
    -> Spring returns trusted aggregates and user thresholds
    -> React maps camelCase context to snake_case
    -> POST FastAPI /insights
    -> Pydantic validates InsightsRequest
    -> prompts.py constructs system and user messages
    -> LlmClient calls an OpenAI-compatible provider
    -> Pydantic validates structured model output
    -> FastAPI returns AI insights
       OR deterministic rule fallback
    -> Dashboard renders the returned insights
```

Spring Boot owns user identity, persistence, preferences, aggregation, and thresholds. The Python service owns prompt construction, provider communication, output validation, and AI fallback behavior. React only orchestrates the two calls and renders the response.

## Relevant source files

### Spring Boot

- `backend/src/main/java/com/lifetrack/controller/AiContextController.java`
- `backend/src/main/java/com/lifetrack/service/AiContextService.java`
- `backend/src/main/java/com/lifetrack/dto/AiContextDtos.java`
- `backend/src/main/java/com/lifetrack/entity/UserSettings.java`
- `backend/src/main/java/com/lifetrack/service/UserSettingsService.java`
- `backend/src/main/java/com/lifetrack/controller/InsightController.java`
- `backend/src/main/java/com/lifetrack/service/InsightService.java`
- `backend/src/main/java/com/lifetrack/security/JwtAuthenticationFilter.java`

### React

- `frontend/src/DashboardPage.jsx`
- `frontend/src/lib/api.js`

### Python AI service

- `ai-service/app/main.py`
- `ai-service/app/schemas.py`
- `ai-service/app/prompts.py`
- `ai-service/app/llm_client.py`
- `ai-service/app/rules.py`
- `ai-service/app/config.py`

## Before the interview

Start:

1. MySQL;
2. the current Spring Boot backend on port `8080`;
3. the FastAPI AI service on port `8100`;
4. the configured LLM provider, such as LM Studio, or configure another OpenAI-compatible provider.

Open:

```text
http://localhost:8080/swagger-ui/index.html
http://localhost:8100/docs
```

Check FastAPI health:

```text
GET http://localhost:8100/health
```

The health response identifies the configured provider and default model. `GET /models` attempts to list the models exposed by that provider.

The demonstration account should have several Daily Logs, Expenses, Journal Entries, and saved Settings. Sparse data is valid but naturally produces fewer useful insights.

## Step 1: Authenticate with Spring Boot

In Spring Swagger, execute:

```text
POST /api/auth/login
```

Example request:

```json
{
  "email": "demo@example.com",
  "password": "password123"
}
```

Expected result:

```text
200 OK
```

Copy the returned JWT, select Swagger's **Authorize** button, and enter the token. Swagger's HTTP Bearer security scheme adds the `Bearer` prefix.

Interview explanation:

> The AI context contains private lifestyle information, so Spring derives the user from the authenticated JWT. The request never accepts an arbitrary user ID.

## Step 2: Inspect the user's persisted preferences

Execute:

```text
GET /api/settings
```

The response includes values such as:

```json
{
  "monthlyBudget": 4000.0,
  "sleepTargetHours": 8.0,
  "waterTargetMl": 2000.0,
  "insightPeriodDays": 7,
  "minPairedDays": 3,
  "lowSleepThreshold": 6.0,
  "habitConsistencyTarget": 70
}
```

These settings are persisted per user in MySQL. React does not store or decide them.

Their current responsibilities are:

```text
insightPeriodDays       trailing context window
lowSleepThreshold       sleep warning threshold
sleepTargetHours        positive sleep target
monthlyBudget           source for the proportional spending threshold
waterTargetMl           hydration threshold
habitConsistencyTarget  desired completion percentage
minPairedDays           minimum logged-data gate used by supported rules
```

## Step 3: Build trusted AI context in Spring

Execute:

```text
GET /api/ai-context
```

Leave `days` empty. Spring then uses the authenticated user's persisted `insightPeriodDays`.

An explicit `days` query parameter currently overrides the saved period, but the Dashboard intentionally omits it.

Example response:

```json
{
  "periodDays": 7,
  "avgSleepHours": 7.19,
  "minSleepHours": 6.0,
  "goodSleepHours": 8.0,
  "weeklySpend": 316.0,
  "spendThreshold": 933.33,
  "expensesByCategory": {
    "Food": 117.5,
    "Travel": 18.0,
    "Wellness": 45.0,
    "Housing": 120.0,
    "Misc": 15.5
  },
  "avgWaterMl": 2200.0,
  "minWaterMl": 2000.0,
  "habitConsistency": 0.71,
  "habitConsistencyThreshold": 0.7,
  "moodCounts": {
    "good": 9,
    "great": 7,
    "tired": 1
  },
  "journalExcerpts": []
}
```

Actual values depend on the authenticated user's database records.

### What Spring calculates

`AiContextService`:

- determines the inclusive trailing date range using the backend's current date;
- queries only the authenticated user's Daily Logs, Expenses, and Journals;
- calculates average sleep and water intake;
- totals spending for the selected period;
- groups expenses by category;
- counts recorded moods;
- calculates habit consistency;
- loads up to ten recent journal excerpts, truncated to 500 characters;
- derives the spending threshold as:

```text
monthlyBudget × periodDays ÷ 30
```

The DTO still exposes the property name `weeklySpend`, but the current value is period spending. During an interview, describe its current semantics accurately.

## Step 4: Understand the Dashboard handoff

The Dashboard's `runAiInsights()` performs two calls.

First:

```text
GET http://localhost:8080/api/ai-context
Authorization: Bearer <JWT>
```

Then:

```text
POST http://localhost:8100/insights
Content-Type: application/json
```

Spring returns camelCase JSON, while FastAPI's Pydantic model uses snake_case. `DashboardPage.jsx` performs an explicit field mapping:

```text
periodDays                  -> period_days
avgSleepHours               -> avg_sleep_hours
minSleepHours               -> min_sleep_hours
goodSleepHours              -> good_sleep_hours
weeklySpend                 -> weekly_spend
spendThreshold              -> spend_threshold
expensesByCategory          -> expenses_by_category
avgWaterMl                  -> avg_water_ml
minWaterMl                  -> min_water_ml
habitConsistency            -> habit_consistency
habitConsistencyThreshold   -> habit_consistency_threshold
moodCounts                  -> mood_counts
```

The current Dashboard mapping does not forward `journalExcerpts`. State this honestly if asked; the Spring context supports them, but the Dashboard Insights request currently omits them.

## Step 5: Execute the AI request through FastAPI docs

Copy the values returned by Spring and open:

```text
http://localhost:8100/docs
```

Expand:

```text
POST /insights
```

Select **Try it out** and submit a request matching the Spring response:

```json
{
  "user_name": "Demo User",
  "context": {
    "period_days": 7,
    "avg_sleep_hours": 7.19,
    "min_sleep_hours": 6.0,
    "good_sleep_hours": 8.0,
    "weekly_spend": 316.0,
    "spend_threshold": 933.33,
    "expenses_by_category": {
      "Food": 117.5,
      "Travel": 18.0,
      "Wellness": 45.0,
      "Housing": 120.0,
      "Misc": 15.5
    },
    "avg_water_ml": 2200.0,
    "min_water_ml": 2000.0,
    "habit_consistency": 0.71,
    "habit_consistency_threshold": 0.7,
    "mood_counts": {
      "good": 9,
      "great": 7,
      "tired": 1
    }
  },
  "use_ai": true
}
```

Expected result:

```text
200 OK
```

Example AI response:

```json
{
  "source": "ai",
  "model": "gpt-4o-mini",
  "insights": [
    {
      "category": "SLEEP",
      "severity": "info",
      "title": "Steady Sleep",
      "message": "Your average sleep is above your low-sleep threshold but remains below your personal target."
    }
  ]
}
```

The exact generated wording can vary. The response structure cannot vary because Pydantic validates it.

The `source` property is operationally important:

```text
source = "ai"     provider returned valid structured insights
source = "rules"  deterministic fallback produced the response
```

## Step 6: Trace prompt construction

FastAPI validates the request as `InsightsRequest`, then calls:

```text
build_insights_messages(context, user_name)
```

`prompts.py` constructs:

1. a system message defining the analyst role, allowed categories, severities, and required JSON shape;
2. a user message containing the selected period and the JSON lifestyle context.

The model is instructed to:

- use only supplied data;
- avoid inventing numbers;
- return two to six concise insights;
- return JSON and no surrounding prose.

`LlmClient` then creates the complete provider request containing:

```text
model
messages
temperature
max_tokens
stream
response_format
```

Immediately before the provider call, the development build overwrites:

```text
ai-service/prompt.md
```

That file is ignored by Git because it can contain private lifestyle data. It is a debugging snapshot, not application persistence.

Open it after the request to show the interviewer the exact outbound provider payload.

## Step 7: Explain structured-output safety

The client negotiates provider capabilities in this order:

```text
json_schema
json_object
plain JSON prompt
```

If a provider rejects a structured mode with HTTP `400`, the client tries the next mode. A working mode is cached for the running process.

Regardless of provider mode:

1. the returned text is parsed as JSON;
2. Pydantic validates it against `AiInsightList`;
3. every insight is validated for category, severity, title, and message;
4. invalid or unusable output raises `LlmError`;
5. the endpoint falls back to deterministic rules.

This prevents arbitrary model text from flowing directly into the UI.

## Step 8: Demonstrate deterministic fallback

There are two convenient demonstrations.

### Explicit rules

Call `POST /insights` with:

```json
{
  "context": {
    "period_days": 7,
    "avg_sleep_hours": 5.2,
    "min_sleep_hours": 6.0,
    "weekly_spend": 1200,
    "spend_threshold": 900,
    "avg_water_ml": 1400,
    "min_water_ml": 2000,
    "habit_consistency": 0.3,
    "habit_consistency_threshold": 0.7,
    "mood_counts": {
      "tired": 4,
      "anxious": 2,
      "good": 1
    }
  },
  "use_ai": false
}
```

Expected result:

```text
200 OK
source = "rules"
model = null
```

### Provider failure

If the configured provider is unavailable, keep `use_ai` as `true`. The AI service catches `LlmError` and returns the same rule-based response instead of failing the Dashboard.

Interview explanation:

> AI enhances the feature but is not a single point of failure. The endpoint remains useful and keeps the same response contract when the model is offline or returns malformed data.

## Step 9: Demonstrate request validation

Submit an invalid context:

```json
{
  "context": {
    "period_days": 0,
    "habit_consistency": 2
  },
  "use_ai": true
}
```

Expected result:

```text
422 Unprocessable Entity
```

Pydantic enforces:

- valid period range;
- sleep between 0 and 24 hours;
- non-negative monetary and water values;
- habit consistency between 0 and 1;
- bounded names, excerpts, and notes;
- rejection of unknown top-level request properties.

## Step 10: Compare Spring rules with AI insights

Spring also exposes:

```text
GET /api/insights
```

This authenticated endpoint runs `InsightService` without calling Python or an LLM. It uses the same user's settings and database records.

Use it to explain the distinction:

```text
Spring /api/insights    deterministic application-owned rules
FastAPI /insights       validated AI generation with deterministic fallback
```

The Dashboard initially displays Spring's rule-based insights. Clicking **✨ AI** explicitly opts into the richer FastAPI path.

## Current security boundary

The Spring context endpoint is JWT-protected and user-scoped.

The FastAPI `/insights` endpoint is currently unauthenticated for local development. The browser supplies the already-aggregated context; it does not supply a database user ID to Spring.

For a public production deployment, move the Spring-to-AI handoff server-side or add trusted service authentication to FastAPI. Do not present the current local-development boundary as production-complete.

## Current analytical limitation

The current context contains aggregates such as averages, totals, and counts. It supports grounded summaries but not genuine date-paired relationships such as:

```text
sleep versus next-day productivity
spending versus same-day stress
habit completion versus mood
workdays versus days off
```

Those require dated observations and backend-computed sample sizes/correlations. The model should explain evidence calculated by Spring rather than invent relationships from aggregate values.

Mentioning this limitation in an interview demonstrates responsible AI design.

## A concise interview narration

> The AI feature begins with trusted context, not with a raw prompt assembled in React. Spring authenticates the user, reads their persisted preferences and lifestyle records, and calculates the context and thresholds. React maps that contract to the Python service. FastAPI validates it with Pydantic, constructs constrained system and user messages, and calls any OpenAI-compatible provider. The response must pass a second Pydantic schema before reaching the UI. If the provider is unavailable, rejects structured output, or returns invalid JSON, deterministic rules preserve the same endpoint contract. This keeps identity and business facts in Spring while isolating probabilistic AI behavior behind a validated service boundary.

## Common problems during the demonstration

### Spring returns `401 Unauthorized`

- authorize Spring Swagger with a current JWT;
- log in again if the token expired;
- copy the token value without quotation marks.

### FastAPI returns `422`

- check snake_case field names;
- ensure `context` is present;
- remove unknown top-level fields;
- verify numeric ranges.

### Response has `source: "rules"`

- `AI_MODEL` may be missing;
- the provider may be offline;
- the configured model may not exist;
- the provider may have rejected every structured-output mode;
- the model response may have failed JSON or Pydantic validation.

Check FastAPI logs and:

```text
GET /health
GET /models
```

### `prompt.md` is unchanged

The file is written only when FastAPI reaches the outbound LLM call. It will not change when:

- `use_ai` is `false`;
- no model is configured;
- request validation fails before the provider call.

### Dashboard and manual FastAPI results differ

- copy the latest Spring context values exactly;
- ensure both requests use the same model and `use_ai` value;
- model wording can vary because temperature is currently configurable and defaults to `0.4`;
- compare response structure and grounding, not exact prose.

### Endpoint missing from either API documentation page

Restart the corresponding service. Compiling source code does not replace an already-running Spring or Uvicorn process.
