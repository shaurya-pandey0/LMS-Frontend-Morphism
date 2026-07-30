# Tracing Daily Log Merge and User-Managed Habits

This walkthrough demonstrates LifeTrack's most domain-specific persistence flow:

```text
partial check-ins throughout one day
    -> one consolidated DailyLog per user/date
    -> scalar overwrite without clearing omitted values
    -> meal/item merge
    -> historical read and edit

user-defined habit
    -> reusable UserHabit definition
    -> dated DailyHabitCompletion
    -> soft deactivation
    -> historical completion retrieval
```

## Why this is a strong interview feature

It demonstrates concepts that ordinary CRUD does not:

- an application-level merge operation;
- one-record-per-user/date invariants;
- nullable partial DTOs;
- nested meal persistence using a JPA converter;
- temporal habit history;
- separation of definitions from observations;
- soft deactivation;
- owner-scoped history.

## Relevant files

### Daily Log

- `backend/src/main/java/com/lifetrack/controller/DailyLogController.java`
- `backend/src/main/java/com/lifetrack/dto/DailyLogDtos.java`
- `backend/src/main/java/com/lifetrack/service/DailyLogService.java`
- `backend/src/main/java/com/lifetrack/repository/DailyLogRepository.java`
- `backend/src/main/java/com/lifetrack/entity/DailyLog.java`
- `backend/src/main/java/com/lifetrack/entity/DayType.java`
- `backend/src/main/java/com/lifetrack/entity/MealListConverter.java`

### Habits

- `backend/src/main/java/com/lifetrack/controller/HabitController.java`
- `backend/src/main/java/com/lifetrack/dto/HabitDtos.java`
- `backend/src/main/java/com/lifetrack/service/HabitService.java`
- `backend/src/main/java/com/lifetrack/repository/UserHabitRepository.java`
- `backend/src/main/java/com/lifetrack/repository/DailyHabitCompletionRepository.java`
- `backend/src/main/java/com/lifetrack/entity/UserHabit.java`
- `backend/src/main/java/com/lifetrack/entity/DailyHabitCompletion.java`

## Before the demonstration

1. Start MySQL and the current Spring backend.
2. Open `http://localhost:8080/swagger-ui/index.html`.
3. Login and authorize Swagger with a JWT.
4. Use today's PC-local date consistently in all examples.

The JSON examples below use `2026-07-29`. Replace it if demonstrating on another date.

---

## Part A: Daily Log merge

## Step 1: Confirm today's initial state

Execute:

```text
GET /api/daily-logs/today
```

Possible results:

```text
204 No Content -> no record exists today
200 OK         -> today's consolidated record already exists
```

This endpoint performs a targeted owner/date query. It does not load all Daily Logs and filter in React.

## Step 2: Submit the first partial check-in

Execute:

```text
POST /api/daily-logs/merge
```

Request:

```json
{
  "date": "2026-07-29",
  "sleepHours": 7.5,
  "sleepQuality": 4,
  "dayType": "STUDY_WORK",
  "morningMood": "good",
  "meals": [
    {
      "name": "Breakfast",
      "items": ["Oats", "Banana"]
    }
  ]
}
```

Expected:

```text
200 OK
```

The endpoint returns the complete saved record, including generated `id`.

### First-merge trace

```text
POST /api/daily-logs/merge
    -> JwtAuthenticationFilter
    -> DailyLogController.merge(@Valid DailyLogRequest)
    -> SecurityUtils.currentUserId()
    -> DailyLogService.merge()
    -> reject completely empty request
    -> select request date or LocalDate.now()
    -> DailyLogRepository.findByUserIdAndDate()
    -> create entity if absent
    -> copy supplied scalar fields
    -> validate supplied moods
    -> merge supplied meals
    -> DailyLogRepository.save()
    -> Hibernate INSERT or UPDATE
    -> DailyLogResponse
    -> 200 OK
```

