# LifeTrack

LifeTrack is a multi-user lifestyle tracking application built with React,
Spring Boot, MySQL and an optional FastAPI AI service.

Users can record Daily Logs throughout the day, manage custom habits, meals,
expenses and journals, configure personal targets, inspect date-range analytics,
receive deterministic insights, chat with an AI assistant, and review
AI-extracted Expense or Daily Log drafts before saving them.

This README describes the current repository as of **29 July 2026**.

## Architecture

```text
React / Vite (:5173)
    |
    | JSON + JWT
    v
Spring Boot (:8080)
    |-- authentication and authorization
    |-- validation and business rules
    |-- CRUD and Daily Log merge
    |-- analytics and deterministic insights
    |-- trusted AI-context assembly
    v
Spring Data JPA / Hibernate
    v
MySQL (:3306)

React
    |
    | selected Spring context or natural-language command
    v
FastAPI (:8100)
    |-- Pydantic validation
    |-- prompt construction
    |-- structured response validation
    |-- deterministic fallbacks
    v
Configured OpenAI-compatible provider
```

The best description is **a Spring Boot modular monolith with an optional AI
sidecar**. It is not a complete microservice architecture.

Spring is the trusted application core. FastAPI does not query the LifeTrack
database or decide which user's data to read. In the current local architecture,
React obtains authenticated context from Spring and then calls FastAPI.

## Implemented features

### Authentication and ownership

- Registration and login with stateless JWT authentication
- BCrypt password hashing
- `USER` and `ADMIN` authorization
- Owner-scoped database access
- Protected React routes
- Admin statistics and user listing

### Daily Log

- One consolidated Daily Log per user and calendar date
- Incremental `merge` submissions throughout the day
- Sleep, manual step target, water, day type and self-reported wellbeing
- Morning, afternoon and evening moods
- Custom meal names such as Lunch, High Tea or Brunch
- History, editing and deletion
- Empty-submission rejection

LifeTrack does not currently collect actual smartwatch or step-counter data.
`stepTarget` is manually entered.

### User-managed habits

- New users begin with no habits
- Up to five active, user-named habits
- Rename, reactivate and soft-deactivate
- Date-specific completion records
- Historical inactive habits remain available when they have history

### Expenses and journals

- Owner-scoped create, read, update and delete
- Date-filtered expense history
- Backend-owned expense categories and mood vocabulary
- Journal history and editing

### Settings, analytics and insights

- Persisted budget, sleep, step and water targets
- Persisted AI-analysis period and thresholds
- Inclusive `from` / `to` analytics ranges
- Sleep points and trailing-seven-day dashboard sleep
- Daily expense points, category totals, total spending and budget usage
- Journal mood counts and entry count
- Deterministic Spring insights using per-user preferences

### AI

- Grounded chat using Spring-assembled context
- AI-generated insight cards with validated structured output
- Deterministic fallback when the provider is unavailable
- Explicit Chat, Create Expense and Create Daily Log modes
- Natural-language extraction through `POST /command`
- Review and confirmation before Spring persists an AI-generated draft
- Optional local vector endpoints for journal retrieval experiments

## Technology

| Layer | Current technology |
| --- | --- |
| Frontend | React 19, React Router, Vite 8, JavaScript/JSX |
| Core backend | Java 17, Spring Boot 3.3.4, Spring Web MVC |
| Security | Spring Security, JWT, BCrypt |
| Validation | Jakarta Bean Validation and service-level rules |
| Persistence | Spring Data JPA, Hibernate, MySQL 8 |
| API documentation | springdoc OpenAPI and Swagger UI |
| AI service | Python, FastAPI, Pydantic |
| AI protocol | OpenAI-compatible chat completions |
| Monitoring | Actuator, Micrometer, Prometheus and Grafana |

## Repository layout

```text
backend/                     Spring Boot application
frontend/                    React/Vite application
ai-service/                  Optional FastAPI AI sidecar
monitoring/                  Prometheus and Grafana Compose setup
Full Pipeline Tracing Docs/  End-to-end feature walkthroughs
UI/design-system/            Visual tokens and component guidance
docs/PROJECT-STORY.md        Why and how the architecture evolved
docs/backend-presentation-plan.md
Page Component Adding Guide.md
MyQnA.md
Grafana addation.md
start-lifetrack.bat
start-lifetrack.sh
```

