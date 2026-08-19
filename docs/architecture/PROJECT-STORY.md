# LifeTrack: The Project Story

## Why we built it

LifeTrack began with a simple problem: personal information is usually scattered
across expense trackers, journals, habit applications and health notes. Recording
each type of information separately is easy, but understanding how the different
parts of a person's life relate to one another is much harder.

The original product idea therefore had four stages:

1. **Collect** daily logs, expenses, moods, habits and journals.
2. **Connect** related observations across a selected period.
3. **Explain** the patterns in understandable language.
4. **Advise** the user without pretending that limited lifestyle data proves
   medical or causal conclusions.

The project did not arrive at its current architecture immediately. It evolved as
we found weaknesses in each earlier version.

## Stage 1: Proving the screens and CRUD flow

The earliest version concentrated on getting complete user journeys working:
registration, login, daily logging, expenses, journals and dashboard cards. React
contained much of the display logic and some calculations, while the first backend
design used MongoDB.

That version was useful because it proved the product flow. It also exposed several
problems:

- different screens repeated categories, moods and other reference values;
- browser code calculated totals and selected records;
- example and fallback values could look like real user data;
- the loose document model made the academic relational design harder to explain;
- historical and incremental daily logging were not clearly modelled;
- AI features risked receiving context assembled by an untrusted client.

The lesson was that a working interface was not enough. The system needed one
trusted owner for identity, validation, persistence and calculations.

## Stage 2: Moving to MySQL and Spring Data JPA

The persistence layer was migrated from MongoDB to MySQL. Spring entities now use
JPA mappings, repositories use Spring Data JPA, and identifiers are database-
generated `BIGINT` values.

This was not merely a database replacement. It made the domain relationships
explicit:

- users own daily logs, expenses, journals, settings and habit definitions;
- a daily log is unique for a user and date;
- meal collections belong to a daily log;
- user habits are separate from their date-specific completion records;
- historical completions remain available even when a habit is deactivated.

Database-generated identifiers and uniqueness constraints now support rules that
previously existed only as assumptions in application code. Ownership is currently
enforced mainly through user-scoped repository queries and services; the JPA model
stores several relationships as raw ID columns rather than declaring every
relationship as a database foreign key.

## Stage 3: Making Spring Boot the trusted application core

The next refactor moved business decisions away from React. The intended boundary
became:

```text
React -> Spring controller -> validated DTO -> service -> repository -> MySQL
```

React still manages temporary form state and presentation, but it does not own
durable facts or trusted calculations. Spring Boot now:

- identifies the authenticated user from the JWT;
- scopes database access to that user;
- validates request fields and allowed ranges;
- applies cross-field rules;
- computes expense totals, category summaries and budget usage;
- selects date-range data for analytics;
- stores per-user targets and insight preferences;
- builds the lifestyle context used by AI features.

This change also removed fake or browser-derived analytics. If the database does
not contain enough data, the application should say so rather than manufacture a
convincing chart.

## Stage 4: Redesigning the Daily Log around real usage

The first Daily Log behaved mainly like a conventional CRUD form. In practice,
people do not necessarily record an entire day in one sitting. They may enter
sleep in the morning, a meal later, and mood or habit information in the evening.

The model was changed to support partial check-ins:

- `POST /api/daily-logs/merge` accepts one or several supplied fields;
- non-null scalar values update the selected day;
- meal items merge under case-insensitive meal names;
- omitted information remains untouched;
- an entirely empty submission is rejected;
- History allows a previous record to be loaded and edited.

Meals are not restricted to Breakfast and Dinner. The user can create Lunch,
High Tea, Brunch or another meaningful meal name.

The duplicated fixed habit lists were also replaced. A user can define up to five
active habits, start with none, rename or softly deactivate them, and record
completions by date. Habit definitions and habit completions are separate entities
because “what I track” and “what I completed today” are different facts.

Step target remains a manually entered field in the current academic scope. The
project does not claim smartwatch integration or automatic step collection.

## Stage 5: Date-range analytics instead of decorative charts

Analytics was changed from a fixed or browser-filtered presentation into a
backend-owned date-range pipeline.

The user selects `from` and `to` dates using the computer's local date. Spring
validates the range, retrieves exactly that interval from MySQL, and returns
ordered points and aggregates for the charts. Expense history and expense
analytics use the same range so that the displayed records and calculated totals
cannot silently disagree.

The dashboard's weekly sleep widget remains a separate trailing-seven-day view.
This is deliberate: a dashboard snapshot and a user-selected analytics report
serve different purposes.

## Stage 6: Adding AI without giving it ownership of facts

LifeTrack added a separate Python FastAPI service for probabilistic behavior:

```text
React --JWT--> Spring Boot --JPA--> MySQL
   |
   +--validated context--> FastAPI --> configured LLM provider
```

In the current local architecture React orchestrates the two requests. It first
gets authenticated lifestyle context from Spring and then sends that context to
FastAPI. FastAPI does not query the LifeTrack database and does not choose which
user's records to read.

This boundary is intentional:

- Spring owns authentication, user scope, database facts and calculations;
- FastAPI owns Pydantic validation, prompt construction, provider communication
  and AI-response validation;
- the model receives selected data rather than unrestricted database access;
- deterministic rule-based insights remain available when AI is disabled or
  unavailable.

The exact development provider request may be written to `ai-service/prompt.md`
for debugging. That file is Git-ignored because it can contain private lifestyle
data and is not application persistence.

## Stage 7: Turning natural language into reviewable commands

The Journal assistant originally supported ordinary conversation. It was later
extended with three explicit modes:

- **Chat**
- **Create Expense**
- **Create Daily Log**

The mode is selected by the user instead of asking an AI classifier to guess the
intent. This makes the routing deterministic.

