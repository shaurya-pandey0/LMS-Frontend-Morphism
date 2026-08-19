# LifeTrack — Integration Seams

How the three services talk to each other. This is the part of the system worth
explaining out loud: the contracts, the trust boundaries, and where the seams
are currently weak.

Read this before changing anything that crosses a process boundary.

## 1. Topology

```text
                    ┌─────────────────────────────┐
                    │   React SPA (Vite :5173)    │
                    └──────┬───────────────┬──────┘
                           │               │
                 seam A    │               │   seam B
            JWT Bearer     │               │   no auth today
                           ▼               ▼
        ┌──────────────────────┐   ┌──────────────────────┐
        │  Spring Boot :8080   │   │  FastAPI AI :8100    │
        │  /api/**             │   │  /chat /insights     │
        │  Spring Security JWT │   │  /command /vectors   │
        └──────┬───────────────┘   └──────┬───────────────┘
               │                          │
               ▼                   seam C │   seam D
        ┌──────────────┐    /api/ai-context│   OpenAI-compatible
        │    MySQL     │    (not yet used  │   chat/completions
        └──────────────┘     server-to-    ▼
                             server)  ┌─────────────────────┐
                                      │ LLM provider        │
                                      │ LM Studio :1234 or  │
                                      │ OpenAI / Mistral /  │
                                      │ Gemini              │
                                      └─────────────────────┘
```

Four seams, and the important structural fact: **the browser is currently the
orchestrator.** React fetches context from Spring (seam A), then relays it to
the AI service (seam B). Seam C exists and is authenticated, but nothing calls
it server-to-server yet.

## 2. Seam A — React ↔ Spring Boot

Owned entirely by `frontend/src/lib/api.js`. No page or component calls
`axios` or `fetch` directly.

### Transport

| Aspect | Detail |
|---|---|
| Base URL | `VITE_API_BASE_URL`, default `http://localhost:8080/api` |
| Auth | `Authorization: Bearer <jwt>` added by a request interceptor |
| Opt-out | A call passing `skipAuth: true` sends no token (login, register) |
| Session | Stateless. CSRF disabled. No cookies. |
| Unwrapping | A response interceptor returns `response.data`; `204` becomes `null` |

### Access rules (`SecurityConfig.java`)

Public: `/api/auth/**`, `GET /api/health`, swagger (`/v3/api-docs/**`,
`/swagger-ui/**`), and `/actuator/**`. Everything else requires a valid JWT.
`/api/admin/**` additionally requires `ROLE_ADMIN`.

`/actuator/**` is deliberately open so Prometheus can scrape without a token.
The config comments this and flags it for lockdown before any public deploy.

CORS comes from `CorsProperties`, defaulting to localhost `5173`, `5174`, and
`3000`, with credentials allowed.

### Error contract

Every failure rejects with `ApiError { status, message, fieldErrors }`:

- Spring's `message` or `detail` becomes `message`; `errors` becomes
  `fieldErrors`, which login and register merge into per-field form errors.
- FastAPI 422 `detail` arrays are flattened into one string, so both backends
  surface the same error shape to the UI.
- An unreachable backend yields `status: 0` with a human-readable message
  rather than a network stack trace.

### The 401 path

A Spring 401 does three things: clears the stored token, dispatches a
`lifetrack:unauthorized` window event, and rejects. `AuthInit` in
`lib/auth.jsx` listens for that event and dispatches `clearAuth()`.

The window event exists to avoid a circular import — `api.js` would otherwise
have to import the store, which imports `authSlice`, which imports `api.js`.
Expect to be asked why it isn't a direct dispatch; that's the answer.

### Naming

Spring speaks camelCase and so does the frontend, so seam A needs no field
translation. Seam B does — see below.

## 3. Seam B — React ↔ FastAPI AI service

