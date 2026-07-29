# Tracing Date-Range Analytics Through Swagger

This walkthrough demonstrates how LifeTrack converts persisted user records into backend-owned chart data:

```text
authenticated date-range request
    -> range validation/defaulting
    -> owner-scoped repository queries
    -> Java Stream grouping and aggregation
    -> persisted UserSettings lookup
    -> analytics response DTO
    -> React chart rendering
```

## Why this is interview-relevant

Analytics proves that the backend is more than CRUD. It demonstrates:

- exact date-range contracts;
- aggregation across several entities;
- sorting grouped observations;
- reuse of persisted user settings;
- separation of business calculations from React;
- the difference between raw entities and a read-model DTO.

## Relevant files

- `backend/src/main/java/com/lifetrack/controller/AnalyticsController.java`
- `backend/src/main/java/com/lifetrack/service/AnalyticsService.java`
- `backend/src/main/java/com/lifetrack/dto/AnalyticsDtos.java`
- `backend/src/main/java/com/lifetrack/repository/DailyLogRepository.java`
- `backend/src/main/java/com/lifetrack/repository/ExpenseRepository.java`
- `backend/src/main/java/com/lifetrack/repository/JournalEntryRepository.java`
- `backend/src/main/java/com/lifetrack/service/UserSettingsService.java`
- `backend/src/main/java/com/lifetrack/entity/UserSettings.java`
- `frontend/src/AnalyticsPage.jsx`
- `frontend/src/ExpensesPage.jsx`
- `frontend/src/lib/api.js`

## Before the demonstration

1. Start MySQL and the current Spring Boot backend.
2. Open `http://localhost:8080/swagger-ui/index.html`.
3. Login and authorize Swagger.
4. Ensure the user has Daily Logs, Expenses, Journals, and Settings in the date range.

You can use the Create Expense tracing guide first to insert known values:

[Tracing Create Expense API](../API%20Create%20Expense/Tracing%20Create%20Expense%20API.md)

## Step 1: Request the default range

Execute:

```text
GET /api/analytics
```

Leave `from` and `to` empty.

Expected:

```text
200 OK
```

Spring chooses:

```text
to   = LocalDate.now()
from = first day of the same month
```

This default is calculated on the backend's system date.

## Step 2: Request an explicit range

Execute:

```text
GET /api/analytics
```

Set:

```text
from = 2026-07-23
to   = 2026-07-29
```

Both boundaries are inclusive.

Example response shape:

```json
{
  "sleepPoints": [
    {
      "date": "2026-07-23",
      "hours": 6.5
    },
    {
      "date": "2026-07-24",
      "hours": 7.5
    }
  ],
  "weeklySleep": [
    {
      "date": "2026-07-23",
      "hours": 6.5
    }
  ],
  "dailyExpenses": [
    {
      "date": "2026-07-23",
      "totalAmount": 350.0
    },
    {
      "date": "2026-07-24",
      "totalAmount": 120.0
    }
  ],
  "expensesByCategory": {
    "Food": 250.0,
    "Travel": 100.0,
    "Housing": 120.0
  },
  "totalExpenses": 470.0,
  "budgetUsagePct": 11.75,
  "monthlyBudget": 4000.0,
  "moodCounts": {
    "happy": 2,
    "calm": 1
  },
  "journalEntryCount": 3
}
```

Values depend on the authenticated user's database rows.

## Step 3: Trace the request

```text
GET /api/analytics?from=...&to=...
    -> JwtAuthenticationFilter
    -> AnalyticsController.analytics()
    -> ISO date conversion to LocalDate
    -> SecurityUtils.currentUserId()
    -> AnalyticsService.userAnalytics(userId, from, to)
    -> normalize/default range
    -> validate start <= end
    -> DailyLogRepository date-range queries
    -> ExpenseRepository date-range query
    -> JournalEntryRepository date-range query
    -> UserSettingsService.getOrCreate(userId)
    -> aggregate into UserAnalyticsResponse
    -> Jackson JSON
    -> 200 OK
```