## Step 3: Add information later without resending everything

Execute the same endpoint again:

```json
{
  "date": "2026-07-29",
  "waterIntake": 1200,
  "stressLevel": 3,
  "energyLevel": 4,
  "afternoonMood": "great",
  "meals": [
    {
      "name": "Lunch",
      "items": ["Rice", "Dal"]
    },
    {
      "name": "Breakfast",
      "items": ["Coffee"]
    }
  ]
}
```

Expected:

```text
200 OK
```

The response should still contain:

- the original sleep values;
- `STUDY_WORK`;
- morning mood `good`;
- Breakfast with Oats, Banana, and Coffee;
- the newly created Lunch;
- the new water, stress, energy, and afternoon mood values.

This proves the endpoint performs a merge rather than replacing the record.

## Step 4: Explain merge semantics

### Scalars

For scalar values:

```text
non-null request value -> overwrite stored value
null/omitted value     -> preserve stored value
```

This applies to:

- sleep hours;
- step target;
- water intake;
- sleep quality;
- stress;
- energy;
- productivity;
- day type;
- supplied mood slots.

### Meals

Meals are matched case-insensitively by name:

```text
"Breakfast" and "breakfast" -> same meal
```

Incoming non-blank items are appended unless the exact item already exists.

A new meal name creates a new meal entry, so users are not restricted to Breakfast and Dinner.

### Empty submissions

A request with no scalar, mood, habit, or non-empty meal item produces:

```text
400 Bad Request
```

This prevents meaningless empty database rows.

## Step 5: Prove one record per user/date

Execute:

```text
GET /api/daily-logs?date=2026-07-29
```

Expected:

```text
200 OK
```

The list contains one consolidated record, not one row per partial submission.

The database invariant is:

```text
UNIQUE (userId, date)
```

`DailyLogService` queries by user/date before saving, while the unique constraint provides final database protection.

## Step 6: Compare create/upsert, merge, and update

### `POST /api/daily-logs`

Uses full `apply()` semantics:

- finds or creates the record for the date;
- omitted nullable fields become null;
- omitted collections become empty;
- effectively replaces the record's content.

It is an upsert because the same user/date updates the existing row.

### `POST /api/daily-logs/merge`

Uses partial semantics:

- omitted values remain unchanged;
- meal items and legacy lists are accumulated;
- designed for repeated check-ins.

### `PUT /api/daily-logs/{id}`

Loads an owner-scoped historical record by ID and applies full replacement semantics.

This distinction is an important interview answer:

```text
POST full upsert -> complete date representation
POST merge       -> incremental command
PUT by ID        -> complete historical edit
```

## Step 7: Validate wellbeing ratings and enums

Submit:

```json
{
  "date": "2026-07-29",
  "sleepQuality": 6
}
```

Expected:

```text
400 Bad Request
```

Ratings are limited to 1–5 by Bean Validation.

Submit:

```json
{
  "date": "2026-07-29",
  "dayType": "VACATION"
}
```

Expected:

```text
400 Bad Request
```

Valid day types:

```text
STUDY_WORK
DAY_OFF
TRAVEL
SICK
UNUSUAL
```

Invalid enum JSON is rejected during deserialization and handled as a structured bad request.

## Step 8: Explain meal persistence

`DailyLog.Meal` contains:

```text
name
List<String> items
```

JPA cannot directly persist a nested collection inside another element collection. `MealListConverter` serializes the complete meal list as JSON into a `TEXT` column.

Advantages for this project:

- simple schema;
- API shape is preserved;
- arbitrary meal names and items are easy to store.

Trade-offs:

- individual food items are difficult to query with normal SQL;
- database-level relational integrity for items is limited;
- schema evolution requires converter compatibility.

---

## Part B: User-managed habits

## Step 9: List habits for a date

Execute:

```text
GET /api/habits?date=2026-07-29
```

New users correctly receive:

```json
[]
```

