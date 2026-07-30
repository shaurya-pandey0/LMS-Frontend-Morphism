# Tracing the Create Expense Feature Through Swagger

This guide demonstrates one complete LifeTrack feature during an interview:

1. authenticate with JWT;
2. create an expense;
3. prove that MySQL persisted it;
4. show that analytics consumes the same record;
5. demonstrate backend validation and user ownership;
6. update and delete the record.

The entire demonstration can be performed through Swagger UI without using the React frontend.

## What this feature demonstrates

The Expense feature is a useful vertical slice because it crosses every backend layer:

```text
Swagger HTTP request
    -> Spring Security and JWT authentication
    -> ExpenseController
    -> ExpenseRequest validation
    -> ExpenseService business rules
    -> ExpenseRepository
    -> Hibernate/JPA
    -> MySQL expenses table
    -> ExpenseResponse JSON
    -> AnalyticsService aggregation
```

The authenticated user ID is taken from the JWT. It is never accepted from the request body. This prevents one user from creating, reading, changing, or deleting another user's expenses.

## Relevant source files

- `backend/src/main/java/com/lifetrack/config/OpenApiConfig.java`
- `backend/src/main/java/com/lifetrack/config/SecurityConfig.java`
- `backend/src/main/java/com/lifetrack/security/JwtAuthenticationFilter.java`
- `backend/src/main/java/com/lifetrack/controller/AuthController.java`
- `backend/src/main/java/com/lifetrack/controller/ExpenseController.java`
- `backend/src/main/java/com/lifetrack/dto/ExpenseDtos.java`
- `backend/src/main/java/com/lifetrack/service/ExpenseService.java`
- `backend/src/main/java/com/lifetrack/repository/ExpenseRepository.java`
- `backend/src/main/java/com/lifetrack/entity/Expense.java`
- `backend/src/main/java/com/lifetrack/exception/GlobalExceptionHandler.java`
- `backend/src/main/java/com/lifetrack/controller/AnalyticsController.java`
- `backend/src/main/java/com/lifetrack/service/AnalyticsService.java`

## Before the interview

1. Start MySQL.
2. Start the current Spring Boot backend on port `8080`.
3. Open:

```text
http://localhost:8080/swagger-ui/index.html
```

4. Confirm that Swagger displays the `auth-controller`, `expense-controller`, and `analytics-controller` sections.
5. Keep one valid user account ready, or register a demonstration account through Swagger.

If an endpoint recently added to the source is absent from Swagger, restart Spring Boot. Compiling does not replace an already-running Java process.

## Step 1: Authenticate

Expand:

```text
POST /api/auth/login
```

Select **Try it out** and use a valid account:

```json
{
  "email": "demo@example.com",
  "password": "password123"
}
```

Select **Execute**.

Expected result:

```text
200 OK
```

The response contains a JWT and a safe user representation:

```json
{
  "token": "<JWT>",
  "tokenType": "Bearer",
  "user": {
    "id": 1,
    "fullName": "Demo User",
    "email": "demo@example.com",
    "role": "USER"
  }
}
```

Copy only the value of `token`. Select Swagger's **Authorize** button, enter the token, and confirm authorization. Because the configured scheme is HTTP Bearer, Swagger adds the `Bearer` prefix to protected requests.

Interview explanation:

> Login is public, but expense operations require authentication. The JWT filter validates the token and creates the Spring Security principal used by `SecurityUtils.currentUserId()`.

## Step 2: Create an expense

Expand:

```text
POST /api/expenses
```

Select **Try it out** and submit:

```json
{
  "date": "2026-07-28",
  "category": "Food",
  "amount": 250.0
}
```

Use the current date during a live interview if preferred.

Expected result:

```text
201 Created
```

Example response:

```json
{
  "id": 42,
  "date": "2026-07-28",
  "category": "Food",
  "amount": 250.0
}
```

Save the returned `id`; later steps use it.