## Local services

| Component | Address | Started by the main launcher? |
| --- | --- | --- |
| React/Vite | `http://localhost:5173` | Yes |
| Spring Boot | `http://localhost:8080` | Yes |
| MySQL | `localhost:3306` | Checked; Windows launcher attempts to start its service |
| FastAPI | `http://127.0.0.1:8100` | Yes, when Python is available |
| Local LM Studio default | `http://localhost:1234/v1` | No |
| Prometheus | `http://localhost:9090` | No |
| Grafana | `http://localhost:3000` | No |

LM Studio is only one provider option. FastAPI can also use OpenAI, Mistral,
Gemini or another OpenAI-compatible endpoint through configuration.

## Quick start

### Prerequisites

- JDK 17 or newer
- Node.js 18 or newer
- MySQL 8 on port `3306`
- Python 3.10 or newer for AI features
- A configured AI provider for live model output
- Docker Desktop only for Prometheus and Grafana

### Windows

```powershell
.\start-lifetrack.bat
```

The launcher:

1. checks Java, Node and optional Python;
2. checks or attempts to start the MySQL Windows service;
3. installs missing frontend and Python dependencies;
4. resolves Maven dependencies;
5. starts Spring Boot, optional FastAPI and Vite;
6. opens the frontend.

### macOS/Linux

```bash
chmod +x start-lifetrack.sh
./start-lifetrack.sh
```

The launchers do not start the AI provider, Prometheus or Grafana.

## Manual startup

### Backend

```powershell
Set-Location backend
.\mvnw.cmd spring-boot:run
```

### Frontend

```powershell
Set-Location frontend
npm install
npm run dev
```

### AI service

```powershell
Set-Location ai-service
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
.\run.ps1
```

Configure `ai-service/.env` before expecting live provider responses.

### Monitoring

```powershell
Set-Location monitoring
docker compose up -d
```

See [Grafana addation.md](Grafana%20addation.md) for verification, PromQL and
security notes.

## Useful URLs

```text
Frontend:       http://localhost:5173
Spring API:     http://localhost:8080/api
Spring Swagger: http://localhost:8080/swagger-ui/index.html
Spring OpenAPI: http://localhost:8080/v3/api-docs
FastAPI docs:   http://localhost:8100/docs
Actuator:       http://localhost:8080/actuator/health
Prometheus:     http://localhost:9090
Grafana:        http://localhost:3000
```

## Spring API groups

Spring currently exposes 34 controller operations across these groups:

| Base path | Responsibility |
| --- | --- |
| `/api/auth` | Register, login and current user |
| `/api/daily-logs` | List, date query, today, CRUD and partial merge |
| `/api/habits` | Definitions and date-specific completions |
| `/api/expenses` | Date-filtered expense CRUD |
| `/api/journal` | Journal CRUD |
| `/api/settings` | Per-user targets and analysis preferences |
| `/api/reference` | Server-owned vocabulary |
| `/api/analytics` | Date-range aggregates |
| `/api/insights` | Deterministic insights |
| `/api/ai-context` | Authenticated context for optional AI |
| `/api/admin` | Administrator statistics and users |
| `/api/health` | Public application health |

Public Spring routes are authentication, health, Swagger/OpenAPI and Actuator.
All other application routes require a bearer token; `/api/admin/**` additionally
requires `ROLE_ADMIN`.

## FastAPI endpoints

| Method | Path | Responsibility |
| --- | --- | --- |
| `GET` | `/health` | Provider and model configuration |
| `GET` | `/models` | Available provider models |
| `POST` | `/insights` | AI insights with rule fallback |
| `POST` | `/chat` | Grounded assistant chat |
| `POST` | `/command` | Expense or Daily Log draft extraction |
| `POST` | `/vectors/upsert` | Index local journal snippets |
| `POST` | `/vectors/search` | Search a local user index |
| `DELETE` | `/vectors/{user_key}` | Remove a local user index |

FastAPI is bound to loopback by the supplied launchers and currently has CORS
but no JWT authentication. Do not expose it publicly in this state.

## Persistence model

The seven primary entity tables are:

```text
users
daily_logs
expenses
journal_entries
user_settings
user_habits
daily_habit_completions
```

