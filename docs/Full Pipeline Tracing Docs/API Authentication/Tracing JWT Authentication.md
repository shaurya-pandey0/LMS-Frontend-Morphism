# Tracing JWT Authentication Through Swagger

This walkthrough demonstrates the complete LifeTrack authentication pipeline:

```text
registration/login
    -> validation
    -> BCrypt or AuthenticationManager
    -> database-backed UserDetails
    -> signed JWT
    -> Swagger authorization
    -> JwtAuthenticationFilter
    -> SecurityContext
    -> protected owner-scoped endpoint
```

## Why this is interview-critical

Every protected LifeTrack feature depends on this pipeline. It explains:

- how passwords are stored and checked;
- how a stateless JWT is issued;
- how later requests become authenticated;
- how roles become Spring authorities;
- how services obtain the trusted current-user ID;
- why request bodies never choose record ownership.

## Relevant files

- `backend/src/main/java/com/lifetrack/config/SecurityConfig.java`
- `backend/src/main/java/com/lifetrack/config/JwtProperties.java`
- `backend/src/main/java/com/lifetrack/config/OpenApiConfig.java`
- `backend/src/main/java/com/lifetrack/controller/AuthController.java`
- `backend/src/main/java/com/lifetrack/dto/AuthDtos.java`
- `backend/src/main/java/com/lifetrack/dto/UserDto.java`
- `backend/src/main/java/com/lifetrack/service/AuthService.java`
- `backend/src/main/java/com/lifetrack/security/JwtService.java`
- `backend/src/main/java/com/lifetrack/security/JwtAuthenticationFilter.java`
- `backend/src/main/java/com/lifetrack/security/CustomUserDetailsService.java`
- `backend/src/main/java/com/lifetrack/security/UserPrincipal.java`
- `backend/src/main/java/com/lifetrack/security/SecurityUtils.java`
- `backend/src/main/java/com/lifetrack/repository/UserRepository.java`
- `backend/src/main/java/com/lifetrack/entity/User.java`

## Before the demonstration

1. Start MySQL.
2. Start the current Spring Boot backend.
3. Open:

```text
http://localhost:8080/swagger-ui/index.html
```

4. Confirm `auth-controller` is visible.

## Step 1: Register a user

Execute:

```text
POST /api/auth/register
```

Use a unique email:

```json
{
  "fullName": "Interview Demo",
  "email": "interview.demo@example.com",
  "password": "password123"
}
```

Expected result:

```text
201 Created
```

Example response:

```json
{
  "token": "<signed JWT>",
  "tokenType": "Bearer",
  "user": {
    "id": 12,
    "fullName": "Interview Demo",
    "email": "interview.demo@example.com",
    "role": "USER"
  }
}
```

### Registration trace

```text
POST /api/auth/register
    -> AuthController.register(@Valid RegisterRequest)
    -> AuthService.register()
    -> UserRepository.existsByEmail()
    -> PasswordEncoder.encode()
    -> UserRepository.save()
    -> JwtService.generateToken()
    -> UserDto.from()
    -> 201 AuthResponse
```

`RegisterRequest` enforces:

```text
fullName  non-blank
email     non-blank and valid email form
password  non-blank and at least 8 characters
```

`AuthService` additionally enforces email uniqueness. This is a domain rule because it requires a database lookup.

The password sent by the client is never stored directly. `BCryptPasswordEncoder` stores a salted, one-way hash in `users.password`.

The response uses `UserDto`, which excludes the password hash and internal creation timestamp.

## Step 2: Show registration failures

### Invalid password

Submit:

```json
{
  "fullName": "Interview Demo",
  "email": "another@example.com",
  "password": "short"
}
```

Expected:

```text
400 Bad Request
```

This is DTO validation.

### Duplicate email

Submit the original registration request again.

Expected:

```text
400 Bad Request
```

This is service-level validation after `existsByEmail()`.

Interview explanation:

> Bean Validation checks the request shape. The service checks rules that depend on application state.

## Step 3: Login

Execute:

```text
POST /api/auth/login
```

Request:

```json
{
  "email": "interview.demo@example.com",
  "password": "password123"
}
```

Expected:

```text
200 OK
```

### Login trace

```text
POST /api/auth/login
    -> AuthController.login(@Valid LoginRequest)
    -> AuthService.login()
    -> AuthenticationManager.authenticate()
    -> DaoAuthenticationProvider
    -> CustomUserDetailsService.loadUserByUsername(email)
    -> UserRepository.findByEmail()
    -> UserPrincipal
    -> BCryptPasswordEncoder.matches(raw, storedHash)
    -> authenticated principal
    -> JwtService.generateToken()
    -> 200 AuthResponse
```

`AuthService` does not manually compare password strings. It delegates to Spring Security's `AuthenticationManager`, configured with:

```text
DaoAuthenticationProvider
UserDetailsService
BCryptPasswordEncoder
```

This separation keeps credential verification inside the security framework.

## Step 4: Understand the JWT

`JwtService` creates an HMAC-signed token containing:

```text
subject  user's email
uid      user's database ID
role     USER or ADMIN
iat      issued-at time
exp      expiration time
```

The default expiry is:

```text
86,400,000 ms = 24 hours
```

The secret and expiration are bound through `JwtProperties` using:

```text
app.jwt.secret
app.jwt.expiration-ms
```

The JWT is signed, not encrypted. Its payload can be decoded by a client, so no password or sensitive private data belongs inside it. The signature prevents undetected modification.

## Step 5: Authorize Swagger

Copy the `token` value from login.

1. Select **Authorize**.
2. Enter only the token value.
3. Confirm authorization.

`OpenApiConfig` declares an HTTP Bearer security scheme, so Swagger adds:

```text
Authorization: Bearer <JWT>
```

Do not include JSON quotes.

## Step 6: Call a protected endpoint

Execute:

```text
GET /api/auth/me
```

Expected:

```text
200 OK
```

Example:

```json
{
  "id": 12,
  "fullName": "Interview Demo",
  "email": "interview.demo@example.com",
  "role": "USER"
}
```

### Protected-request trace

```text
Authorization header
    -> JwtAuthenticationFilter
    -> remove "Bearer " prefix
    -> JwtService.isTokenValid()
    -> verify HMAC signature
    -> verify expiration
    -> extract email subject
    -> CustomUserDetailsService.loadUserByUsername()
    -> UserPrincipal with ROLE_USER
    -> UsernamePasswordAuthenticationToken
    -> SecurityContextHolder
    -> AuthController.me()
    -> SecurityUtils.currentPrincipal()
    -> UserDto
```

The filter reloads the user from MySQL instead of trusting every claim as current account state. That means current role and account data come from the database-backed principal.

## Step 7: Prove stateless behavior

Spring configures:

```text
SessionCreationPolicy.STATELESS
```

The server does not create a login session. Every protected request must carry the token.

Remove Swagger authorization and call:

```text
GET /api/auth/me
```

Expected:

```text
401 Unauthorized
```

Authorize again and repeat; it succeeds without a server session.

## Step 8: Demonstrate role authorization

As a normal `USER`, execute:

```text
GET /api/admin/stats
```

Expected:

```text
403 Forbidden
```

The request is authenticated, but:

```java
.requestMatchers("/api/admin/**").hasRole("ADMIN")
```

requires `ROLE_ADMIN`.

This demonstrates:

```text
401 -> identity is missing or invalid
403 -> identity is known but lacks permission
```

## Step 9: Connect authentication to ownership

Call:

```text
POST /api/expenses
```

The expense JSON contains no `userId`. The controller uses:

```text
SecurityUtils.currentUserId()
```

This ID comes from the authenticated `UserPrincipal`, not from client input.

Repository reads use patterns such as:

```text
findByIdAndUserId(recordId, currentUserId)
```

Authentication establishes identity. Owner-scoped queries enforce data isolation.

## SecurityConfig decisions

### Public routes

```text
/api/auth/**
GET /api/health
/v3/api-docs/**
/swagger-ui/**
/actuator/**
OPTIONS /**
```

### Protected routes

```text
all other API routes -> authenticated
/api/admin/**        -> ROLE_ADMIN
```

### Why CSRF is disabled

The API is stateless and authenticates using an explicit Bearer token rather than an automatically attached server session cookie. CSRF protection is mainly designed for cookie-authenticated requests.

This does not eliminate XSS risk. The current frontend stores JWT in `localStorage`, so a successful script injection could read it. This is a deliberate simplicity trade-off, not an oversight; the alternative is an httpOnly cookie, which then reintroduces the CSRF concern this section just dismissed.

### How the frontend holds the token

Relevant when tracing the browser half of this flow:

- `frontend/src/lib/api.js` keeps the token under `lifetrack.token` and attaches
  `Authorization: Bearer <jwt>` in an axios request interceptor. A call passing
  `skipAuth: true` sends no header — that is how `/api/auth/login` and
  `/api/auth/register` avoid sending a stale token.
- `frontend/src/store/authSlice.js` is the single owner of auth state (`user`,
  `token`, `loading`) via Redux Toolkit, mirroring both into `localStorage`
  (`lifetrack.token`, `lifetrack.user`).
- `frontend/src/lib/auth.jsx` exposes `useAuth()`. Pages never read the store
  directly.
- On a hard refresh with a stored token but no cached user, `AuthInit` dispatches
  `fetchMe()` → `GET /api/auth/me` to re-hydrate.
- When Spring answers `401`, the response interceptor clears the token and
  dispatches a `lifetrack:unauthorized` window event; `AuthInit` listens and
  clears auth state. The event exists to avoid a circular import between
  `api.js` and the store — expect to be asked why it is not a direct dispatch.

### Why CORS still matters

React and Spring use different origins:

```text
http://localhost:5173
http://localhost:8080
```

CORS controls whether a browser allows that cross-origin request. It does not authenticate the user and should never replace JWT validation.

## Common interview questions

### Why BCrypt instead of encryption?

Passwords should not be recoverable. BCrypt is deliberately slow, salted, and one-way. Authentication checks whether the submitted password matches the stored hash.

### Why JWT instead of a session?

JWT supports a stateless API and is convenient for separate frontend/backend deployments. The trade-offs include revocation difficulty, token theft risk, and careful expiry/refresh handling.

### Is the JWT secure because it is Base64?

No. Base64 is encoding. Security comes from the HMAC signature and protection of the signing secret.

### Why load the user again after validating the token?

It creates a current database-backed principal and authorities. A token subject alone is not used as the full application user object.

### Why not trust the `uid` claim directly?

The current implementation uses the token's email subject to reload the user. This avoids using a client-visible claim as the only source of current role/account state.

### What is missing for production authentication?

- refresh-token strategy;
- password reset;
- email verification;
- token revocation or rotation;
- hardened secret management;
- rate limiting and login-attempt controls;
- secure production handling of browser tokens;
- restriction of Swagger and Actuator.

## Concise interview narration

> Registration validates input, rejects duplicate emails, hashes the password with BCrypt, persists the user, and returns a signed JWT. Login delegates verification to Spring Security's AuthenticationManager, which loads a UserPrincipal from MySQL and checks the BCrypt hash. Every later request carries the JWT. A once-per-request filter verifies its signature and expiry, reloads the user, and establishes the SecurityContext. Controllers then derive the current user ID from that trusted principal, while owner-scoped repository queries enforce isolation. Missing authentication produces 401; insufficient role authority produces 403.

## Demonstration cleanup

The registration endpoint creates a real database user. Use a clearly named demo account and remove it manually after the interview only if cleanup is necessary and safe.