| Aspect | Detail |
|---|---|
| Base URL | `VITE_AI_BASE_URL`, default `http://localhost:8100` |
| Auth | **None.** CORS only. |
| Client | `aiClient` in `api.js`, separate axios instance from `springClient` |
| Consumers | `JournalPage` only |

`aiApi` exposes three of the service's eight endpoints:

```js
aiApi.chat(payload, opts)      // POST /chat
aiApi.insights(payload, opts)  // POST /insights
aiApi.command(payload, opts)   // POST /command
```

The `/vectors/*` endpoints exist on the service but no frontend code calls
them.

### The context relay

This is the sequence that matters:

1. React calls `aiContextApi.get(days)` → Spring `GET /api/ai-context`.
2. Spring builds an `AiContextResponse` from the database for the JWT's user.
3. `toAiContext()` in `JournalPage.jsx` maps that camelCase DTO onto the AI
   service's snake_case `LifestyleContext` (`avgSleepHours` →
   `avg_sleep_hours`, and so on).
4. React POSTs the translated context to the AI service.

The mapping function's comment states the intent plainly: the browser relays
what the backend computed and derives none of the numbers itself. That is the
correct division — but the payload still passes through the client, which is
the weakness recorded in section 8.

One field is browser-originated: `local_time` is
`new Date().toLocaleString()`, so its format varies by machine locale.

## 4. Seam C — Spring ↔ AI service

`AiContextController` exposes `GET /api/ai-context?days=N`, returning the
aggregated `LifestyleContext` equivalent.

The security property is the point. The user id comes from
`SecurityUtils.currentUserId()` — derived from the JWT — and **never** from a
request parameter. Nobody can fetch another user's context by changing an id.

Its javadoc records both the history and the intended direction:

> Call this with the user's own JWT (server-to-server from the Python service,
> forwarding the token, or directly from the frontend today). Because the user
> id comes from `SecurityUtils.currentUserId()` and never from a
> client-supplied parameter, nobody can request another user's context by
> passing a different id/key — unlike the previous approach where the browser
> sent a raw `user_key` directly to the AI service.

So the `user_key` problem was already identified and fixed **on the Spring
side**. The AI service still accepts a client-supplied `user_key`. Closing that
is the top item in `Feature Addations/AI/next.md`.

## 5. Seam D — AI service ↔ LLM provider

Provider-agnostic by design. Any OpenAI-compatible
`POST /chat/completions` + `GET /models` endpoint works, so switching vendors
is configuration, not code.

| Provider | Default base URL |
|---|---|
| `lmstudio` (default) | `http://localhost:1234/v1` |
| `openai` | `https://api.openai.com/v1` |
| `mistral` | `https://api.mistral.ai/v1` |
| `gemini` | `https://generativelanguage.googleapis.com/v1beta/openai` |

Set `AI_PROVIDER`, or override with `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL`.
A local LM Studio needs no key, so `api_key` falls back to `"not-needed"`.

Structured output is negotiated rather than assumed. `AI_JSON_MODE=auto` tries
`json_schema`, then `json_object`, then plain prompting — because not every
provider supports the strict modes. Whatever comes back is validated the same
way regardless.

`GET /models` and `GET /health` on the AI service report the live provider,
base URL, and default model.

## 6. The LLM boundary — never trust model output

`ai-service/app/schemas.py` validates **three** layers, and says so in its own
docstring:

1. **Inbound requests** — FastAPI validates against the `*Request` models.
2. **Raw LLM output** — validated against the `Ai*` models *before use*. Any
   deviation raises `ValidationError` and triggers the deterministic fallback.
3. **Outbound responses** — the `*Response` models returned to the caller.

Layer 2 is the interesting one. The model's reply is parsed into
`AiInsightList`, `AiChatReply`, `ExtractedExpensePayload`, or
`ExtractedDailyLogPayload`. It is never used as free text.

Most request models use `extra="forbid"`, so an unexpected field is a 422 rather
than something silently ignored. The `Ai*` models use `extra="ignore"`, because
a chatty model adding a field shouldn't destroy an otherwise valid reply.

