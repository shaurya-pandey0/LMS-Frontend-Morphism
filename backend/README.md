# LifeTrack Backend (Spring Boot)

The trusted core of LifeTrack. It owns user identity, persistence, every business
rule, and all analytical calculation. The React app renders what this service
computes; the Python AI service writes prose about numbers this service produced.

- **Spring Boot 3.3.4**, **Java 17**, Maven (wrapper included)
- **MySQL 8** via Spring Data JPA / Hibernate
- **JWT** auth (jjwt 0.12.6), stateless, BCrypt password hashing
- **springdoc-openapi 2.6.0** → Swagger UI at `/swagger-ui/index.html`
- **Actuator + Micrometer** → `/actuator/prometheus`
- 34 REST operations across 12 controllers

---

## Contents

1. [Run it locally](#1-run-it-locally)
2. [Configuration](#2-configuration)
3. [How a request flows](#3-how-a-request-flows)
4. [Security and ownership](#4-security-and-ownership)
5. [API reference](#5-api-reference)
6. [Domain model](#6-domain-model)
7. [Business rules that live here](#7-business-rules-that-live-here)
8. [Error contract](#8-error-contract)
9. [Where the AI service fits](#9-where-the-ai-service-fits)
10. [Conventions](#10-conventions)
11. [Known issues and limitations](#11-known-issues-and-limitations)

---

## 1. Run it locally

**Prerequisites:** JDK 17+, MySQL 8 running on `localhost:3306`. No manual schema
setup — the JDBC URL carries `createDatabaseIfNotExist=true` and Hibernate builds
the tables (see [Schema management](#schema-management)).

```powershell
cd backend
.\mvnw spring-boot:run          # http://localhost:8080
.\mvnw -DskipTests clean package # jar into target/
.\mvnw test                      # there are no tests — see §11
```

On Linux/macOS use `./mvnw`.

Once up:

| URL | What |
| --- | --- |
| `http://localhost:8080/swagger-ui/index.html` | Interactive API docs; **Authorize** with a JWT |
| `http://localhost:8080/v3/api-docs` | Raw OpenAPI JSON |
| `http://localhost:8080/api/health` | Public liveness check (`{"status":"UP"}`) |
| `http://localhost:8080/actuator/health` | Actuator, with full details |
| `http://localhost:8080/actuator/prometheus` | Metrics for Prometheus |

The fastest way to get a working token: `POST /api/auth/register`, copy `token`
from the response, click **Authorize** in Swagger and paste just the token value
(no quotes, no `Bearer ` prefix — the scheme adds it).

### Schema management

There is **no Flyway or Liquibase**. `spring.jpa.hibernate.ddl-auto=update` means
Hibernate compares your entities to the live schema on every boot and issues
`ALTER TABLE` as needed. Convenient in development, risky in production: it never
drops or narrows anything, so a renamed field silently leaves the old column
behind, and two developers with diverging entities produce diverging schemas.

Set `SPRING_JPA_HIBERNATE_DDL_AUTO=validate` once a schema is stable, so a deploy
fails loudly instead of mutating tables.

`scripts/seed-demo-7-days.sql` seeds seven days of demo data for users with id 1
and 2. It does **not** create those users — register them first. It is rerunnable.

---

## 2. Configuration

`src/main/resources/application.yml` holds development defaults. Anything in it
can be overridden by an environment variable through Spring's relaxed binding,
which is how the containers configure this service without editing the file.

### Already env-driven

| Variable | Default | Purpose |
| --- | --- | --- |
| `APP_JWT_SECRET` | a dev key, base64 | **Base64-encoded, ≥ 256-bit** HMAC signing key. Generate: `openssl rand -base64 48` |
| `APP_JWT_EXPIRATION_MS` | `86400000` (24h) | Token lifetime |
| `APP_CORS_ALLOWED_ORIGINS` | localhost 5173/5174/3000 | Comma-separated allowed browser origins |

### Hardcoded in the yml, override by env

The datasource block has literal values, not `${...}` placeholders. You do not
need to edit it — an environment variable outranks `application.yml`:

```bash
SPRING_DATASOURCE_URL=jdbc:mysql://db:3306/lifestyle_ai?useSSL=false&allowPublicKeyRetrieval=true
SPRING_DATASOURCE_USERNAME=lifetrack
SPRING_DATASOURCE_PASSWORD=...
SPRING_JPA_HIBERNATE_DDL_AUTO=validate
SPRING_JPA_SHOW_SQL=false        # yml default is true; noisy in production
SERVER_PORT=8080
```

Defaults in the file are `jdbc:mysql://localhost:3306/lifestyle_ai`, user `root`,
password `1234` — fine locally, never in a deployment.

### Domain vocabulary

`ReferenceProperties` (`app.reference.*`) is the single source of truth for the
allowed expense categories, habit catalogues and mood lists. It is served to the
frontend by `GET /api/reference` **and** enforced on write by `ExpenseService`,
`JournalService` and `DailyLogService`.

| Property | Default |
| --- | --- |
| `app.reference.expense-categories` | `Food, Housing, Travel, Wellness, Misc` |
| `app.reference.journal-moods` | `happy, calm, anxious, grateful, tired` |
| `app.reference.daily-moods` | `great, good, okay, meh, bad` |
| `app.reference.transactional-habits` | 4 preset names |
| `app.reference.embedded-habits` | 5 preset names |

If you override these, keep `EXPENSE_CATEGORIES` in the AI service aligned — it
builds its extraction prompt from its own copy.

> **`app.insights.*` / `APP_INSIGHTS_*` currently does nothing.** `InsightProperties`
> is a registered `@Component` that no class injects. Insight thresholds come from
> the requesting user's `UserSettings` row instead (§7). Change them with
> `PUT /api/settings`, not with configuration.

---

## 3. How a request flows

```
HTTP request
  └─ CorsFilter                          allowed origins from CorsProperties
     └─ JwtAuthenticationFilter          once per request
        │  reads "Authorization: Bearer <jwt>"
        │  no header, or not Bearer      -> continue anonymous
        │  jwtService.isTokenValid()     -> verifies HMAC signature + expiry
        │  extractUsername()             -> the email in the subject claim
        │  CustomUserDetailsService      -> SELECT user by email
        │  UserPrincipal                 -> authorities = ROLE_<role>
        └─ SecurityContextHolder set
           └─ SecurityConfig authorization rules
              └─ @RestController          thin: no business logic
                 │  @Valid                Bean Validation on the request DTO
                 │  SecurityUtils.currentUserId()
                 └─ @Service              all business rules live here
                    └─ Repository         Spring Data derived queries
                       └─ Hibernate       -> MySQL
                 └─ *Response DTO         never an entity
```

Two things to note about the filter. It **reloads the user from MySQL on every
request** rather than trusting the token's claims, so a role change or a deleted
account takes effect immediately — at the cost of one query per request. And an
invalid or expired token is *silently ignored*: the request continues anonymous
and the authorization rules reject it with 401. There is no "bad token" error
distinct from "no token".

Layer discipline is consistent across the codebase:

| Layer | Responsibility | Rule |
| --- | --- | --- |
| Controller | HTTP mapping, `@Valid`, status codes | Never contains business logic |
| Service | Business rules, defaulting, cross-entity work | Owns every decision |
| Repository | Data access | Derived query methods only, no `@Query` anywhere |
| DTO | The public contract | Entities are never serialised to clients |

---

## 4. Security and ownership

### Authentication

Registration hashes the password with `BCryptPasswordEncoder` and returns a signed
JWT. Login delegates credential checking to Spring Security's
`AuthenticationManager` (`DaoAuthenticationProvider` + `CustomUserDetailsService`
+ BCrypt) rather than comparing strings itself.

The token carries:

| Claim | Value |
| --- | --- |
| `sub` | the user's email |
| `uid` | the user's database id, as a string |
| `role` | `USER` or `ADMIN` |
| `iat` / `exp` | issued-at and expiry |

It is **signed, not encrypted** — anyone holding it can read the payload. Nothing
secret belongs in there. Sessions are `STATELESS`; there is no server-side session
and logout is purely the client discarding the token.

### Route rules

```java
.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
.requestMatchers("/api/auth/**").permitAll()
.requestMatchers(HttpMethod.GET, "/api/health").permitAll()
.requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
.requestMatchers("/actuator/**").permitAll()          // see §11
.requestMatchers("/api/admin/**").hasRole("ADMIN")
.anyRequest().authenticated()
```

401 means identity is missing or invalid; 403 means identity is known but lacks
the role.

CSRF is disabled, which is correct here: the API is stateless and authenticates
from an explicit `Authorization` header, not an automatically-attached cookie.
The trade-off is that the browser stores the JWT in `localStorage`, so an XSS hole
would expose it.

### The ownership model

This is the most important convention in the codebase.

**No request body or query parameter ever carries a user id.** The owner comes
from the validated token:

```java
expenseService.create(SecurityUtils.currentUserId(), request)
```

and reads are scoped in the query itself, not filtered afterwards:

```java
expenseRepository.findByIdAndUserId(id, userId)
    .orElseThrow(() -> new ResourceNotFoundException("Expense not found: " + id));
```

Because lookup and authorization are the same query, another user's record is
indistinguishable from a missing one — both are **404**, which also avoids
leaking whether an id exists. Every owned repository method follows the
`...AndUserId` shape.

Never add a `userId` field to a request DTO. That would move an authorization
decision into client input.

---

## 5. API reference

All paths are under `/api`. Everything requires a Bearer token except
`/api/auth/**` and `GET /api/health`.

### Auth — `AuthController`

| Method | Path | Returns |
| --- | --- | --- |
| POST | `/auth/register` | **201** `AuthResponse{token, tokenType, user}` |
| POST | `/auth/login` | 200 `AuthResponse` |
| GET | `/auth/me` | 200 `UserDto{id, fullName, email, role}` |

`RegisterRequest` requires a non-blank `fullName`, a valid `email`, and a password
of at least 8 characters. Duplicate emails are rejected by the service with 400.

### Daily logs — `DailyLogController`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/daily-logs` | Optional `date`, or `from` + `to`; otherwise all, newest first |
| GET | `/daily-logs/today` | 200, or **204 No Content** when today has no log |
| GET | `/daily-logs/{id}` | |
| POST | `/daily-logs` | **201**. Full **upsert** by user + date |
| POST | `/daily-logs/merge` | 200. **Partial** merge — the endpoint the UI uses |
| PUT | `/daily-logs/{id}` | Full replacement of a historical row |
| DELETE | `/daily-logs/{id}` | 204 |

The three write endpoints differ in a way worth internalising:

- **`POST /daily-logs`** applies every field. Omitted values become `null` and
  omitted collections become empty — it replaces the day's content. It upserts,
  because a user has at most one log per date.
- **`POST /daily-logs/merge`** only applies what you send. Omitted scalars keep
  their stored value; meals merge by case-insensitive name with new items
  appended; the legacy habit lists accumulate. Built for repeated check-ins
  through the day. A request with no scalar, mood, habit or non-empty meal item
  is rejected with 400 rather than creating an empty row.
- **`PUT /daily-logs/{id}`** is full replacement of one owned historical record.

### Expenses — `ExpenseController`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/expenses` | Optional ISO `from` / `to`, both inclusive, newest first |
| GET | `/expenses/{id}` | |
| POST | `/expenses` | **201**. `date` optional (defaults to server today) |
| PUT | `/expenses/{id}` | |
| DELETE | `/expenses/{id}` | 204 |

Range defaulting, in `ExpenseService.findAll`: `to` missing → today; `from`
missing → the first day of `to`'s month; `from` after `to` → **400**.
`category` must match the reference list; `amount` must be `@Positive`.

### Journal — `JournalController`

`GET`, `GET /{id}`, `POST` (201), `PUT /{id}`, `DELETE /{id}` (204) on `/journal`.
`mood` is validated against `app.reference.journal-moods`.

### Habits — `HabitController`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/habits` | Optional `date`; defaults to today |
| POST | `/habits` | **201**. Max **5 active** habits per user |
| PUT | `/habits/{id}` | Rename, and activate/deactivate via `active` |
| DELETE | `/habits/{id}` | 204. **Soft** — sets `active=false`, keeps history |
| POST | `/habits/{id}/toggle` | Query params `date`, `completed`; returns `{habitId, completed}` |

Habits are split into a definition (`UserHabit`) and dated observations
(`DailyHabitCompletion`), so renaming a habit does not orphan its history and
deactivating it keeps past completions visible. `GET /habits?date=` returns a
habit when it was active on that date **or** has a completion row for it, which
is why a deactivated habit still appears on the days it was used. Omitting
`completed` on toggle inverts the existing row, or creates one set to `true`.

Note `completedToday` in the response actually means "completed on the requested
date" when you pass a historical `date`.

### Analytics, insights, settings, reference, admin

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/analytics` | `UserAnalyticsResponse` for an optional inclusive range |
| GET | `/insights` | `InsightsResponse{from, to, insights[]}` — deterministic rules |
| GET | `/ai-context` | `AiContextResponse` — aggregates for the AI service, optional `days` |
| GET | `/settings` | `UserSettingsResponse`; lazily creates defaults on first call |
| PUT | `/settings` | Validates cross-field rules, returns the saved row |
| GET | `/reference` | The domain vocabulary lists |
| GET | `/admin/stats` | `AdminStatsResponse` — system-wide totals. **ADMIN only** |
| GET | `/admin/users` | `List<UserDto>`. **ADMIN only**, unpaginated |
| GET | `/health` | `{"status":"UP"}`. Public |

---

## 6. Domain model

Seven tables, all owned by a user. There are **no JPA relationships**: `userId`
and `habitId` are plain `Long` columns with no `@ManyToOne` and no database
foreign keys. Ownership is enforced entirely by the `...AndUserId` query methods.

| Entity | Table | Key constraints |
| --- | --- | --- |
| `User` | `users` | `email` unique. `role` enum `USER`/`ADMIN` |
| `DailyLog` | `daily_logs` | **unique `(userId, date)`** — one log per day |
| `Expense` | `expenses` | indexes on `userId` and `(userId, date)` |
| `JournalEntry` | `journal_entries` | indexes on `userId` and `(userId, date)` |
| `UserHabit` | `user_habits` | the reusable definition; soft-deactivated |
| `DailyHabitCompletion` | `daily_habit_completions` | **unique `(user_id, habit_id, date)`** |
| `UserSettings` | `user_settings` | `userId` unique; one row per user, lazily created |

Enums are persisted as strings (`@Enumerated(EnumType.STRING)`): `Role`
{`USER`, `ADMIN`} and `DayType` {`STUDY_WORK`, `DAY_OFF`, `TRAVEL`, `SICK`,
`UNUSUAL`}.

### DailyLog is the complicated one

Beyond the scalars (sleep hours, step target, water, four 1–5 wellbeing ratings,
day type, three mood slots) it carries two collections that need explaining:

**Meals are stored as JSON in a `TEXT` column.** A meal is a name plus a list of
items, and JPA cannot nest a collection inside an `@ElementCollection`, so
`MealListConverter` (an `AttributeConverter`) serialises the whole list with
Jackson. That keeps the schema and the API shape simple. The cost is that
individual food items are not queryable in SQL, and schema evolution depends on
converter compatibility.

**Two legacy habit lists.** `transactionalHabits` and `embeddedHabits` are
`@ElementCollection` string lists in their own tables, explicitly documented in
the entity as backward-compatibility snapshots superseded by `UserHabit` +
`DailyHabitCompletion`. New work should use the habit tables. They are still read
by one place — see §11.

---

## 7. Business rules that live here

The governing principle: **calculation is server-side.** The frontend formats and
draws; it does not compute totals. Two implementations of one rule inevitably
drift, and this is the one under test (or would be — see §11).

### `GET /api/analytics` — the read model

`AnalyticsService.userAnalytics(userId, from, to)` defaults `to` to today and
`from` to the first of that month, rejects an inverted range with 400, then
queries only that user's daily logs, expenses, journals and settings, returning:

| Field | Derivation |
| --- | --- |
| `sleepPoints` | Dated sleep hours across the requested range, ascending |
| `weeklySleep` | **Always trailing 7 days**, ignoring the requested range — a Dashboard compatibility series |
| `dailyExpenses` | Expenses grouped by date. Uses a `TreeMap` so keys come out chronological |
| `expensesByCategory` | Grouped by category into a `LinkedHashMap` (insertion order, not sorted) |
| `totalExpenses` | Sum over the range |
| `monthlyBudget` | From the user's `UserSettings` |
| `budgetUsagePct` | `min(total / budget × 100, 100)`; `0` when budget ≤ 0 |
| `moodCounts` | **Journal moods only** — not daily-log moods |
| `journalEntryCount` | Entries in the range |

Nothing is precomputed or cached: an edited expense shows up on the next request
because the totals are derived from current rows.

### `GET /api/insights` — deterministic rules

`InsightService.generate(userId)` evaluates five rules — sleep, spending, habit
consistency, hydration, mood — over a trailing window, and every threshold comes
from **that user's `UserSettings`**:

| Setting | Used for |
| --- | --- |
| `insightPeriodDays` (7–30) | The trailing window |
| `lowSleepThreshold` | Below this average, sleep is flagged |
| `sleepTargetHours` | The positive target |
| `monthlyBudget` | Spend threshold = `budget × windowDays ÷ 30` |
| `waterTargetMl` | Hydration threshold |
| `habitConsistencyTarget` (0–100) | Desired share of days with a completed habit |
| `minPairedDays` | Minimum logged days before a rule fires |

When no rule fires it returns a single `GENERAL`/`info` "Not enough data yet"
insight, so the response shape is stable.

`PUT /api/settings` enforces cross-field rules the browser cannot be trusted
with: `minPairedDays ≤ insightPeriodDays`, and `lowSleepThreshold <
sleepTargetHours`. Both throw `BadRequestException`.

### `GET /api/ai-context` — the AI seam

`AiContextService.buildContext(userId, requestedDays)` produces the aggregated,
threshold-annotated numbers the AI service consumes. `days` defaults to the user's
`insightPeriodDays`. Field names deliberately mirror `LifestyleContext` in
`ai-service/app/schemas.py`.

Two quirks to know before reading its output:

- The field is called `weeklySpend`, but it holds **period** spending for whatever
  window was used.
- `avgSteps` and `todaySteps` derive from `DailyLog.stepTarget` — the user's
  *target* for the day, not a measured step count. The app records no real step
  data.

It also differs from `/api/analytics` on purpose: `moodCounts` here merges journal
moods **and** the daily log's morning/afternoon/evening moods, where analytics
counts journals only. Journal excerpts are capped at 10 entries, 500 characters
each.

---

## 8. Error contract

`GlobalExceptionHandler` (`@RestControllerAdvice`) turns every exception into the
same JSON shape, so clients never see a stack trace or an axios-specific error.

```json
{ "timestamp": "2026-08-02T12:34:56Z", "status": 400, "message": "..." }
```

| Exception | Status | Message |
| --- | --- | --- |
| `ResourceNotFoundException` | 404 | the exception's message |
| `BadRequestException` | 400 | the exception's message |
| `MethodArgumentNotValidException` | 400 | `"Validation failed"` **plus an `errors` map** |
| `HttpMessageNotReadableException` | 400 | `"Invalid request body or parameter value"` |
| `BadCredentialsException` | 401 | `"Invalid email or password"` |
| `AccessDeniedException` | 403 | `"You do not have permission to access this resource"` |
| `DataIntegrityViolationException` / `DuplicateKeyException` | 409 | `"A record with these details already exists"` |

The validation case adds `errors: { fieldName: message }`, which is what the login
and register forms use to highlight individual inputs.

The division of labour is deliberate and worth being able to explain:

```
Bean Validation (@Valid on the DTO)  -> structural rules: not blank, positive, 1..5, valid email
Service (BadRequestException)        -> rules needing state or context: is this category
                                        in the reference list, is this email taken,
                                        is from after to, is the log completely empty
Database constraints                 -> final integrity: unique (userId, date), unique email
```

---

## 9. Where the AI service fits

**This service never calls the AI service.** There is no `RestTemplate` or
`WebClient` anywhere in `src/main/java`. The seam is inbound only: this service
exposes `GET /api/ai-context`, and the browser relays it.

```
browser  ──1──> GET /api/ai-context        (this service, JWT)
browser  ──2──> POST :8100/insights|chat|command   (FastAPI, no auth)
browser  ──3──> POST /api/expenses         (this service — the AI's draft, confirmed)
```

So the AI never writes to the database. `/command` returns a draft, the user
confirms, and the write lands on the normal validated endpoint with the same
ownership rules as any other request.

If the AI service is down, `GET /api/insights` keeps serving the rule-based
insights and the app degrades rather than breaking.

---

## 10. Conventions

Follow these when adding code; they are what make the codebase predictable.

1. **The owner comes from the token.** `SecurityUtils.currentUserId()`, never a
   request field.
2. **Scope reads in the query.** `findByIdAndUserId`, not find-then-check.
3. **Controllers stay thin.** Mapping, `@Valid`, status code. Nothing else.
4. **Never return an entity.** Map to a `*Response` record with a static
   `from(...)`.
5. **Structural validation in the DTO, stateful validation in the service.**
6. **Vocabulary comes from `ReferenceProperties`**, not string literals.
7. **Calculation is server-side.** Do not push aggregation to the client.
8. **Throw the domain exceptions** (`BadRequestException`,
   `ResourceNotFoundException`) and let the handler map them. Do not build
   `ResponseEntity` error bodies in a controller.
9. **DTOs are records**, one nesting class per domain (`ExpenseDtos`,
   `HabitDtos`, …).

### Adding an endpoint

1. Request/response records in the domain's `*Dtos` class, with validation
   annotations.
2. Repository method, derived-query style, including `...AndUserId` if the data is
   owned.
3. Service method taking `userId` as its first parameter, holding the rules.
4. Controller handler passing `SecurityUtils.currentUserId()`.
5. Check Swagger; restart if the endpoint is missing (compiling does not reload a
   running process).

---

## 11. Known issues and limitations

Recorded honestly, because most of these are visible in the code and someone will
ask.

### There are no tests

No `src/test` directory, no test dependency in use, zero `*Test.java` files.
`.\mvnw test` runs nothing. `spring-boot-starter-test` is not even a declared
dependency. The highest-value additions would be `ExpenseService` range
defaulting, `DailyLogService.merge` semantics, `AnalyticsService` aggregation, and
a `@WebMvcTest` proving cross-user access returns 404.

### No `@Transactional` anywhere

Grep the whole backend: zero hits. Every repository call commits on its own, so
multi-step writes are not atomic. The consequences are real but currently
low-impact:

- `DailyLogService.merge` reads, mutates and saves in separate transactions.
- `HabitService.createHabit` / `updateHabit` count active habits then save — two
  concurrent requests can both pass the 5-habit check.
- `HabitService.toggleCompletion` reads then writes; only the unique constraint
  prevents a duplicate row.
- `UserSettingsService.getOrCreate` can attempt two inserts concurrently; the
  unique `userId` rejects one, surfacing as a 409.

### N+1 queries on daily logs

`DailyLog` has two `@ElementCollection(fetch = FetchType.EAGER)` lists, so every
row loaded costs two extra selects. A 30-day analytics or AI-context request
issues roughly 61 queries instead of 3. Fixing it means a join fetch, or better,
finishing the migration away from those legacy lists.

### `InsightProperties` is dead configuration

It is a `@Component` bound to `app.insights.*`, and **no class injects it**.
`InsightService` reads every threshold from the user's `UserSettings` instead. So
`APP_INSIGHTS_MIN_SLEEP_HOURS` and its four siblings have no effect wherever they
appear — including in the deployment env templates. Either wire the bean up as
system-wide defaults, or delete it.

### Legacy fields still in play

`InsightService.evaluateHabitConsistency` reads the **legacy** `transactionalHabits`
/ `embeddedHabits` lists on `DailyLog`, not `DailyHabitCompletion`. Habit
consistency insights therefore ignore the current user-managed habit system.
`AiContextService` computes `habitConsistency` from the same legacy lists. Also:
`DailyLog.stepTarget` duplicates `UserSettings.stepTarget`, and
`HabitDtos.ToggleCompletionRequest` is dead code because the endpoint takes query
parameters.

### Expense categories are matched case-insensitively but stored raw

`ReferenceProperties.isValidExpenseCategory` uses `equalsIgnoreCase`, while
`ExpenseService.apply` stores `request.category()` verbatim. So `"food"` passes
validation and persists as `"food"`, which then groups separately from `"Food"` in
`expensesByCategory` and loses its colour in the UI. The fix belongs on the write
side: resolve the submitted value to the canonical entry before saving.

### Actuator is unauthenticated

`/actuator/**` is `permitAll()` and `management.endpoint.health.show-details` is
`always`. The yml carries a comment acknowledging this. It is acceptable only
because the port is not published in the deployment topologies and nginx returns
403 for `/actuator/`. Do not publish 8080.

Swagger UI and `/v3/api-docs` are likewise public.

### Server timezone decides "today"

Services call `LocalDate.now()` and `HabitService` uses `ZoneId.systemDefault()`,
so day boundaries follow the server's zone. The frontend compensates by sending
its own local `date` on writes, but server-side defaults do not. Set `TZ`
deliberately in deployment.

### Other

- `AdminController.users()` is an unpaginated `findAll()`.
- All aggregation happens in Java streams over loaded rows, not in SQL. Fine at
  this data size; `GROUP BY` projections would be the scaling answer.
- `budgetUsagePct` is capped at 100 and always compares a range total against one
  *monthly* budget, so multi-month ranges are not normalised.
- `MealListConverter` builds its own static `ObjectMapper` rather than reusing the
  Spring-managed one.

---

## Related docs

- [Root README](../README.md) — the whole project
- [Frontend guide](../frontend/README.md) — how React consumes this API
- [AI service](../ai-service/README.md) — the FastAPI side of the seam
- [Deployment](../DEPLOYMENT.md) — containerised stack, env overrides, backups
- [Integration Seams](../Integration%20Seams.md) — service-to-service contracts
- [`Full Pipeline Tracing Docs/`](../Full%20Pipeline%20Tracing%20Docs) — request-by-request
  walkthroughs of auth, expenses, daily logs, analytics and AI insights
