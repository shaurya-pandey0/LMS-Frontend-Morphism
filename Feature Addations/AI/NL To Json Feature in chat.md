# Journal AI Assistant 3-Mode Command Control Walkthrough

Added a 3-mode control (**Chat**, **+ Expense**, **+ Daily Log**) beside the Journal AI send button, supported by a FastAPI `/command` structured extraction endpoint and an interactive draft review flow in React.

---

## 1. Issue Fixes & Layout Adjustments

### 404 Not Found on `POST /command`
- **Cause**: The `uvicorn` development server process running on port 8100 was started *before* the new `/command` route was added to `main.py`. Without automatic reloading, uvicorn was serving an older in-memory snapshot of the application without the `/command` route.
- **Fix**: Added the `--reload` flag to `ai-service/run.ps1`:
  ```powershell
  & ".\.venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8100 --reload
  ```
  *(Simply restart `run.ps1` or run uvicorn with `--reload` to make the AI service recognize new routes).*

### Footer UI Overflow & Visual Layout Fix
- **Cause**: Placing a `<select>` dropdown side-by-side with the input box and send button inside `.ai-panel__footer` exceeded the width of the `ai-panel` container, causing the dropdown to clip and overflow out of bounds.
- **Fix**: Redesigned `.ai-panel__footer` with a 2-tier vertical structure:
  - **Top Tier**: A sleek 3-segment pill control (`Chat`, `+ Expense`, `+ Daily Log`) spanning 100% of the footer width.
  - **Bottom Tier**: The clean original input box and circular terracotta send button (`→`), restoring the exact visual scope and alignment.

---

## 2. Engineering Process & Thought Trajectory