### The fallback ladder

Every AI endpoint degrades to deterministic code. **The app is fully usable
with the LLM switched off.**

| Endpoint | Primary | Fallback | Reported as |
|---|---|---|---|
| `/insights` | LLM → `AiInsightList` | `rule_based_insights(context)` | `source: "rules"` |
| `/chat` | LLM → `AiChatReply` | Top 3 rule insights, stitched into a sentence | `source: "fallback"` |
| `/command` (expense) | LLM → `ExtractedExpenseList` | `_rule_extract_expenses` regex, clause-split | `status` unchanged |
| `/command` (daily log) | LLM → `ExtractedDailyLogPayload` | `_rule_extract_daily_log` regex | `status` unchanged |

The response always names its own provenance via `source`, so the UI and the
reader can tell whether a real model answered.

The regex fallbacks are not token matching. `_rule_extract_daily_log` converts
units: litres and "glasses" (×250) into millilitres, and "5k" / "3 km" /
"2 miles" into estimated steps (×1310 per km, ×2100 per mile). When a step
count was inferred from distance, `/command` appends a note saying so, so the
user isn't shown a fabricated-looking number without explanation.

### Domain coercion before the payload escapes

Even a *successful* LLM response is forced into the domain vocabulary:

| Field | Rule |
|---|---|
| `category` | Case-insensitive match against `{Food, Housing, Travel, Wellness, Misc}`; anything else becomes `Misc` |
| moods | `_coerce_daily_mood` maps free words (`happy`→`great`, `anxious`→`meh`, `sad`→`bad`) into `{great, good, okay, meh, bad}`, defaulting to `okay` |
| `dayType` | Uppercased, must be in `{STUDY_WORK, DAY_OFF, TRAVEL, SICK, UNUSUAL}` or dropped |
| 1–5 scales | `sleepQuality`, `stressLevel`, `energyLevel`, `productivityLevel` dropped unless `1 ≤ v ≤ 5` |
| `sleepHours` | Dropped unless `0 ≤ v ≤ 24` |
| `stepTarget` | Dropped unless `> 0` |
| `amount` | Must be `> 0` (`gt=0` on the schema) |

A field that fails its check is **omitted** from the payload rather than sent
as a wrong value. So a hallucination cannot reach Spring wearing a valid shape.

## 7. Command mode — the write trust boundary

The single most important architectural claim in this project: **the LLM never
writes to the database.**

```text
user types "spent 500 on lunch"
        │
        ▼
POST /command { target, text, date, history }
        │
        ├─ LLM structured extraction ──┐
        │                              ├─→ validate + coerce
        └─ regex fallback ─────────────┘        │
                                                ▼
        CommandResponse { status, payload, message }
                │
                ├─ clarification_needed → ask the user, nothing written
                │
                └─ success → payload is a DRAFT shown in the UI
                             │
                             ▼
                       user reviews and confirms
                             │
                             ▼
                POST /api/expenses or /api/daily-logs/merge   (seam A, with JWT)
                             │
                             ▼
                Spring validates again → MySQL
```

Three properties fall out of this:

- **Human in the loop.** `payload` is a draft. The message text says "Please
  review and confirm below."
- **`clarification_needed` is a first-class outcome.** A missing amount returns
  a question, not a guess. `/command` even scans `history` for an amount
  mentioned in an earlier turn before giving up.
- **Spring validates independently.** The AI service's coercion is defence in
  depth, not the only check. The write goes through the same authenticated,
  validated endpoint a manual form submission uses.

The `date` in `CommandRequest` is the user's PC-local `YYYY-MM-DD`, supplied by
the client, matching the local-date policy the rest of the app follows.

## 8. Known gaps at the seams

Ordered by severity. These are tracked decisions, not surprises.

### 8.1 The AI service has no authentication — highest priority

`ai-service/app/main.py` has no token check and no shared secret. Only CORS
stands in front of it, and CORS is a browser convention, not access control.