For the two command modes, FastAPI converts natural language into a strict
Pydantic-validated payload. It requests clarification when it cannot form an
acceptable draft—for example, when an expense amount is missing or no Daily Log
field can be extracted. The current expense extractor may use `Misc` when an
amount is present but no recognised category is available, so the review step is
important. React shows the resulting draft, and nothing is persisted until the
user confirms it.

After confirmation:

- expense drafts call Spring's expense creation endpoint;
- daily-log drafts call Spring's merge endpoint;
- Spring performs its own DTO and business validation before writing to MySQL.

This is intentionally a two-validation-boundary design. Valid AI JSON is not
automatically trusted as valid application data.

## Stage 8: Making the system observable and explainable

As the number of full pipelines grew, understanding the system became as important
as adding features. Springdoc OpenAPI and Swagger UI were added so authenticated
requests can be demonstrated directly against Spring controllers. Feature tracing
documents now follow authentication, expense creation, Daily Log and habits,
analytics, and AI insights across their complete layers.

Spring Boot Actuator exposes health, metrics and Prometheus-format measurements.
The local monitoring setup lets Prometheus scrape those measurements and Grafana
visualise them. This monitors application behavior; it does not replace the
LifeTrack business database or create lifestyle records.

Automated testing has started with FastAPI command tests covering successful
expense and Daily Log extraction and clarification cases. The project does not
yet claim complete test-driven coverage across Spring and React.

## The architecture today

```text
Browser / React (:5173)
    |
    | JWT-protected application requests
    v
Spring Boot (:8080)
    |-- authentication and authorization
    |-- DTO and business validation
    |-- CRUD and partial Daily Log merge
    |-- date-range analytics
    |-- user settings and insight thresholds
    |-- trusted AI-context assembly
    v
MySQL (:3306)

Browser / React
    |
    | selected, already-aggregated context or command text
    v
FastAPI (:8100)
    |-- Pydantic request validation
    |-- prompt construction
    |-- structured response validation
    |-- deterministic fallback rules
    v
Configured LLM provider

Prometheus -> Spring /actuator/prometheus -> Grafana dashboards
```

The system is best described as a Spring Boot modular monolith with a separate AI
sidecar. It is not a collection of fully independent business microservices.

## Important engineering decisions

### Why not keep calculations in React?

Different clients could calculate different answers, and browser state disappears
when the session closes. Trusted calculations and durable preferences therefore
belong in Spring and MySQL.

### Why not let FastAPI read MySQL?

That would duplicate user authorization and domain rules. Spring already owns
those responsibilities and can provide a smaller, safer context.

### Why not let AI save records immediately?

Natural language is ambiguous and models are probabilistic. The review-and-confirm
step prevents a plausible but incorrect extraction from silently changing the
database.

### Why use explicit command modes?

No intent classifier provides 100% accuracy. A user-selected mode makes the
destination unambiguous while still allowing AI to extract the fields.

### Why soft-deactivate habits?

Deleting a habit definition would damage the meaning of historical completion
records. Soft deactivation removes it from current tracking while preserving the
past.

## What the project does not claim

The current project:

- does not integrate with a smartwatch;
- does not automatically measure actual steps;
- does not diagnose medical or mental-health conditions;
- does not prove that one lifestyle variable caused another;
- does not continuously train a personal machine-learning model;
- does not give the LLM direct database access;
- does not expose the unauthenticated local FastAPI service as a production API.

Its recommendations are observations based on the supplied records, thresholds
and selected period.

## Remaining technical debt

The current implementation still contains transitional behavior that should not
be hidden during a technical discussion:

- legacy `transactionalHabits` and `embeddedHabits` collections remain on
  `DailyLog` for backward compatibility;
- Spring's current habit-consistency insight and AI-context calculation still
  read those legacy Daily Log collections instead of aggregating the newer
  `daily_habit_completions` records;
- the natural-language Daily Log command can extract the legacy habit-name
  fields, but it does not create user habit definitions or toggle the newer
  date-specific habit completions;
- several entity relationships are represented by raw owner IDs and protected
  by service/repository scoping rather than full JPA associations and database
  foreign keys;
- automated coverage currently includes the FastAPI command tests, while Spring
  controller/service integration tests and frontend component tests remain to be
  added.

## What we learned

The largest improvement was not adding another screen. It was clarifying
ownership:

- React owns interaction and rendering.
- Spring owns identity, rules, calculations and application persistence.
- MySQL owns durable state and relational integrity.
- FastAPI isolates probabilistic AI behavior behind strict schemas.
- The user owns the final decision before an AI-generated draft becomes a fact.

The project evolved from a broad CRUD prototype into a more defensible system
whose data flow can be traced from UI input to validation, persistence, analytics
and optional AI interpretation.

## Sensible next steps

The next improvements should strengthen the existing boundaries rather than add
unrelated features:

1. Add Spring service and controller tests for authentication, ownership, merge
   behavior, analytics ranges and validation failures.
2. Add compatibility tests between Spring DTOs and FastAPI Pydantic schemas.
3. Move Spring-to-FastAPI orchestration server-side or add service
   authentication before any non-local deployment.
4. Replace development credentials with environment-managed secrets.
5. Update `PROJECT-OVERVIEW.md` and component READMEs so every current document
   describes the same architecture.

## How this document relates to the others

- `PROJECT-OVERVIEW.md` explains what currently exists.
- `docs/PROJECT-STORY.md` explains why and how it evolved.
- `API */Tracing *.md` follows individual features end to end.
- `docs/backend-presentation-plan.md` organizes the interview demonstration.
- Historical migration and implementation transcripts should be archived rather
  than treated as current architecture references.