The controller is intentionally thin. Date selection, validation, queries, and calculations belong to the service.

## Step 4: Explain each response field

### `sleepPoints`

Source:

```text
DailyLogRepository.findByUserIdAndDateBetweenOrderByDateAsc()
```

Contains the selected range's Daily Log dates and sleep-hour values, sorted ascending.

The backend does not invent points for dates with no Daily Log.

### `weeklySleep`

This is a separate Dashboard compatibility series:

```text
today.minusDays(6) through today
```

It ignores the requested analytics range. This allows the Dashboard's weekly sleep card to keep receiving its trailing-seven-day data.

### `dailyExpenses`

The service groups all range expenses by date:

```java
Collectors.groupingBy(
    Expense::getDate,
    TreeMap::new,
    Collectors.summingDouble(Expense::getAmount)
)
```

`TreeMap` sorts the date keys ascending before they are converted to `DailyExpensePoint`.

If three expenses exist on one date, the response contains one point with their sum.

### `expensesByCategory`

The service groups the same range expenses by category and sums their amounts.

This powers the category breakdown without React reducing the transaction list.

### `totalExpenses`

```text
sum of every Expense.amount inside the selected range
```

### `monthlyBudget`

Loaded from the authenticated user's persistent `UserSettings`.

`getOrCreate()` creates the user's default settings row if it does not exist.

### `budgetUsagePct`

Current formula:

```text
totalExpenses / monthlyBudget × 100
```

The value is capped at `100`.

If monthly budget is zero, the response uses `0` to avoid division by zero.

### `moodCounts`

The current Analytics implementation counts moods from range-filtered Journal Entries.

It does not currently include Daily Log morning, afternoon, and evening moods. This differs from the AI context, which combines both sources.

### `journalEntryCount`

The number of Journal Entries inside the selected inclusive range.

## Step 5: Prove aggregation using known expenses

Create:

```json
{
  "date": "2026-07-29",
  "category": "Food",
  "amount": 100
}
```

Then create:

```json
{
  "date": "2026-07-29",
  "category": "Food",
  "amount": 50
}
```

Then request Analytics for that date:

```text
from = 2026-07-29
to   = 2026-07-29
```

Expected effects:

```text
dailyExpenses[2026-07-29] = 150
expensesByCategory.Food   = 150
totalExpenses             = 150
```

This proves that multiple persisted rows become a single analytical observation.

## Step 6: Show an update propagating

Update the first expense from `100` to `200`:

```text
PUT /api/expenses/{id}
```

Request Analytics again.

Expected effects:

```text
daily total = 250
Food total  = 250
period total = 250
```

No analytics table or React cache must be updated manually. Analytics is derived from current source records.

## Step 7: Show deletion propagating

Delete the second expense:

```text
DELETE /api/expenses/{id}
```

Request Analytics again:

```text
daily total = 200
Food total  = 200
period total = 200
```

This demonstrates that Analytics is a read model, not duplicated persisted state.

## Step 8: Validate an invalid range

Execute:

```text
GET /api/analytics?from=2026-07-30&to=2026-07-29
```

Expected:

```text
400 Bad Request
```

The message identifies the inverted dates.

Spring rejects an invalid range rather than returning an empty dataset that could mislead the user.

## Step 9: Demonstrate owner isolation

The service passes `SecurityUtils.currentUserId()` into every repository query.

Two users can request the same dates and receive different results because the query includes the authenticated user ID.

No `userId` query parameter is accepted.

## Step 10: Connect the API to React

`AnalyticsPage`:

```text
reads From and To date controls
    -> analyticsApi.summary(from, to)
    -> GET /api/analytics?from=...&to=...
    -> plots sleepPoints and dailyExpenses
```

`ExpensesPage` requests:

```text
expenseApi.list(from, to)
analyticsApi.summary(from, to)
```