The backend does not seed fixed default habits.

## Step 10: Create a habit definition

Execute:

```text
POST /api/habits
```

Request:

```json
{
  "name": "Read for 20 minutes"
}
```

Expected:

```text
201 Created
```

Example:

```json
{
  "id": 9,
  "name": "Read for 20 minutes",
  "active": true,
  "completedToday": false
}
```

Save the returned habit ID.

### Create-habit trace

```text
POST /api/habits
    -> HabitController.createHabit(@Valid HabitRequest)
    -> SecurityUtils.currentUserId()
    -> HabitService.createHabit()
    -> countByUserIdAndActiveTrue()
    -> enforce maximum 5
    -> new UserHabit(userId, trimmedName)
    -> UserHabitRepository.save()
    -> 201 HabitResponse
```

The user starts with zero habits and may have at most five active habits. There is no hard minimum.

## Step 11: Complete the habit for a date

Execute:

```text
POST /api/habits/{id}/toggle
```

Set query parameters:

```text
date      = 2026-07-29
completed = true
```

Expected:

```json
{
  "habitId": 9,
  "completed": true
}
```

### Toggle trace

```text
POST /api/habits/{id}/toggle
    -> verify habit belongs to current user
    -> choose supplied date or LocalDate.now()
    -> find completion by userId + habitId + date
    -> update existing row
       OR create a new DailyHabitCompletion
    -> save
    -> return final state
```

The unique database constraint is:

```text
UNIQUE (user_id, habit_id, date)
```

Therefore, toggling changes one dated state instead of creating duplicate observations.

If `completed` is omitted:

```text
existing row -> invert current state
no row       -> create completed=true
```

## Step 12: Explain why two entities are necessary

`UserHabit` is the reusable definition:

```text
id
userId
name
active
activatedAt
deactivatedAt
createdAt
updatedAt
```

`DailyHabitCompletion` is a dated observation:

```text
userId
habitId
date
completed
createdAt
```

If the name were stored directly in each Daily Log:

- renaming would create inconsistent identity;
- analytics could not reliably group the same habit;
- soft deactivation and historical tracking would be harder;
- repeated strings would be duplicated.

## Step 13: Rename the habit

Execute:

```text
PUT /api/habits/{id}
```

Request:

```json
{
  "name": "Read before bed"
}
```

Expected:

```text
200 OK
```

The completion still points to the same habit ID. Renaming the definition does not delete completion rows.

Current semantic caveat: historical screens display the habit's current name, not a snapshot of the name used on that date.

## Step 14: Soft-deactivate the habit

Execute:

```text
DELETE /api/habits/{id}
```

Expected:

```text
204 No Content
```

Despite the HTTP method name, the service does not physically delete the entity. It sets:

```text
active = false
deactivatedAt = current instant
updatedAt = current instant
```

This preserves the definition and completion history.

## Step 15: Prove historical retrieval

Call:

```text
GET /api/habits?date=2026-07-29
```

The deactivated habit remains visible for the date on which it was active, with its completion state.

`HabitService` includes a habit when:

```text
activatedAt <= end of selected day
AND
deactivatedAt is null OR deactivatedAt >= start of selected day
```

It also includes a habit when a completion row exists for that date, providing an additional history safeguard.

The `active` property in the response describes whether the habit is active now. The field named `completedToday` actually represents completion for the requested target date when a historical date is supplied.

## Step 16: Demonstrate ownership

Login as another user and try:

```text
PUT /api/habits/{firstUserHabitId}
DELETE /api/habits/{firstUserHabitId}
POST /api/habits/{firstUserHabitId}/toggle
```

Expected:

```text
404 Not Found
```

All definition lookups include both habit ID and current user ID.

## Current limitations to state honestly

### Legacy Daily Log habit collections

`DailyLog` still contains:

```text
transactionalHabits
embeddedHabits
```

