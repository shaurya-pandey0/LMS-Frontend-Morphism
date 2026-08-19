# LifeTrack

LifeTrack is a multi-user lifestyle tracking application built with React,
Spring Boot, MySQL and an optional FastAPI AI service.

Users can record Daily Logs throughout the day, manage custom habits, meals,
expenses and journals, configure personal targets, inspect date-range analytics,
receive deterministic insights, chat with an AI assistant, and review
AI-extracted Expense or Daily Log drafts before saving them.

---

### 🌐 Live Production Deployment
* **Live Website:** [https://lifetrack.fun](https://lifetrack.fun) 🔒 *(SSL/TLS Encrypted via Let's Encrypt)*
* **Cloud Platform:** Google Cloud Platform (GCP Compute Engine — Debian 13)
* **CI/CD Automation:** GitHub Actions (`.github/workflows/deploy.yml`) — Auto-builds, tests, and deploys on `git push origin main`
* **Container Orchestration:** Docker Compose (Nginx reverse proxy + React SPA + Spring Boot + FastAPI + MySQL)
* **Cost Optimization:** Automated sleep schedule (`07:00` to `23:00 IST`) saving 67% on cloud compute

---

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

In production on **GCP**, Nginx serves as the reverse proxy on ports **80** and **443 (HTTPS)**, securely routing same-origin requests `/api/*` to Spring Boot and `/ai/*` to FastAPI without exposing backend or database ports to the public internet.

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
| Frontend | React 19, React Router 7, Vite 8, JavaScript/JSX |
| Frontend state | Redux Toolkit 2 and react-redux for auth; React Context for backend reference vocabulary |
| Frontend HTTP | axios, with a single client module and interceptor-based JWT attachment |
| Frontend tests | Vitest 4, React Testing Library, jsdom |
| Core backend | Java 17, Spring Boot 3.3.4, Spring Web MVC |
| Security | Spring Security, JWT, BCrypt |
| Validation | Jakarta Bean Validation and service-level rules |
| Persistence | Spring Data JPA, Hibernate, MySQL 8 |
| API documentation | springdoc OpenAPI and Swagger UI |
| AI service | Python, FastAPI, Pydantic |
| AI protocol | OpenAI-compatible chat completions |
| Edge / Proxy | Nginx 1.27 (Alpine) with Let's Encrypt SSL/TLS |
| DevOps & Cloud | Docker, Docker Compose, GitHub Actions CI/CD, GCP Compute Engine |
| Monitoring | Actuator, Micrometer, Prometheus and Grafana |

## Repository layout

```text
backend/                     Spring Boot application
frontend/                    React/Vite application
ai-service/                  Optional FastAPI AI sidecar
deploy/                      Production Docker, Nginx, SSL and deployment scripts
.github/workflows/           GitHub Actions CI/CD pipeline
monitoring/                  Prometheus and Grafana Compose setup
Full Pipeline Tracing Docs/  End-to-end feature walkthroughs
UI/design-system/            Visual tokens and component guidance
FUTURE SCOPE/                Unimplemented & scaling reference designs
docs/                        Master documentation hub (Architecture, Deployment, Interview Prep)
  ├── architecture/          System contracts, story, monitoring & guides
  ├── deployment/            Local SSH, GCP billing & deployment files index
  └── interview-prep/        Defense Q&A, AI fluency & backend presentation plan
start-lifetrack.bat
start-lifetrack.sh
```

The frontend source is organised as:

```text
frontend/src/
  main.jsx        Provider tree: Redux -> AuthInit -> ReferenceProvider -> App
  App.jsx         Routes, ProtectedRoute, ScrollToTop, ErrorBoundary
  pages/          One component per route (11 pages)
  components/     Shared shells plus extracted page sections
  lib/            api.js, auth.jsx, reference.jsx, date.js, useApi.js
  store/          Redux store, authSlice, __tests__/
  styles/         Design tokens and stylesheets
  assets/         Images
```

`lib/api.js` is the only place axios is used; `lib/date.js` is the only place
date formatting lives; `lib/useApi.js` provides the shared
load/error/reload hook.

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
npm.cmd test

Set-Location ..\ai-service
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Current automated coverage is five FastAPI `/command` tests plus ten frontend
Vitest tests covering the Redux `authSlice` and the auth flow, including a
`LoginPage` integration test that mocks the API module. There are still no Spring
JUnit tests, and React coverage outside authentication is thin, so this should
not be presented as fully test-driven.

Frontend checks verified on 30 July 2026:

| Check | Result |
| --- | --- |
| Frontend ESLint | Passed, no errors |
| Frontend production build | Passed, 275 modules transformed |
| Frontend Vitest | Passed, 10 tests across 2 files |

Backend and AI checks last verified on 29 July 2026:

| Check | Result |
| --- | --- |
| Spring `clean compile` | `BUILD SUCCESS`, 64 Java source files |
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
- Spring and React automated test coverage is incomplete; React tests cover
  authentication only
- Frontend state is split between Redux (auth) and React Context (reference
  vocabulary) rather than one mechanism
- Expense categories, mood values and day types are declared in Spring, in the
  FastAPI service and in the React presentation layer, so adding one means
  editing three places
- `tailwindcss` is installed but not wired into the build; styling is
  hand-authored CSS with design tokens
- MySQL credentials, the fallback JWT secret, public Actuator and Grafana's
  default credentials are development-only
- `ddl-auto: update` is not a production migration strategy
- Vector endpoints exist but are not integrated into the normal React flow

## Production Deployment & CI/CD

The repository ships a containerised production stack: nginx serves the React
bundle and reverse-proxies `/api` to Spring Boot and `/ai` to FastAPI, with
MySQL on named persistent volumes and optional Prometheus/Grafana alongside.

### 🔄 Automated CI/CD (GitHub Actions)
Every commit pushed to the `main` branch triggers `.github/workflows/deploy.yml`:
1. Connects to the GCP VM over SSH via key-based authentication.
2. Pulls the latest code (`git pull origin main`).
3. Rebuilds and restarts updated containers via `deploy.sh --pull`.
4. Executes automated health checks and smoke tests against `/healthz`, `/api/health`, and `/ai/health`.

### 🚀 Setup on a Fresh Debian 13 VM:
```bash
sudo bash deploy/scripts/bootstrap-vm.sh   # installs Docker & host dependencies
cp .env.example .env && nano .env          # generate & configure secrets
bash deploy/scripts/deploy.sh              # build, start, verify & smoke test
```

Two topologies are supported, sharing the same images and scripts:

- **Single VM (Production Active)** — `docker-compose.yml` on GCP Compute Engine. See [DEPLOYMENT.md](DEPLOYMENT.md).
- **Two VMs (Future Enterprise Reference)** — nginx + Spring Boot + MySQL on one, the AI service on another with no public ingress. See [FUTURE SCOPE/DEPLOYMENT-SPLIT.md](FUTURE%20SCOPE/DEPLOYMENT-SPLIT.md).

Both guides cover firewall rules, HTTPS, backups and the security caveats that
apply before a public deployment.

## Documentation Hub

LifeTrack documentation is centralized under the [**Documentation Hub (`docs/README.md`)**](docs/README.md):

### 🚢 Production Deployment & DevOps
- [**Deployment Guide**](DEPLOYMENT.md) — Single-VM production stack, Let's Encrypt SSL/TLS, and container orchestration
- [**Direct SSH & CI/CD Guide**](docs/deployment/LOCALPC-TO-VM.md) — Windows CMD/PowerShell ED25519 access and GitHub Actions secrets
- [**GCP Billing Analysis**](docs/deployment/GCP-BILLING-ANALYSIS.md) — Resource optimization, machine downsizing, and daytime sleep schedule
- [**Deployment File Index**](docs/deployment/DEPLOYMENT-FILES.md) — Purpose and behavior of all deployment files

### 🏗️ Architecture & Core Mechanics
- [**Integration Seams**](docs/architecture/INTEGRATION-SEAMS.md) — Service-to-service contracts, Pydantic validation, and trust boundaries
- [**Project Story**](docs/architecture/PROJECT-STORY.md) — The 4-stage evolutionary story of LifeTrack
- [**Initial Promise & Motivation**](docs/architecture/INITIAL-PROMISE.md) — Problem statement and 3-pillar tracking philosophy
- [**Prometheus & Grafana Monitoring**](docs/architecture/MONITORING-GRAFANA.md) — Actuator metrics, container scraping, and Grafana setup
- [**Page Component Adding Guide**](docs/architecture/PAGE-COMPONENT-GUIDE.md) — Frontend component patterns and styling standards

### 🎯 Interview Defense & Prep
- [**Project Technical Q&A**](docs/interview-prep/PROJECT-QNA.md) — Full-stack defense, state management, and DB design answers
- [**AI Fluency & LLM Architecture**](docs/interview-prep/AI-FLUENCY.md) — Prompt construction, fallbacks, and provider-agnostic design
- [**Backend Presentation Plan**](docs/interview-prep/BACKEND-PRESENTATION-PLAN.md) — Vertical slice walkthroughs across the stack
- [**React Questions & Lifecycle**](docs/interview-prep/REACT-QUESTIONS.md) — Hooks, Redux Toolkit, and rendering optimization

### 🔭 Future Scope & Deep Dives
- [**Future Scope & Reference Blueprints**](FUTURE%20SCOPE/README.md) — Split 2-VM topology and local RAG vector DB
- [**Backend Subsystem Guide**](backend/README.md)
- [**Frontend Subsystem Guide**](frontend/README.md)
- [**AI Subsystem Guide**](ai-service/README.md)
- [**Design System & UI Specs**](docs/Design%20System/UI/design-system/README.md)
- [**Full Pipeline Tracing Docs**](docs/Full%20Pipeline%20Tracing%20Docs/)

---