using the same range. It displays backend-computed:

- total spend;
- category breakdown;
- budget usage.

React still performs presentation calculations such as SVG coordinates and visual scales. It does not recompute trusted totals from transaction rows.

## Why analytics belongs in Spring

If React calculated all totals:

- different pages could implement different formulas;
- another client would duplicate the rules;
- the browser would need every underlying row;
- ownership and filtering mistakes would be easier;
- tests would be split across UI code;
- AI and APIs could not reuse one trusted result.

Spring provides one source of analytical truth.

## Java Streams versus SQL aggregation

Current implementation:

```text
repository loads range rows
    -> Java Streams group and sum them
```

This is understandable and sufficient for the current project volume.

For large datasets, prefer database-side aggregation:

```sql
SELECT date, SUM(amount)
FROM expenses
WHERE user_id = ?
  AND date BETWEEN ? AND ?
GROUP BY date
ORDER BY date;
```

Benefits:

- fewer rows transferred to Java;
- database query optimizer and indexes;
- reduced application memory;
- easier pagination/projection.

An academic answer should present Java Streams as the current trade-off, not as universally optimal.

## Current limitations to state honestly

### Budget semantics for arbitrary ranges

`budgetUsagePct` always compares the selected range total with one monthly budget.

For a one-month range this is intuitive. For a multi-month or partial-month range, it is not normalized to the range length. A future implementation should either constrain the range, calculate month-wise usage, or derive a proportional period budget.

### Percentage cap

The API caps `budgetUsagePct` at `100`. This is useful for a progress chart but hides how far over budget the user is. A separate uncapped ratio or `amountOverBudget` would preserve analytical detail.

### Missing dates

The API returns only observed dates. It does not emit zero-filled points for dates with no expense or Daily Log.

The frontend must distinguish:

```text
no record
zero value
```

### Mood sources

Analytics currently counts Journal moods only. AI context combines Journal and Daily Log moods. These contracts should be aligned if the product expects one definition.

### Fixed weekly sleep series

`weeklySleep` is always trailing seven days and is independent of the selected range. It exists for Dashboard compatibility but makes `UserAnalyticsResponse` serve two related use cases.

A future design could separate Dashboard Summary from range Analytics.

### Scaling

Lists are currently loaded and aggregated in application memory. SQL projections are preferable at scale.

## Likely interview questions

### Why use a DTO instead of returning entities?

Analytics is not one entity. It combines several repositories and computed values into a purpose-built read model.

### Why use `TreeMap`?

Grouping does not inherently guarantee chronological order. `TreeMap` sorts `LocalDate` keys naturally so chart points are returned ascending.

### Why validate ranges in the service?

The rule applies to the analytics use case regardless of which controller or caller invokes it.

### Why not store the computed totals?

The current data size allows totals to be derived from source records, avoiding synchronization and stale-cache problems.

### What happens if an expense is edited?

The next Analytics request queries current records, so the result reflects the edit automatically.

### How are users isolated?

Every repository query includes the authenticated user ID obtained from Spring Security.

### How would you optimize it?

- database `GROUP BY` projections;
- indexes on user/date;
- pagination;
- cached aggregates where justified;
- separate Dashboard and long-range DTOs;
- integration and query-performance tests.

## Concise interview narration

> Analytics is an authenticated backend read model. The controller accepts an optional ISO date range, while the service applies current-month defaults and rejects inverted ranges. It queries only the JWT user's Daily Logs, Expenses, Journals, and Settings. Sleep observations remain dated points; expenses are grouped by date with a TreeMap for chronological order and separately grouped by category; totals and budget usage are calculated once in Spring. React receives these trusted values and only plots them. The current Stream-based approach is clear for project-scale data, while production scale would move grouping into SQL projections.

## Cleanup

If demonstration expenses were created, delete them using their IDs and request Analytics once more to verify that the derived totals return to their original values.