Two legacy element-collection tables retain Daily Log habit-name snapshots:

```text
daily_log_transactional_habits
daily_log_embedded_habits
```

Meals are stored as JSON text in `daily_logs`. Hibernate currently uses
`ddl-auto: update`, which is convenient locally but should be replaced with
versioned migrations for deployment.

## AI data flow

### Dashboard insights

```text
GET Spring /api/ai-context with JWT
    -> Spring queries the authenticated user's MySQL records
    -> React maps the trusted aggregate contract
POST FastAPI /insights
    -> Pydantic validates input
    -> provider result is structurally validated
    -> AI result or deterministic fallback is returned
```

### Natural-language command

```text
User selects Expense or Daily Log mode
    -> POST FastAPI /command
    -> validated draft
    -> React displays review card
    -> user confirms
    -> Spring validates the normal application DTO
    -> MySQL persistence
```

FastAPI never writes LifeTrack records directly.

`ai-service/prompt.md` is an ignored development snapshot of the latest provider
request. It may contain private lifestyle context and is not persistence.

## Verification

Use these commands before a demonstration:

```powershell
Set-Location backend
.\mvnw.cmd clean compile

Set-Location ..\frontend
npm.cmd run lint
npm.cmd run build

Set-Location ..\ai-service
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Current automated coverage includes five FastAPI `/command` tests. The repository
does not yet contain Spring JUnit tests or React component tests, so it should not
be presented as fully test-driven.

Verified on 29 July 2026:

| Check | Result |
| --- | --- |
| Spring `clean compile` | `BUILD SUCCESS`, 64 Java source files |
| Frontend ESLint | Passed |
| Frontend production build | Passed, 205 modules transformed |
| FastAPI command tests | Passed, 5 tests |

## Demo data

`backend/scripts/seed-demo-7-days.sql` seeds relative seven-day Daily Log,
expense, journal and settings data for existing users with IDs `1` and `2`.

It does not create users or credentials. Confirm those IDs before running it.

## Known limitations

- No smartwatch integration or automatic actual-step collection
- FastAPI is unauthenticated and intended for local use
- React currently orchestrates Spring-to-FastAPI calls
- AI observations do not prove causal relationships
- New habit-completion records are not yet the source of the current
  habit-consistency insight calculation
- Legacy Daily Log habit collections remain for compatibility
- Some entity relationships use raw owner IDs instead of full JPA associations
  and database foreign keys
- Spring and React automated test coverage is incomplete
- MySQL credentials, the fallback JWT secret, public Actuator and Grafana's
  default credentials are development-only
- `ddl-auto: update` is not a production migration strategy
- Vector endpoints exist but are not integrated into the normal React flow

## Documentation

- [Project story](docs/PROJECT-STORY.md) — how and why the system evolved
- [Backend presentation plan](docs/backend-presentation-plan.md)
- [Interview Q&A](MyQnA.md)
- [Page component guide](Page%20Component%20Adding%20Guide.md)
- [Design system](UI/design-system/README.md)
- [JWT Authentication trace](Full%20Pipeline%20Tracing%20Docs/API%20Authentication/Tracing%20JWT%20Authentication.md)
- [Create Expense trace](Full%20Pipeline%20Tracing%20Docs/API%20Create%20Expense/Tracing%20Create%20Expense%20API.md)
- [Daily Log and Habits trace](Full%20Pipeline%20Tracing%20Docs/API%20Daily%20Log%20and%20Habits/Tracing%20Daily%20Log%20and%20Habits.md)
- [Date-Range Analytics trace](Full%20Pipeline%20Tracing%20Docs/API%20Analytics/Tracing%20Date%20Range%20Analytics.md)
- [AI Insights trace](Full%20Pipeline%20Tracing%20Docs/API%20AI%20Insights/Tracing%20AI%20Insights%20API.md)

## Interview summary

> React owns interaction and rendering. Spring Boot is the trusted application
> core: it authenticates users, scopes records, validates contracts, applies
> business rules, persists MySQL data, computes analytics and assembles AI
> context. FastAPI is an optional AI sidecar that validates schemas, constructs
> prompts, communicates with an OpenAI-compatible provider and validates the
> result. AI-generated command drafts require user confirmation before Spring
> persists them.
"# LMS-Frontend-Morphism" 