Consequences:

- Any caller can `POST /chat` with someone else's `user_key` and read back
  retrieved journal snippets in the reply.
- `DELETE /vectors/{user_key}` lets any caller drop another user's index.
- `user_key` is client-supplied, which is precisely the pattern
  `AiContextController` was changed to eliminate on the Spring side.

Fixes, in increasing order of correctness: a shared secret header between
services; or forward the user's JWT and have FastAPI derive the user key from
verified claims so the client never names a user.

### 8.2 The browser orchestrates the AI flow

React fetches context from Spring and relays it to the AI service, so the
context payload passes through the client and a modified client could submit
fabricated context to the model. It also costs two round trips.

Seam C already exists and is safe. Moving orchestration into Spring turns the
fork into a chain and removes the client from the trust path.

### 8.3 Domain vocabulary is duplicated in three places

| Vocabulary | Locations |
|---|---|
| Expense categories | hardcoded in `main.py`; served by `/api/reference`; coloured in `reference.jsx` |
| Daily moods | hardcoded in `main.py` (`VALID_DAILY_MOODS`, `MOOD_MAPPING`); served by `/api/reference`; emoji in `reference.jsx` |
| Day types | hardcoded in `main.py`; `MetricSelect` options in `DailyLogPage.jsx` |

Add a category in Spring and the AI service silently coerces it to `Misc`.
Nothing errors and no test fails. Either have the AI service read
`/api/reference` at startup, or make an unknown value a loud failure instead of
a quiet default.

### 8.4 Smaller items

- `local_time` is sent as `toLocaleString()`, so its format varies by machine.
  An ISO string would be predictable for the model.
- `/vectors/*` is implemented and reachable but unused by the frontend, so it's
  attack surface with no current benefit.
- The AI service and Spring maintain separate CORS origin lists that must be
  kept in agreement by hand.
- `/actuator/**` is intentionally unauthenticated for Prometheus.

## 9. Configuration matrix

| Service | Port | Key env vars |
|---|---|---|
| React (Vite) | 5173 | `VITE_API_BASE_URL`, `VITE_AI_BASE_URL` |
| Spring Boot | 8080 | JWT + CORS via `JwtProperties`, `CorsProperties`; also `InsightProperties`, `ReferenceProperties` |
| FastAPI AI | 8100 | `AI_PROVIDER`, `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, `AI_JSON_MODE`, `AI_RETRIEVAL_MODE`, `EMBEDDING_MODEL`, `VECTOR_*`, `USER_KEY_SALT`, `CORS_ALLOWED_ORIGINS` |
| LLM provider | 1234 (LM Studio) | provider-dependent |

Retrieval settings worth knowing: `AI_RETRIEVAL_MODE` is `full` (relay the
supplied context) or `local_vector` (embed the query and retrieve top-k journal
snippets). `VECTOR_TOP_K` defaults to 5, `VECTOR_BACKEND` is
`auto | turbovec | numpy`, and `USER_KEY_SALT` salts the on-disk folder hash so
a user key isn't directly recoverable from the filesystem layout.

## 10. Checklist before changing a seam

- [ ] Which seam am I touching, and does the field-name convention change
      across it (camelCase on A and C, snake_case on B)?
- [ ] Does the change move a computation from the service that owns the data
      into a client? If so, stop.
- [ ] If I added an AI-facing field, is it validated in `schemas.py` **and**
      range-checked or coerced in `main.py` before it enters a payload?
- [ ] Does the endpoint still degrade deterministically with the LLM off?
- [ ] Does the response still report its own `source` / `status` honestly?
- [ ] If I added a domain value (category, mood, day type), did I update every
      location in section 8.3?
- [ ] Does any new write path still require human confirmation before it
      reaches Spring?
- [ ] Did I introduce a new client-supplied identifier that names a user?
- [ ] Do the CORS lists on both services still agree?
