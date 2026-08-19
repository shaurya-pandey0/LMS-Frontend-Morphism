# LifeTrack Interview Q&A

This document describes the current project. The retired MongoDB architecture is
not used anymore.

## 1. What is LifeTrack?

LifeTrack is a multi-user lifestyle tracking application. Users can record Daily
Logs, meals, moods, expenses, journals, custom habits and personal targets. Spring
calculates date-range analytics and deterministic insights. An optional FastAPI
service provides AI chat, AI-generated insights and natural-language command
extraction.

## 2. What is the current architecture?

The honest description is:

> A React client, a Spring Boot modular monolith backed by MySQL, and a separate
> FastAPI AI sidecar.

```text
React (:5173)
    -> Spring Boot (:8080)
    -> Spring Data JPA / Hibernate
    -> MySQL (:3306)

React
    -> FastAPI (:8100)
    -> configured OpenAI-compatible provider
```

It is not a complete microservice architecture. All trusted LifeTrack business
domains remain inside one Spring Boot application and one MySQL schema.

## 3. Which processes and servers are involved?

`start-lifetrack.bat` checks MySQL and launches up to three application processes:

| Process | Port | Launcher behavior |
| --- | ---: | --- |
| Spring Boot | `8080` | Started |
| FastAPI | `8100` | Started when Python and the virtual environment are available |
| Vite/React development server | `5173` | Started |
| MySQL | `3306` | Must exist; launcher attempts to start the Windows service |

Optional external processes:

| Process | Port | Purpose |
| --- | ---: | --- |
| LM Studio | usually `1234` | Optional local OpenAI-compatible model provider |
| Prometheus | `9090` | Manually started monitoring container |
| Grafana | `3000` | Manually started monitoring container |

The provider is configurable. FastAPI can use LM Studio, OpenAI, Mistral, Gemini
or another compatible endpoint. Therefore LM Studio is not always required.

## 4. Is Swagger another server?

No. Spring Swagger UI and `/v3/api-docs` are routes served by the existing Spring
Boot process on port `8080`.

```text
http://localhost:8080/swagger-ui/index.html
http://localhost:8080/v3/api-docs
```

FastAPI similarly serves its own `/docs` route from the existing Uvicorn process:

```text
http://localhost:8100/docs
```

Neither Swagger page creates another application server.

## 5. Where is the business logic?

Spring Boot owns trusted application logic:

- JWT authentication and roles;
- owner-scoped access;
- request and cross-field validation;
- CRUD and Daily Log merge rules;
- date-range queries and analytics;
- deterministic insights;
- persisted user settings;
- trusted AI-context assembly.

FastAPI owns AI-specific behavior:

- Pydantic contracts;
- prompt construction;
- provider calls;
- structured AI-response validation;
- deterministic AI fallbacks.

React owns interaction, temporary form state, API calls and rendering. It may
perform usability checks, but MySQL persistence and trusted calculations do not
belong to React.

## 6. How does JWT authentication work?

```text
POST /api/auth/login
    -> AuthController
    -> AuthService verifies BCrypt password
    -> JwtService creates token
    -> React stores the token

Later request:
Authorization: Bearer <token>
    -> JwtAuthenticationFilter validates token
    -> loads UserPrincipal
    -> stores Authentication in SecurityContext
    -> controller uses SecurityUtils.currentUserId()
```

Services and repositories query by both resource ID and authenticated user ID.
This prevents one ordinary user from requesting another user's records simply by
changing a URL ID.

## 7. What is the normal CRUD pipeline?

For expense creation:

```text
React expense form
    -> POST /api/expenses with JWT
    -> JwtAuthenticationFilter
    -> ExpenseController
    -> validated ExpenseRequest
    -> ExpenseService
    -> ExpenseRepository
    -> MySQL
    -> ExpenseResponse
    -> React
```

DTOs protect the HTTP boundary. Entities represent persistence. Services apply
rules. Repositories perform owner-scoped database access.

## 8. What is the difference between Daily Log create, merge and update?

- `POST /api/daily-logs` performs an upsert for a user and date using the submitted
  representation.
- `POST /api/daily-logs/merge` is for partial check-ins throughout the day.
  Non-null scalars overwrite, omitted fields remain, and meal items merge.
- `PUT /api/daily-logs/{id}` edits a known historical record.

