# LifeTrack Backend Presentation Plan

## Purpose

Present the current LifeTrack backend as a set of complete, defensible vertical slices:

```text
React action
    -> HTTP request
    -> Spring Security
    -> controller
    -> request DTO
    -> service business rules
    -> repository/JPA
    -> MySQL
    -> response DTO
    -> React rendering
```

For the optional AI path, extend the trace:

```text
authenticated Spring AI context
    -> React contract mapping
    -> FastAPI request validation
    -> prompt construction
    -> OpenAI-compatible provider
    -> structured response validation
    -> AI or deterministic fallback
    -> React rendering
```

The presentation should focus on ownership, trust boundaries, persistence, validation, and observable behavior. CSS, visual styling, and React's rendering algorithm are outside the backend pipeline.

---

## 1. Current project position

LifeTrack currently implements four layers:

1. **Collect:** Daily Logs, user-defined habits, expenses, journals, meals, moods, and settings.
2. **Connect:** Date-range analytics and backend aggregation.
3. **Explain:** Deterministic Spring insights plus optional validated AI-generated insights.
4. **Advise:** The AI service can produce grounded recommendations, but the current context is aggregate-based and does not yet support genuine date-paired correlations.

### Stable application responsibilities

Spring Boot owns:

- registration and login;
- JWT authentication and role authorization;
- user ownership;
- API contracts and validation;
- CRUD and merge behavior;
- domain vocabulary;
- per-user settings and insight thresholds;
- date-range queries;
- analytics and deterministic rules;
- trusted AI context construction.

MySQL owns durable application state.

React owns:

- collecting input;
- requesting APIs;
- local form state;
- formatting values;
- chart rendering;
- loading, error, and empty states.

The Python AI service owns:

- Pydantic request validation;
- prompt construction;
- provider configuration;
- structured-output negotiation;
- model-response validation;
- deterministic fallback when AI is unavailable.

### Important architecture statement

React does not own trusted business calculations or persistence. FastAPI does not query the LifeTrack database or decide which user to read. Spring remains the source of authenticated facts.

---

## 2. System architecture

### Normal application path

```text
React (:5173)
    |
    | JSON + Authorization: Bearer <JWT>
    v
Spring Boot (:8080)
    |
    | SecurityFilterChain
    | JwtAuthenticationFilter
    | Controller -> DTO -> Service -> Repository
    v
Hibernate / Spring Data JPA
    |
    v
MySQL (:3306)
schema: lifestyle_ai
```

### Optional AI Insights path

```text
Dashboard ✨ AI
    |
    | JWT
    v
GET Spring /api/ai-context
    |
    | owner-scoped MySQL queries
    | per-user preferences and thresholds
    v
trusted aggregate context
    |
    | snake_case JSON mapping
    v
POST FastAPI (:8100) /insights
    |
    | Pydantic validation
    | prompt construction
    | structured provider request
    v
OpenAI-compatible provider
    |
    | validated JSON or failure
    v
FastAPI AI result or rule fallback
    |
    v
Dashboard Insights card
```

Spring Boot does not use Spring AI. The Python service communicates through an OpenAI-compatible HTTP API and can be configured for LM Studio, OpenAI, Mistral, or Gemini.

---

## 3. Technology inventory

| Concern | Current implementation |
| --- | --- |
| Java runtime | Java 17 |
| Application framework | Spring Boot 3.3.4 |
| HTTP | Spring Web MVC |
| Authentication | Stateless JWT |
| Password hashing | BCrypt |
| Authorization | Spring Security roles and owner-scoped queries |
| Validation | Jakarta Bean Validation plus service rules |
| Persistence | Spring Data JPA / Hibernate |
| Database | MySQL |
| API documentation | springdoc-openapi and Swagger UI |
| AI microservice | Python FastAPI |
| AI validation | Pydantic |
| Provider protocol | OpenAI-compatible chat completions |
| Monitoring | Actuator, Prometheus, and optional Grafana |

Useful local documentation:

```text
Spring Swagger: http://localhost:8080/swagger-ui/index.html
Spring OpenAPI: http://localhost:8080/v3/api-docs
FastAPI docs:  http://localhost:8100/docs
```

Deep-trace interview guides:

- [JWT Authentication](../API%20Authentication/Tracing%20JWT%20Authentication.md)
- [Create Expense](../API%20Create%20Expense/Tracing%20Create%20Expense%20API.md)
- [Daily Log and Habits](../API%20Daily%20Log%20and%20Habits/Tracing%20Daily%20Log%20and%20Habits.md)
- [Date-Range Analytics](../API%20Analytics/Tracing%20Date%20Range%20Analytics.md)
- [AI Insights](../API%20AI%20Insights/Tracing%20AI%20Insights%20API.md)

---

## 4. Current Spring endpoint inventory

The current Spring backend exposes **34 operations across 12 controllers**.

| Controller | Operations | Count | Access |
| --- | --- | ---: | --- |
| `AuthController` | register, login, current user | 3 | register/login public; `/me` authenticated |
| `ExpenseController` | range list, get, create, update, delete | 5 | JWT and owner-scoped |
| `JournalController` | list, get, create, update, delete | 5 | JWT and owner-scoped |
| `DailyLogController` | list/query, today, get, create, merge, update, delete | 7 | JWT and owner-scoped |
| `HabitController` | dated list, create, rename/reactivate, deactivate, toggle completion | 5 | JWT and owner-scoped |
| `UserSettingsController` | get and update | 2 | JWT and owner-scoped |
| `ReferenceController` | server vocabulary | 1 | JWT |
| `AnalyticsController` | date-range analytics | 1 | JWT and owner-scoped |
| `InsightController` | deterministic insights | 1 | JWT and owner-scoped |
| `AiContextController` | trusted AI context | 1 | JWT and owner-scoped |
| `AdminController` | statistics and users | 2 | `ROLE_ADMIN` |
| `HealthController` | application health | 1 | public |
|  | **Total** | **34** |  |

### Important query modes

`GET /api/expenses`:

```text
no dates       -> all current-user expenses, newest first
from and to    -> inclusive owner-scoped range
only from      -> from that date through today
only to        -> first of that month through the supplied date
```

`GET /api/daily-logs`:

```text
no parameters  -> all current-user logs
date           -> zero or one record returned as a list
from and to    -> inclusive owner-scoped range
```

`GET /api/daily-logs/today`:

```text
200 -> today's record exists
204 -> nothing has been logged today
```

`GET /api/habits?date=YYYY-MM-DD`:

```text
current date   -> current active habits and completion states
historical date -> habits active on that date, including later-deactivated habits
```

---

## 5. FastAPI endpoint inventory

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | provider and model configuration health |
| `GET` | `/models` | models exposed by the configured provider |
| `POST` | `/insights` | validated AI insights with deterministic fallback |
| `POST` | `/chat` | grounded journal assistant response |
| `POST` | `/vectors/upsert` | embed and index local records |
| `POST` | `/vectors/search` | retrieve relevant indexed records |
| `DELETE` | `/vectors/{user_key}` | remove one local vector store |

The Dashboard currently uses `/insights`. The Journal assistant uses `/chat`. Vector endpoints exist as a local prototype but are not part of the normal browser workflow.

---

## 6. Request pipeline everyone must understand

```text
HTTP request
    |
    +-- CORS handling
    |
    +-- SecurityFilterChain
    |      |
    |      +-- JwtAuthenticationFilter
    |             validates token
    |             loads UserPrincipal
    |             establishes SecurityContext
    |
    +-- @RestController
    |      maps method and URL
    |      deserializes JSON
    |      invokes @Valid
    |
    +-- Service
    |      receives current authenticated user ID
    |      applies use-case and domain rules
    |      orchestrates repositories
    |
    +-- Spring Data repository
    |      derives or executes owner-scoped query
    |
    +-- Hibernate
    |      generates SQL
    |
    +-- MySQL
    |
    +-- saved entity or aggregate
    |
    +-- response DTO
    |
    +-- Jackson JSON response
```