### What happens internally

`ExpenseController.create()`:

- matches `POST /api/expenses`;
- converts JSON into `ExpenseRequest`;
- runs Bean Validation through `@Valid`;
- obtains the user ID from the authenticated principal;
- calls `ExpenseService.create()`;
- maps the saved entity to `ExpenseResponse`;
- returns `201 Created`.

`ExpenseRequest` accepts:

```text
date      LocalDate; optional, defaults to the backend's current date
category  non-blank string
amount    positive number
```

`ExpenseService` owns the business rules:

- it checks the category against backend-controlled reference vocabulary;
- it uses `LocalDate.now()` when the date is omitted;
- it attaches the authenticated user ID;
- it delegates persistence to `ExpenseRepository`.

Current valid categories are:

```text
Food
Housing
Travel
Wellness
Misc
```

`ExpenseRepository.save()` causes Hibernate to insert a row into the `expenses` table. MySQL generates the primary key because `Expense.id` uses `GenerationType.IDENTITY`.

The API response deliberately excludes `userId` and `createdAt`. They are internal persistence details, not part of the public expense contract.

## Step 3: Prove persistence and date filtering

Expand:

```text
GET /api/expenses
```

Set:

```text
from = 2026-07-28
to   = 2026-07-28
```

Select **Execute**.

Expected result:

```text
200 OK
```

The returned list should contain the new expense. This request reads the record again from the repository; it is not returning temporary React state.

Date-range behavior:

- both dates are inclusive;
- results are sorted newest first;
- if only `to` is supplied, `from` defaults to the first day of that month;
- if only `from` is supplied, `to` defaults to the backend's current date;
- `from` after `to` produces `400 Bad Request`.

You can also prove the generated ID directly:

```text
GET /api/expenses/{id}
```

Use the ID returned by the create request.

## Step 4: Show downstream analytics

Expand:

```text
GET /api/analytics
```

Use the same range:

```text
from = 2026-07-28
to   = 2026-07-28
```

Select **Execute**.

The response should now reflect the created expense in:

- `dailyExpenses`;
- `expensesByCategory`;
- `totalExpenses`;
- `budgetUsagePct`.

This proves that the feature is more than isolated CRUD. `AnalyticsService` queries the same persisted expense rows and performs aggregation in Spring Boot. The frontend only plots the returned values.

Interview explanation:

> The create endpoint writes a normalized expense record. A separate read model aggregates those records for charts. Business calculations stay in Spring, while React remains a presentation layer.

## Step 5: Demonstrate validation

### DTO validation

Run `POST /api/expenses` with a non-positive amount:

```json
{
  "date": "2026-07-28",
  "category": "Food",
  "amount": 0
}
```

Expected result:

```text
400 Bad Request
```

`@Positive` rejects the request before the service writes anything.

### Business vocabulary validation

Run the request with an unsupported category:

```json
{
  "date": "2026-07-28",
  "category": "Entertainment",
  "amount": 100
}
```

Expected result:

```text
400 Bad Request
```

The DTO can prove that the category is non-blank, but only `ExpenseService` knows whether it belongs to the server-controlled category catalogue. This distinction is useful in an interview:

```text
DTO validation      -> structural input rules
Service validation  -> domain and business rules
Database constraints -> final persistence integrity
```

`GlobalExceptionHandler` converts validation and domain exceptions into consistent JSON error responses.

### Invalid date range

Run:

```text
GET /api/expenses?from=2026-07-29&to=2026-07-28
```

Expected result:

```text
400 Bad Request
```

The service rejects an inverted range instead of silently returning misleading data.

## Step 6: Update the expense

Expand:

```text
PUT /api/expenses/{id}
```

Use the created ID and submit:

```json
{
  "date": "2026-07-28",
  "category": "Wellness",
  "amount": 300.0
}
```

Expected result:

```text
200 OK
```