The database enforces one Daily Log per user and date. The merge endpoint rejects
a completely empty request.

## 9. Why can users add Lunch, High Tea or another meal?

Meals are stored as named groups with item lists. The merge service matches meal
names case-insensitively and creates a new group when no existing name matches.
The domain is therefore not restricted to four hard-coded meal names.

## 10. How are custom habits represented?

Two facts are stored separately:

- `user_habits`: the user-owned habit definition and active state;
- `daily_habit_completions`: whether that habit was completed on a particular
  date.

Users start with no habits and can have at most five active habits. Deactivation
is soft so historical completions remain meaningful. Historical screens request
habits for the selected date.

Legacy `transactionalHabits` and `embeddedHabits` collections still exist on
Daily Log for compatibility. Current habit-consistency insight calculations still
read those legacy collections; migrating them to the new completion table remains
technical debt.

## 11. How do date-range analytics work?

React sends `from` and `to` dates:

```text
GET /api/analytics?from=2026-07-01&to=2026-07-29
```

Spring:

1. defaults missing dates;
2. rejects `from > to`;
3. queries only the authenticated user's records in the inclusive interval;
4. calculates sleep points, daily expenses, category totals, total spending,
   budget usage, mood counts and journal count;
5. returns chart-ready DTOs.

React plots the returned data. It does not recompute those business aggregates.
The dashboard's weekly sleep widget is intentionally a separate trailing-seven-
day query.

## 12. Where does the selected date come from?

React formats the user's computer-local date as `YYYY-MM-DD`; it avoids using a
UTC conversion that could shift the calendar day. Spring accepts `LocalDate`, so
the application stores a calendar date without a time-zone offset.

If no date is supplied, some Spring operations use the backend machine's
`LocalDate.now()`. A production deployment should define the application's date
and time-zone policy explicitly.

## 13. Are there two insight endpoints?

Yes, and they do different jobs:

```text
insightsApi.list()
    -> GET http://localhost:8080/api/insights
    -> Spring rule-based insights

aiApi.insights(payload)
    -> POST http://localhost:8100/insights
    -> FastAPI AI insights with rule fallback
```

The dashboard initially has deterministic Spring insights. Clicking **AI** fetches
trusted context from Spring and calls the FastAPI endpoint.

## 14. How is AI insight context assembled?

```text
React --JWT--> GET Spring /api/ai-context
Spring -> owner-scoped MySQL queries
Spring -> averages, totals, thresholds, mood counts, journal excerpts
Spring -> React
React -> POST FastAPI /insights
FastAPI -> provider or deterministic fallback
FastAPI -> React
```

Spring decides which user's records to read from the authenticated JWT. FastAPI
does not query MySQL and does not select a user.

`journalExcerpts` are recent, length-limited text excerpts from the user's saved
journal entries. Spring currently sends at most ten excerpts and truncates each
to at most 500 characters.

## 15. Why does React currently call both Spring and FastAPI?

It was an incremental integration choice: Spring supplies authenticated facts,
then React maps that response to the FastAPI contract. This kept the AI service
optional and separately testable.

It is acceptable for a localhost academic prototype, but not the preferred public
deployment boundary because FastAPI currently has CORS but no JWT authentication.
A stronger production design would have Spring call FastAPI server-to-server or
give the service endpoint its own authentication and rate limits.

## 16. Can the AI read the database directly?

No. The model and FastAPI see only the JSON sent in the current request. They do
not receive database credentials or unrestricted table access.

This reduces coupling and keeps identity and domain ownership deterministic in
Spring.

## 17. Will the AI understand JSON?

Yes. The model is instructed using system and user messages containing structured
context. More importantly, the design does not merely trust free-form output:

- FastAPI validates incoming requests with Pydantic;
- it requests a structured provider response where supported;
- it parses and validates the provider result against a Pydantic model;
- it falls back to deterministic rules when structured insight generation fails.

The model's ability to read JSON does not remove the need for schema validation.

## 18. Who decides the insight cutoffs?

Per-user thresholds are stored in `user_settings`, including:

- analysis period;
- minimum paired days;
- low-sleep threshold;
- sleep target;
- water target;
- habit-consistency target;
- monthly budget.

Spring uses those settings for deterministic insights and places relevant values
inside AI context. FastAPI rules use the thresholds present in that context. The
LLM provider settings separately control generation temperature and token limits;
they do not redefine the user's lifestyle targets.

