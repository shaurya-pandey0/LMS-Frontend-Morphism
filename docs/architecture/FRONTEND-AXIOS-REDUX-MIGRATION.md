# Frontend Migration: Fetch to Axios and Context to Redux

## Purpose

This migration modernized LifeTrack's frontend infrastructure without changing its Spring Boot API contracts, Bearer JWT authentication, routes, page behavior, or visual design.

The final frontend stack is:

`React UI → Redux Toolkit authentication → Axios API clients → Spring Boot / FastAPI`

Redux manages shared authentication state. Axios manages HTTP communication. Page-specific form and server data remain inside their respective React components.

## 1. Fetch to Axios

### Before

The frontend used custom `fetch()` calls. Each request had to manually handle:

- Base URLs
- JSON conversion
- Authorization headers
- HTTP errors
- Network failures
- FastAPI validation errors

### After

`frontend/src/lib/api.js` uses two Axios client instances:

- `springClient` for Spring Boot at `/api`
- `aiClient` for the FastAPI AI service

The Spring client request interceptor reads `lifetrack.token` from `localStorage` and adds:

```http
Authorization: Bearer <JWT>
```

Response interceptors:

- Return `response.data` directly
- Convert Spring and FastAPI failures into `ApiError`
- Preserve request cancellation
- Clear authentication and emit `lifetrack:unauthorized` after a Spring `401`
- Provide a readable message when either backend is unreachable

Domain helpers such as `expenseApi.create()`, `dailyLogApi.merge()`, and `aiApi.insights()` kept simple interfaces, so pages did not need to understand Axios configuration.

No direct `fetch()` calls remain in `frontend/src`.

## 2. AuthContext to Redux Toolkit

### Before

Authentication state was owned by React `AuthContext`.

### After

Authentication is handled by:

- `frontend/src/store/authSlice.js` — state, reducers, and async thunks
- `frontend/src/store/index.js` — Redux store configuration
- `frontend/src/lib/auth.jsx` — Redux-backed `useAuth()` compatibility hook and startup initialization
- `frontend/src/main.jsx` — wraps the application with Redux `Provider`

The auth slice stores:

- `user`
- `token`
- `loading`

It provides:

- `loginThunk`
- `registerThunk`
- `fetchMe`
- `setAuth`
- `clearAuth`

The existing `useAuth()` interface was preserved, so pages can still access:

```text
user, token, isAuthenticated, isAdmin, loading,
login, register, logout
```

The JWT and cached user are restored from `localStorage` when the application starts. `AuthInit` refreshes the user through `/auth/me` and listens for the Axios unauthorized event. An invalid or expired JWT therefore clears Redux state and local storage consistently.

## 3. Authentication Flow

### Login

1. The login page calls the Redux-backed `login()`.
2. `loginThunk` calls `authApi.login()`.
3. Axios sends the request to Spring Boot.
4. Spring returns the user and JWT.
5. Redux stores the user and token.
6. The session is persisted in `localStorage`.
7. Future Spring requests receive the Bearer token through the Axios interceptor.

### Page Refresh

1. Redux initializes from saved authentication data.
2. `AuthInit` calls `fetchMe`.
3. Axios sends `GET /auth/me` with the JWT.
4. Spring validates the token.
5. Redux refreshes the authenticated user.

### Expired or Invalid JWT

1. Spring responds with `401 Unauthorized`.
2. The Axios interceptor removes the saved token.
3. Axios emits `lifetrack:unauthorized`.
4. `AuthInit` dispatches `clearAuth`.
5. Redux and local storage are cleared.

## 4. Scope Decisions

Redux is intentionally limited to shared authentication state.

The following remain outside Redux:

- Page form fields
- Daily logs
- Expenses
- Journals
- Analytics responses
- AI chat messages
- Component-only UI state

This keeps the Redux store small and avoids moving data into global state when only one page needs it.

Cookie authentication was not introduced. The existing Spring Security Bearer JWT contract remains unchanged, avoiding unnecessary backend, CORS, credential, and CSRF changes.

## 5. Tests Added

The frontend uses Vitest, jsdom, and React Testing Library.

`authSlice.test.js` verifies:

- `setAuth`
- `clearAuth`
- Login success and failure
- Registration
- `/auth/me` hydration
- Session restoration from `localStorage`
- `isAuthenticated` and admin-role behavior

`authFlowIntegration.test.jsx` verifies:

- A `401` unauthorized event logs the user out
- Redux and `localStorage` are cleared
- Failed login displays the backend error message

## 6. Verification

The migration checkpoint passed:

```text
npm test       — 10 tests passed
npm run lint   — 0 errors
npm run build  — production build succeeded
```

## Final Result

LifeTrack now uses Axios for HTTP communication and Redux Toolkit for shared authentication state while preserving the existing Spring Security JWT workflow. The migration is isolated, tested, and does not introduce cookies or unnecessary global application state.