Exceptions follow separate infrastructure:

```text
validation/domain/persistence exception
    -> GlobalExceptionHandler
    -> structured 400/404/409 response

authentication/authorization failure
    -> Spring Security
    -> 401 or 403
```

### Responsibility of each layer

- **Controller:** HTTP mapping and response status.
- **Request DTO:** transport contract and structural validation.
- **Service:** business behavior and orchestration.
- **Repository:** persistence access.
- **Entity:** database mapping.
- **Response DTO:** safe external representation.
- **Security context:** trusted current-user identity.
- **React:** API consumption and presentation.

---

## 7. Core vertical slice: Create Expense

```text
Swagger or ExpensesPage
    -> POST /api/expenses
    -> JWT filter
    -> ExpenseController.create(@Valid ExpenseRequest)
    -> SecurityUtils.currentUserId()
    -> ExpenseService.create(userId, request)
    -> validate category against ReferenceProperties
    -> default missing date to LocalDate.now()
    -> ExpenseRepository.save()
    -> Hibernate INSERT
    -> MySQL-generated ID
    -> ExpenseResponse
    -> 201 Created
```

Why this is a strong interview feature:

- public contract differs from the entity;
- user ID comes from JWT, not JSON;
- DTO and service validation are visibly different;
- persistence returns a generated identifier;
- date-filtered GET proves durable storage;
- Analytics consumes the same record;
- owner-scoped update/delete demonstrate isolation.

Use the dedicated walkthrough:

[Tracing Create Expense API](../API%20Create%20Expense/Tracing%20Create%20Expense%20API.md)

---

## 8. Daily Log and user-managed Habit model

### Daily Log behavior

`DailyLog` represents one consolidated record per user/date. The unique `(userId, date)` constraint enforces this invariant.

The current write paths are:

```text
POST /api/daily-logs
    create/upsert the full date record

POST /api/daily-logs/merge
    overwrite only supplied scalar values
    merge meals by case-insensitive meal name
    append food items
    preserve fields omitted from the request

PUT /api/daily-logs/{id}
    replace/edit a selected historical record
```

The merge endpoint allows several partial check-ins throughout one day while retaining one database record.

### Meals

Meals are stored as JSON in the `daily_logs` table through `MealListConverter`. This preserves a nested meal/item structure without an unsupported nested `@ElementCollection`.

Users can create arbitrary meal names such as:

```text
Breakfast
Lunch
High Tea
Dinner
Late Night Snack
```

### User-managed habits

Habit definitions and daily observations are separated:

```text
UserHabit
    id, userId, name, active
    activatedAt, deactivatedAt

DailyHabitCompletion
    userId, habitId, date, completed
```

This allows:

- user-defined habit names;
- up to five active habits;
- soft deactivation;
- preservation of historical completions;
- editing historical completion states without reactivating a habit.

New users begin with zero habits. The system does not recreate fixed defaults.

### Legacy habit fields

`DailyLog.transactionalHabits` and `DailyLog.embeddedHabits` remain for backward compatibility and historical migration. They are not the preferred model for new user-managed habits.

Do not claim that the legacy collections and the new habit tables are fully consolidated yet.

---

## 9. Per-user Settings and insight preferences

`UserSettingsService.getOrCreate(userId)` persists one settings row per user.

Current settings include:

```text
monthlyBudget
sleepTargetHours
stepTarget
waterTargetMl
insightPeriodDays
minPairedDays
lowSleepThreshold
habitConsistencyTarget
```

Spring validates cross-field rules:

```text
minPairedDays <= insightPeriodDays
lowSleepThreshold < sleepTargetHours
```

These settings drive both deterministic insights and the AI context. React loads and submits them through `GET/PUT /api/settings`; it does not persist them in localStorage or decide the thresholds.

Spending threshold for an analysis period is derived as:

```text
monthlyBudget × periodDays ÷ 30
```

The existing `sleepTargetHours` and `waterTargetMl` are reused as insight targets, avoiding duplicate settings.

---