The service first calls `findByIdAndUserId(id, currentUserId)`. This is important: lookup and ownership enforcement happen in one repository query. It then reapplies the same category and amount rules used during creation.

Run the analytics request again. The totals and category breakdown should reflect the updated record.

## Step 7: Demonstrate ownership

For a longer interview demonstration:

1. copy the expense ID created by User A;
2. log in as User B and replace the Swagger authorization token;
3. call `GET`, `PUT`, or `DELETE /api/expenses/{id}` using User A's ID.

Expected result:

```text
404 Not Found
```

The repository searches by both ID and authenticated user ID. Returning 404 avoids revealing whether another user's record exists.

Never add `userId` to `ExpenseRequest`. Ownership must continue to come exclusively from the validated JWT.

## Step 8: Delete and verify cleanup

Re-authorize as the original user if the ownership demonstration was performed.

Expand:

```text
DELETE /api/expenses/{id}
```

Use the created ID.

Expected result:

```text
204 No Content
```

Then call:

```text
GET /api/expenses/{id}
```

Expected result:

```text
404 Not Found
```

Run the same analytics range once more. The deleted amount should no longer contribute to totals or category aggregation.

## Step 9: The browser side of the same slice

Optional, for when the demonstration runs through the UI rather than Swagger.
The relevant file is `frontend/src/pages/ExpensesPage.jsx`.

Loading uses the shared `useApi` hook, so the expense list and the analytics
summary arrive from one `fetchFn` and share a single loading flag and error
string.

Writes are optimistic, then reconciled:

```text
user submits the form
    -> await expenseApi.create(payload)         (POST /api/expenses, JWT attached)
    -> setData: prepend the returned row to txns
    -> reload()                                 (re-read list + analytics)
```

Delete is the interesting one, because it shows the rollback:

```text
snapshot = current data
    -> setData: remove the row immediately
    -> await expenseApi.remove(id)
       success -> reload()
       failure -> setData(snapshot) and show the error
```

Two points worth making explicitly if asked:

- The row the UI keeps is the row **Spring returned**, not the object the form
  submitted. The server-assigned `id` and any server-applied date default are
  therefore what get rendered.
- After a successful write the page still calls `reload()`. The optimistic
  update is only for perceived latency; the trusted totals in section "Step 4"
  are re-fetched rather than adjusted locally.

Dates come from `frontend/src/lib/date.js`. An omitted date field sends
`todayIso()`, the browser's local calendar date, which matches the service-side
default described in Step 2.

## A concise interview narration

> I will demonstrate Expenses as one complete vertical slice. I first authenticate and give Swagger the JWT. I create an expense using only date, category, and amount; user ownership comes from the token rather than the body. The controller validates the request contract, the service applies server-owned category rules and date defaults, and the repository persists the entity through Hibernate to MySQL. I read it back through a date-filtered endpoint to prove persistence, then call Analytics to show that another backend service aggregates the same record. Finally, I demonstrate invalid input, ownership isolation, update, and deletion.

## Common problems during the demonstration

### `401 Unauthorized`

- Swagger has not been authorized;
- the token expired;
- the token was copied with quotes;
- log in again and replace the authorized token.

### Endpoint missing from Swagger

The running Spring process is older than the current source. Stop it and restart the backend. A Maven compile alone does not reload the server.

### `403 Forbidden`

Inspect the actual request in the browser Network panel:

- if `OPTIONS` fails, check the exact frontend origin against CORS configuration;
- if preflight succeeds but the endpoint is absent from Swagger, the backend process is stale;
- do not disable JWT security as a workaround.

### `400 Bad Request`

Read the response body. It distinguishes field validation from domain validation. Confirm that:

- amount is greater than zero;
- category matches the backend reference list;
- dates use `YYYY-MM-DD`;
- `from` is not after `to`.

### Created record does not appear in a range

Ensure the create date is inside the inclusive `from` and `to` values used by both the Expense and Analytics requests.