### Phase 1: Requirements Dissection & UI Planning
- **Goal**: Add a 3-mode selector (`Chat`, `Create Expense`, `Create Daily Log`) right beside the Journal AI assistant send button without altering the chat panel dimensions (`.ai-panel`).
- **Constraint Checklist**:
  - Follow [`Page Component Adding Guide.md`](file:///c:/Users/PC/Desktop/V2/New%20folder/lms-frontend-backend-springboot/Page%20Component%20Adding%20Guide.md).
  - Chat panel size must remain unchanged (`.ai-panel` fixed/responsive height).
  - Default mode must be **Chat** (`"chat"`).
  - **No AI intent classification** — extraction is explicitly triggered by the user selecting the mode control.
  - Normal chat behavior (`/chat`) must remain untouched when in Chat mode.

### Phase 2: Domain Contract Inspection
- Inspected Spring Boot DTO contracts:
  - [`ExpenseDtos.java`](file:///c:/Users/PC/Desktop/V2/New%20folder/lms-frontend-backend-springboot/backend/src/main/java/com/lifetrack/dto/ExpenseDtos.java): Requires `date` (`LocalDate`), `category` (`@NotBlank String`), and `amount` (`@Positive double`).
  - [`DailyLogDtos.java`](file:///c:/Users/PC/Desktop/V2/New%20folder/lms-frontend-backend-springboot/backend/src/main/java/com/lifetrack/dto/DailyLogDtos.java): Accepts `date`, `sleepHours`, `stepTarget`, `waterIntake`, rating metrics (`sleepQuality`, `stressLevel`, `energyLevel`, `productivityLevel` 1–5), `dayType` (`DayType` enum), `transactionalHabits`, `embeddedHabits`, `meals`, and mood strings.
  - [`DayType.java`](file:///c:/Users/PC/Desktop/V2/New%20folder/lms-frontend-backend-springboot/backend/src/main/java/com/lifetrack/entity/DayType.java): Enum values `STUDY_WORK`, `DAY_OFF`, `TRAVEL`, `SICK`, `UNUSUAL`.

### Phase 3: AI Microservice Pydantic Schemas & `/command` Endpoint
- Created Pydantic request & response models in [`schemas.py`](file:///c:/Users/PC/Desktop/V2/New%20folder/lms-frontend-backend-springboot/ai-service/app/schemas.py) with `extra="forbid"`:
  - `CommandTarget`: `chat`, `expense`, `daily_log`
  - `CommandStatus`: `success`, `clarification_needed`, `error`
  - `CommandRequest`: `target`, `text`, `date` (PC-local), optional `model`
  - `ExtractedExpensePayload`: `date`, `category`, `amount`
    - Superseded: extraction now returns `ExtractedExpenseList`
      (`{ expenses: [...] }`) so one message can yield several expenses.
      `CommandResponse` gained `payloads`; `payload` is the first entry.
  - `ExtractedDailyLogPayload`: `date`, `sleepHours`, `stepTarget`, `waterIntake`, ratings (1–5), `dayType`, habits, `meals`, moods
  - `CommandResponse`: `target`, `status`, `payload`, `message`
- Structured Prompts in [`prompts.py`](file:///c:/Users/PC/Desktop/V2/New%20folder/lms-frontend-backend-springboot/ai-service/app/prompts.py):
  - `build_expense_command_messages`: Instructs LLM to extract date, category, and amount strictly from text without inventing values.
  - `build_daily_log_command_messages`: Instructs LLM to extract partial daily log metrics without hallucination.
- Endpoint Handler in [`main.py`](file:///c:/Users/PC/Desktop/V2/New%20folder/lms-frontend-backend-springboot/ai-service/app/main.py):
  - Executed structured LLM extraction via `LlmClient.structured()`.
  - Added deterministic regex/keyword fallback extractors (`_rule_extract_expense`, `_rule_extract_daily_log`) so the service functions seamlessly even when the LLM is offline or unconfigured.
  - **Clarification Handling**: If required fields (e.g. amount or category for Expense, or zero metrics for Daily Log) are missing, returns `status: "clarification_needed"` with a helpful message instead of creating an incomplete or fake payload.

### Phase 4: Frontend Integration & Interactive Draft Flow
- Added `command` method to `aiApi` in [`api.js`](file:///c:/Users/PC/Desktop/V2/New%20folder/lms-frontend-backend-springboot/frontend/src/lib/api.js).
- State & Mode Management in [`JournalPage.jsx`](file:///c:/Users/PC/Desktop/V2/New%20folder/lms-frontend-backend-springboot/frontend/src/JournalPage.jsx):
  - Added `mode` state (`'chat'`, `'expense'`, `'daily_log'`).
  - Input placeholder dynamically adapts to current `mode`.
  - `handleSend()` delegates `'chat'` to `aiApi.chat()` and `'expense'` / `'daily_log'` to `aiApi.command()`.
- **Reviewable Draft Card**:
  - Rendered inline inside the assistant chat bubble when `status === 'success'`.
  - Displays extracted key-value fields clearly before saving.
  - **Confirm & Save**: Invokes Spring Boot APIs (`expenseApi.create()` for expense, `dailyLogApi.merge()` for daily log). On success, marks draft as `confirmed` and appends a confirmation message.
  - **Cancel**: Marks draft as `cancelled` without modifying backend data.
- Styling in [`journal.css`](file:///c:/Users/PC/Desktop/V2/New%20folder/lms-frontend-backend-springboot/frontend/src/styles/journal.css):
  - Styled `.ai-panel__mode-pills`, `.ai-panel__mode-pill`, `.ai-panel__mode-pill--active`, `.ai-panel__input-row`, and `.ai-draft-card` UI components using design system tokens (`--sand-0`, `--sand-300`, `--clay-700`, `--sage-100`, `--radius-md`, `--radius-pill`).

---

## 3. File Reading Guide for Feature Additions

When adding or extending features in this repository, inspect files in this specific order:

| Layer | File / Resource | What to Read & Understand |
|---|---|---|
| **Design Rules** | [`Page Component Adding Guide.md`](file:///c:/Users/PC/Desktop/V2/New%20folder/lms-frontend-backend-springboot/Page%20Component%20Adding%20Guide.md) | Non-negotiable design rules, visual hierarchy, layout constraints, token reuse, and zoom rules. |
| **Backend Contracts** | [`ExpenseDtos.java`](file:///c:/Users/PC/Desktop/V2/New%20folder/lms-frontend-backend-springboot/backend/src/main/java/com/lifetrack/dto/ExpenseDtos.java)<br>[`DailyLogDtos.java`](file:///c:/Users/PC/Desktop/V2/New%20folder/lms-frontend-backend-springboot/backend/src/main/java/com/lifetrack/dto/DailyLogDtos.java)<br>[`DayType.java`](file:///c:/Users/PC/Desktop/V2/New%20folder/lms-frontend-backend-springboot/backend/src/main/java/com/lifetrack/entity/DayType.java) | Spring Boot DTO contracts, field validation constraints (`@NotBlank`, `@Positive`, `@Min`, `@Max`), and enum definitions before designing microservice schemas or frontend forms. |
| **AI Schemas** | [`ai-service/app/schemas.py`](file:///c:/Users/PC/Desktop/V2/New%20folder/lms-frontend-backend-springboot/ai-service/app/schemas.py) | FastAPI Pydantic request/response boundary models (`extra="forbid"`) that ensure strict validation between LLM output, API requests, and frontend responses. |
| **AI Prompts & Rules** | [`ai-service/app/prompts.py`](file:///c:/Users/PC/Desktop/V2/New%20folder/lms-frontend-backend-springboot/ai-service/app/prompts.py)<br>[`ai-service/app/main.py`](file:///c:/Users/PC/Desktop/V2/New%20folder/lms-frontend-backend-springboot/ai-service/app/main.py) | System prompt construction, structured output LLM calls, and rule-based fallback extractors. |
| **API Client** | [`frontend/src/lib/api.js`](file:///c:/Users/PC/Desktop/V2/New%20folder/lms-frontend-backend-springboot/frontend/src/lib/api.js) | Centralized fetch wrappers for Spring Boot endpoints (`/api/**`) and FastAPI endpoints (`/chat`, `/command`, `/insights`). |
| **React View** | [`frontend/src/JournalPage.jsx`](file:///c:/Users/PC/Desktop/V2/New%20folder/lms-frontend-backend-springboot/frontend/src/JournalPage.jsx) | UI composition, mode switching, chat turn history, draft card rendering, and user confirmation handlers. |
| **CSS Styles** | [`frontend/src/styles/journal.css`](file:///c:/Users/PC/Desktop/V2/New%20folder/lms-frontend-backend-springboot/frontend/src/styles/journal.css)<br>[`frontend/src/styles/components.css`](file:///c:/Users/PC/Desktop/V2/New%20folder/lms-frontend-backend-springboot/frontend/src/styles/components.css) | Reusable CSS classes, design system variables, input styles, button sizes (`.btn--sm`), and badge styling. |
| **Automated Tests** | [`ai-service/tests/test_command.py`](file:///c:/Users/PC/Desktop/V2/New%20folder/lms-frontend-backend-springboot/ai-service/tests/test_command.py) | Unit tests verifying endpoint status codes, payload extraction, missing parameter clarification responses, and schema conformance. |

---

## 4. Verification Results

| Check | Result |
|---|---|
| **Python Unit Tests** | **`OK`** (5 unit tests passed in `test_command.py` in 7.36s) |
| **Frontend Lint** | **`PASSED`** (`npm.cmd run lint` passed with 0 errors) |
| **Frontend Production Build** | **`PASSED`** (`npm.cmd run build` transformed 48 modules in 416ms) |