## 10. Date-range Analytics

`GET /api/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD` returns:

- sleep points for the selected range;
- a separate trailing seven-day sleep series for the Dashboard;
- daily expense totals sorted by date;
- expense totals grouped by category;
- total period spending;
- monthly budget and budget-usage percentage;
- mood counts;
- journal-entry count.

Spring performs trusted aggregation. React selects dates, sends the range, and plots the returned points.

If dates are omitted:

```text
to   -> backend current date
from -> first day of the current month
```

An inverted range returns `400 Bad Request`.

### Current scaling position

Java Stream aggregation is acceptable for the current project volume. A production-scale system should move heavier grouping, pagination, and large-range aggregation into optimized SQL queries or dedicated projections.

---

## 11. Deterministic and AI Insights

### Spring deterministic path

```text
GET /api/insights
    -> authenticated user
    -> persisted UserSettings
    -> owner-scoped logs/expenses/journals
    -> deterministic sleep/spending/hydration/habit/mood rules
    -> InsightsResponse
```

This path does not depend on Python or an LLM.

### Optional AI path

```text
Dashboard ✨ AI
    -> GET /api/ai-context
    -> POST FastAPI /insights
    -> constrained provider call
    -> validated AI response or rule fallback
```

`AiContextService` currently supplies:

- analysis period;
- average sleep and personal thresholds;
- period spending and proportional threshold;
- expenses grouped by category;
- average water and personal target;
- habit consistency and personal target;
- mood counts;
- bounded journal excerpts.

The Dashboard currently omits `journalExcerpts` when mapping the Insights request. The Spring contract supports them, but they do not reach Dashboard AI Insights yet.

The Java DTO property is still named `weeklySpend`, although its current semantic value is spending over the selected period.

### AI request safety

FastAPI:

- validates input with Pydantic;
- constructs fixed system and grounded user messages;
- requests structured JSON;
- negotiates `json_schema`, `json_object`, then prompt-only JSON;
- parses the response;
- validates it again with Pydantic;
- returns deterministic rules if the provider fails or returns unusable output.

The development-only `ai-service/prompt.md` snapshot records the outbound provider body and is ignored by Git because it can contain personal lifestyle data.

Use the dedicated walkthrough:

[Tracing AI Insights API](../API%20AI%20Insights/Tracing%20AI%20Insights%20API.md)

---

## 12. Persistence model

Primary tables and collection tables include:

```text
users
user_settings
expenses
journal_entries
daily_logs
user_habits
daily_habit_completions
daily_log_transactional_habits   legacy
daily_log_embedded_habits        legacy
```

Notable persistence choices:

1. Identity primary keys are generated by MySQL.
2. Owner-scoped repository methods include the authenticated user ID.
3. Daily Logs have a unique user/date key.
4. Meals are converted to JSON in a `TEXT` column.
5. Habit definitions are separate from dated completion states.
6. Habit deactivation is soft so history survives.
7. Settings have one unique row per user.

`ddl-auto: update` is convenient for the current local project but is not a safe production migration strategy. Use Flyway or Liquibase before production.

---

## 13. Three-person presentation split

All presenters should understand Sections 2, 4, and 6. Each person then owns one vertical slice.

### Person A: Identity, security, configuration, and administration