These are legacy compatibility fields. New user-managed habits use `UserHabit` and `DailyHabitCompletion`. The migration is not fully consolidated.

### Insight consistency still uses legacy collections

Current Spring/AI habit-consistency aggregation still checks the legacy Daily Log habit lists rather than the new completion table. This should be corrected before claiming that custom-habit completion drives all insights.

### Reactivation history

`UserHabit` stores one `activatedAt` and one `deactivatedAt`. Reactivating overwrites the activation timestamp and clears deactivation. That represents the latest lifecycle interval, not multiple activate/deactivate periods.

If repeated lifecycle periods must be historically exact, introduce a `HabitActivationPeriod` table.

### Relationship mapping

`DailyHabitCompletion` stores `habitId` as a scalar rather than a JPA `@ManyToOne`. The service enforces ownership/existence, but the current entity model does not declare a database foreign-key relationship through JPA.

## The browser side

Optional, for a UI-driven demonstration. Files:
`frontend/src/pages/DailyLogPage.jsx` and
`frontend/src/components/DailyLogHistory.jsx`.

### How the merge payload is built

The eleven scalar log fields (sleep, steps, water, the four 1–5 wellbeing
ratings, day type and the three moods) live in a single `form` state object with
one `setField(name, value)` updater, seeded from a module-level `EMPTY_FORM`.

`handleSave` converts that object into the merge request, and the conversion is
what makes partial check-ins work from the UI:

```text
''            -> null      (field omitted from the user's intent)
'7.5'         -> 7.5       parseFloat for sleepHours / waterIntake
'4'           -> 4         parseInt for the 1-5 ratings and stepTarget
```

An all-blank form is rejected in the browser before any request is sent, with
the same intent as the server-side empty-submission rule in Step 4:

```text
Object.values(form).every((v) => v === '')
  && completedHabitNames.length === 0
  && meals.length === 0
```

This is a convenience guard, not the authority. The service still rejects an
empty merge independently.

### Editing a historical record

`handleEdit` repopulates `form` from a history row. Note the deliberate
asymmetry, because it matters for a stored value of `0`:

```text
numeric fields  ->  log.sleepHours != null ? String(log.sleepHours) : ''
string fields   ->  log.dayType || ''
```

Using `||` on the numeric fields would blank out a legitimately stored zero.
Editing then targets `PUT /api/daily-logs/{id}` (full replacement, Step 6)
rather than the merge endpoint.

### Habits

The habit checkbox is optimistic with rollback, matching the pattern used
elsewhere in the app:

```text
flip completedToday locally
    -> await habitApi.toggle(id, targetDate, nextCompleted)
       failure -> restore the previous value and show the error
```

`targetDate` is `editingDate || todayIso()`, so toggling while editing a past
log records the completion against **that** date, not today. The five-active-habit
limit is checked in the browser for immediate feedback and enforced by the
service regardless.

### History tab

Rendered by `DailyLogHistory`, which receives `logs`, `loading`, `error`,
`onEdit` and `onDelete` as props and owns no fetching. Deletion is optimistic
with a snapshot rollback. All dates come from `frontend/src/lib/date.js`, so the
UI's notion of "today" is the machine's local calendar date and matches the
`date` field the merge endpoint receives.

## Concise interview narration

> Daily Log is not ordinary append-only CRUD. A unique user/date key represents one logical day, while the merge endpoint accepts multiple partial check-ins without clearing omitted values. Scalars overwrite only when supplied, and meals merge by case-insensitive name while preserving items. Meals are stored through a JSON converter because they contain a nested item list. Habits use a separate definition-and-observation model: UserHabit stores the reusable user-owned definition, and DailyHabitCompletion stores one completion state per habit/date. Deactivation is soft so history remains available. All reads and writes are scoped to the JWT user.

## Cleanup

Use the History/Delete functions only if deleting the demonstration Daily Log is appropriate. Habit deletion is soft, so the demonstration habit remains in the database by design.