## 19. What does `prompt.md` contain?

`ai-service/prompt.md` is a development debugging snapshot of the exact serialized
provider request body. It can include messages, model, temperature, token limit
and private lifestyle context.

It is overwritten on the next provider request, is not application persistence,
and must remain Git-ignored.

## 20. How does the natural-language command feature work?

The user explicitly selects one of three modes:

- Chat
- Create Expense
- Create Daily Log

Explicit mode selection avoids unreliable intent classification.

For a command:

```text
natural-language text
    -> POST FastAPI /command
    -> Pydantic request validation
    -> structured extraction or deterministic fallback
    -> Pydantic-validated draft
    -> React review card
    -> user confirms
    -> Spring expense create or Daily Log merge
    -> Spring validates again
    -> MySQL
```

FastAPI does not persist the draft. If an expense amount or recognizable Daily
Log field is missing, it asks for clarification. The current expense extractor
may use `Misc` when no recognized category is available, so confirmation remains
important.

## 21. Did the command feature require a database change?

No. It produces payloads for the existing Expense and Daily Log Spring contracts.
The existing Spring services remain the only persistence path.

## 22. What is stored in MySQL?

The seven main entity tables are:

```text
users
daily_logs
expenses
journal_entries
user_settings
user_habits
daily_habit_completions
```

Two additional legacy element-collection tables store Daily Log habit-name
snapshots. Meals are converted to JSON text inside the Daily Log table.

Because Hibernate uses `ddl-auto: update`, an existing development database may
also retain obsolete columns or tables that Hibernate does not safely remove.

## 23. Why was MySQL selected instead of keeping MongoDB?

The current domain benefits from relational constraints, owner/date uniqueness,
structured reporting and JPA repository queries. The migration also makes the
academic entity and persistence design easier to demonstrate.

MySQL does not automatically make the design correct. Some current relationships
still use raw owner ID columns rather than full JPA associations and database
foreign keys.

## 24. How does monitoring work?

```text
Spring Actuator
    -> Micrometer Prometheus endpoint
    -> Prometheus scrapes every 5 seconds
    -> Grafana queries Prometheus
```

Prometheus and Grafana are optional Docker containers and are not started by
`start-lifetrack.bat`. Grafana does not access the LifeTrack business database.
See `Grafana addation.md` for setup and PromQL examples.

## 25. Is this test-driven development?

Not across the whole project yet. The FastAPI command endpoint has automated tests
for successful extraction and clarification behavior. Spring controller/service
tests and React component tests still need to be added.

The honest interview answer is:

> Automated testing has begun around a new high-risk AI boundary, but the project
> does not yet claim complete TDD or sufficient regression coverage.

## 26. What are the main current limitations?

- FastAPI is unauthenticated and intended for loopback development.
- AI context supports useful aggregates but not proven causal correlations.
- new habit completion entities are not yet the source of habit-consistency
  insights;
- step target is manually entered; there is no smartwatch integration;
- several relationships use raw ID columns instead of complete foreign-key/JPA
  associations;
- Spring and React automated test coverage is incomplete;
- local development credentials must be replaced before deployment.

## 27. What is the strongest one-minute architecture answer?

> LifeTrack is a secure multi-user lifestyle platform. React owns interaction and
> rendering. Spring Boot is the trusted application core: it authenticates JWTs,
> scopes every record to its owner, validates DTOs, applies business rules,
> persists through JPA to MySQL, calculates analytics and assembles AI context.
> FastAPI is an optional AI sidecar that validates Pydantic contracts, constructs
> prompts, communicates with an OpenAI-compatible provider and validates the
> response. React currently orchestrates the AI call, and the user must confirm
> AI-generated command drafts before Spring persists them.

## Related documents

- `docs/PROJECT-STORY.md`: why the architecture evolved
- `PROJECT-OVERVIEW.md`: current repository reference
- `docs/backend-presentation-plan.md`: interview presentation order
- `API Authentication/Tracing JWT Authentication.md`
- `API Create Expense/Tracing Create Expense API.md`
- `API Daily Log and Habits/Tracing Daily Log and Habits.md`
- `API Analytics/Tracing Date Range Analytics.md`
- `API AI Insights/Tracing AI Insights API.md`