Primary endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET/PUT /api/settings`
- `GET /api/reference`
- `GET /api/admin/stats`
- `GET /api/admin/users`
- `GET /api/health`

Primary files:

```text
SecurityConfig
JwtAuthenticationFilter
JwtService
UserPrincipal
CustomUserDetailsService
SecurityUtils
AuthController / AuthService
UserSettingsController / UserSettingsService
ReferenceController / ReferenceProperties
AdminController
HealthController
```

Presentation story:

1. Register a user and explain BCrypt.
2. Login and receive a signed JWT.
3. Authorize Swagger.
4. Call `/auth/me` to prove principal reconstruction.
5. Read/update settings and prove persistence.
6. Show domain vocabulary from `/reference`.
7. Compare normal-user `403` against admin access.

Must answer:

- JWT signing versus encryption.
- Authentication (`401`) versus authorization (`403`).
- Why user ID comes from the security context.
- Why owner-scoped queries are still necessary after authentication.
- Why CORS and CSRF have different roles in this stateless API.
- Why Swagger and Actuator exposure should be restricted in production.

### Person B: CRUD, Daily Log merge, and persistence

Primary endpoints:

- all Expense operations;
- all Journal operations;
- all Daily Log operations;
- all Habit operations.

Primary files:

```text
ExpenseController / ExpenseService / ExpenseRepository
JournalController / JournalService / JournalEntryRepository
DailyLogController / DailyLogService / DailyLogRepository
HabitController / HabitService
UserHabitRepository / DailyHabitCompletionRepository
Expense / JournalEntry / DailyLog
UserHabit / DailyHabitCompletion
MealListConverter
GlobalExceptionHandler
```

Presentation story:

1. Trace Create Expense end-to-end in Swagger.
2. Show DTO validation versus category business validation.
3. Read the record back and connect it to Analytics.
4. Demonstrate Daily Log partial merge.
5. Create, toggle, deactivate, and historically retrieve a user habit.
6. Explain meals JSON and soft habit deactivation.

Must answer:

- Why entities are not exposed directly.
- How Spring Data derives repository queries.
- How owner-scoped lookup prevents data leaks.
- Difference between POST create, POST merge, and PUT update.
- Why history needs activation/deactivation timestamps.
- Why legacy habit tables are retained temporarily.
- Why development DDL update is not a migration strategy.

### Person C: Analytics, deterministic insights, and AI

Primary endpoints:

- `GET /api/analytics`
- `GET /api/insights`
- `GET /api/ai-context`
- FastAPI `POST /insights`
- FastAPI health/models endpoints.

Primary files:

```text
AnalyticsController / AnalyticsService
InsightController / InsightService
AiContextController / AiContextService
AnalyticsDtos / InsightDtos / AiContextDtos
DashboardPage.runAiInsights
ai-service/app/main.py
ai-service/app/schemas.py
ai-service/app/prompts.py
ai-service/app/llm_client.py
ai-service/app/rules.py
```

Presentation story:

1. Request date-range Analytics and explain backend aggregation.
2. Show per-user thresholds in Settings.
3. Call Spring deterministic Insights.
4. Call authenticated AI Context.
5. Copy the context into FastAPI `/insights`.
6. Show `source: ai` and the exact outbound `prompt.md`.
7. Set `use_ai: false` or stop the provider and show `source: rules`.
8. Explain structured-output validation and current limitations.

Must answer:

- Why aggregation belongs in Spring instead of chart components.
- Difference between deterministic rules and model generation.
- Why the model does not receive database credentials or a user ID.
- Why Pydantic validates both input and model output.
- Why an AI fallback is necessary.
- Why aggregate context cannot prove correlations.
- What must change before exposing FastAPI publicly.

---

## 14. Suggested 18-minute live demonstration

### Minute 0–3: Identity and security

1. Open Spring Swagger.
2. Call public health.
3. Login.
4. Authorize Swagger with JWT.
5. Call `/api/auth/me`.

### Minute 3–8: Expense vertical slice

1. Create a valid expense and show `201`.
2. Read it back by date range.
3. Submit amount `0` and show DTO validation.
4. Submit an unknown category and show service validation.
5. Call Analytics and show the same expense in totals.

### Minute 8–11: Daily Log and habits

1. Create or merge a partial Daily Log.
2. Add another meal item through merge and show preservation.
3. Create a named habit.
4. Toggle completion for a date.
5. Explain soft deactivation and historical retrieval.

### Minute 11–14: Settings and deterministic insights

1. Read user Settings.
2. Change the analysis period or threshold.
3. Read Settings again to prove persistence.
4. Call `/api/insights`.

### Minute 14–18: AI pipeline

1. Call `/api/ai-context`.
2. Copy values into FastAPI `/insights`.
3. Show `source`, `model`, and validated insights.
4. Open the ignored `prompt.md` snapshot.
5. Demonstrate `use_ai: false` fallback.
6. Close with the current analytical and security limitations.

---

## 15. Interview-ready closing statement

> LifeTrack is a secure multi-user lifestyle platform. Spring Boot is the trusted application backend: it authenticates users, scopes every resource, validates contracts, applies business rules, persists MySQL records, computes analytics, and prepares AI context from user preferences. React is a presentation client. The optional FastAPI service receives already-aggregated context, constrains the provider request, validates model output, and falls back to deterministic rules. This separation keeps durable facts and identity deterministic while isolating probabilistic AI behavior.

---

## 16. Honest claims and limitations

### Safe claims

- Users can incrementally build one Daily Log per date.
- Users can define and track their own habits.
- Habit history survives soft deactivation.
- Expenses and analytics use the same persisted records.
- Date-range analytics are computed in Spring.
- Insight thresholds are stored per user.
- Spring offers deterministic insights without AI.
- FastAPI supports validated AI insights with fallback.
- The AI provider is configurable through an OpenAI-compatible API.
- Every Spring-owned user resource is derived from the JWT identity.

### Claims to avoid

- “LifeTrack tracks actual steps.” It stores a target, not measured steps.
- “The AI discovers correlations.” It currently receives aggregates.
- “RAG powers Dashboard insights.” Vector retrieval is not integrated there.
- “Spring calls FastAPI server-to-server.” React currently orchestrates the two calls.
- “FastAPI is production-authenticated.” It is currently a loopback-oriented local service.
- “The new and legacy habit models are fully migrated.” Legacy collections remain.
- “Every AI context field reaches the Dashboard model.” Journal excerpts are currently omitted.
- “weeklySpend is always weekly.” The current field contains selected-period spending.

---

## 17. Known risks and next backend work

### Data and domain

- Replace legacy Daily Log habit consistency with the new completion tables.
- Migrate and eventually retire legacy habit collection tables.
- Rename `weeklySpend` to `periodSpend` across Spring, React, and Python contracts.
- Add dated daily observations and backend correlation calculations.
- Use actual paired sample counts rather than treating aggregate log count as correlation evidence.
- Forward journal excerpts only when intentionally required and privacy-reviewed.

### Scalability

- Add pagination to unbounded expense, journal, and Daily Log lists.
- Move large aggregations into optimized database queries/projections.
- Add indexes and query analysis for production-sized ranges.

### Reliability

- Add automated service, controller, repository, and AI contract tests.
- Add integration tests for JWT ownership and historical habit behavior.
- Add API compatibility tests between Spring camelCase DTOs and FastAPI snake_case schemas.

### Security and production

- Move Spring-to-FastAPI communication server-side or add service authentication.
- Keep FastAPI loopback-only until authenticated.
- Restrict Swagger and Actuator outside local development.
- Replace development JWT and database credentials.
- Review browser `localStorage` JWT exposure.
- Replace `ddl-auto: update` with versioned migrations.
- Treat AI prompt snapshots as development-only sensitive files.

---

## 18. Pre-presentation checklist

- [ ] MySQL is running and contains the intended demonstration user.
- [ ] Spring Boot was restarted from the current source.
- [ ] Swagger lists all current endpoints.
- [ ] A valid JWT login is available.
- [ ] Expense create/read/update/delete was smoke-tested.
- [ ] Daily Log merge was tested with incremental meal items.
- [ ] Habit create/toggle/deactivate/history was tested.
- [ ] Settings changes survive a second GET and backend restart.
- [ ] Analytics uses the same date range as the demonstrated expenses.
- [ ] Spring deterministic Insights returns real-data output.
- [ ] FastAPI health reports the intended provider/model.
- [ ] FastAPI `/insights` returns `source: ai` when the provider is available.
- [ ] FastAPI returns `source: rules` when AI is disabled.
- [ ] `ai-service/prompt.md` is ignored by Git.
- [ ] No private keys or real user data appear in slides or committed files.
- [ ] Known limitations are assigned to the correct presenter.
