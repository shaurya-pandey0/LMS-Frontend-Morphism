# LifeTrack Frontend — a guide for backend developers

This is written for people who are strong in Java/Spring or Python but have
never really worked in React. It explains how this specific app works, not
React in the abstract. Styling and design are deliberately out of scope: the CSS
here is large and intricate, and you do not need to understand it to work on
behaviour.

Read it top to bottom once. After that, the "Common tasks" and "Gotchas"
sections are the ones you will come back to.


---
It teaches from your actual code rather than generic React. Structure:

**Foundations** — the mental shift first: the server sends one empty `<div id="root">`, JavaScript builds everything, and you never write "update this label", you describe what the screen should look like for given data. Then components, JSX, props, and the three ideas that cause the most confusion: setting state is not immediate, state must be replaced rather than mutated, and inputs are "controlled" by state.

**Hooks explained by why they exist here** — `useEffect` with the dependency array and the `cancelled` cleanup flag that appears everywhere, including why StrictMode makes every fetch run twice in dev. `useCallback`/`useMemo`/`useRef` get one table each tied to the real line that needs them, e.g. `fetchExpenses` must keep its identity or `useApi` refetches forever.

**Redux from scratch** — the parts mapped to backend concepts (store, slice, action, reducer, dispatch, thunk), then the auth slice walked through line by line. It states plainly that Redux here holds **only** auth, so nobody hunts for an `expensesSlice`, and explains `.unwrap()`, why `isAuthenticated` is derived rather than stored, and that `useSelector`/`useDispatch` live in exactly one file behind `useAuth()`.

**Three end-to-end traces** — adding an expense (fetch, controlled form, create vs edit via `editingId`, optimistic delete with snapshot rollback, and why it patches local state *and* refetches), then login/refresh/logout including the `loading` flag that stops a refresh bouncing users to `/login`, then the AI chat showing that Spring computes the numbers and FastAPI only writes prose, with command mode's draft-then-confirm so the AI never writes to the database.

**Practical sections** — a file map, "common tasks" recipes (add a page, add an endpoint, add a form field), the 10 conventions the code follows, 20 gotchas ordered by how often they bite, the test setup, a 30-term glossary, and a suggested reading order that gets someone oriented in about an hour.

A few things I documented because they are genuinely hard to discover by reading: the axios response interceptors return `response.data`, so `await expenseApi.list()` is already the body and `.data` is `undefined`; the 401 handler bridges `api.js` to Redux through a `window` DOM event named `lifetrack:unauthorized`, which is the only link between those two files; and `AppShell active="expenses"` is a magic string that must match a `NAV_ITEMS` id or the highlight silently disappears.

I also recorded the inconsistencies rather than smoothing over them, since they will confuse a newcomer more than they'd confuse you: two competing data-loading patterns (`useApi` in three pages, hand-rolled effects in two), the camelCase→snake_case mapping duplicated in `JournalPage` and `DashboardPage`, `DonutChart` defined twice with different props contracts, `auth.error` in the store config referring to a field the slice doesn't have, and the auth reducers writing to localStorage inside the reducer body.

Facts verified against the code rather than assumed: `NAV_ITEMS` is the real constant name, and `DailyLogPage.jsx` is 822 lines with 18 `useState` calls — I'd initially written "~1000 lines, a dozen-plus" and corrected it.



---

## Contents

1. [Run it locally](#1-run-it-locally)
2. [The one big mental shift](#2-the-one-big-mental-shift)
3. [React in this codebase](#3-react-in-this-codebase)
4. [How a page gets on screen](#4-how-a-page-gets-on-screen)
5. [Routing](#5-routing)
6. [Redux, explained from scratch](#6-redux-explained-from-scratch)
7. [Context: the other shared state](#7-context-the-other-shared-state)
8. [Talking to the backends](#8-talking-to-the-backends)
9. [Loading data into a page](#9-loading-data-into-a-page)
10. [Full trace: adding an expense](#10-full-trace-adding-an-expense)
11. [Full trace: login, refresh, logout](#11-full-trace-login-refresh-logout)
12. [Full trace: the AI chat](#12-full-trace-the-ai-chat)
13. [Where things live](#13-where-things-live)
14. [Common tasks](#14-common-tasks)
15. [Rules this codebase follows](#15-rules-this-codebase-follows)
16. [Gotchas that waste an afternoon](#16-gotchas-that-waste-an-afternoon)
17. [Tests](#17-tests)
18. [Glossary](#18-glossary)

---

## 1. Run it locally

```bash
cd frontend
npm install       # once
npm run dev       # http://localhost:5173
npm test          # vitest, runs once and exits
npm run lint
npm run build     # production bundle into dist/
```

You need the Spring backend on `http://localhost:8080` and, for AI features, the
FastAPI service on `http://localhost:8100`. Those addresses come from
`frontend/.env`:

```
VITE_API_BASE_URL=http://localhost:8080/api
VITE_AI_BASE_URL=http://localhost:8100
```

**These are compile-time values, not runtime config.** Vite finds every
`import.meta.env.VITE_*` and pastes the literal string into the built JavaScript.
Editing `.env` after a build changes nothing until you rebuild. That is why
`frontend/Dockerfile` takes them as build arguments.

### Stack

| Thing | Version | What it is |
|---|---|---|
| React | 19 | Builds the HTML in the browser |
| Vite | 8 | Dev server and bundler (like Maven, but for JS, and instant) |
| react-router-dom | 7 | Maps URLs to components, without hitting the server |
| Redux Toolkit + react-redux | 2 / 9 | One shared store. Here it holds **only** the logged-in user |
| axios | 1 | HTTP client (the `RestTemplate` of JS) |
| react-markdown | 10 | Renders the AI's markdown replies |
| vitest + jsdom + Testing Library | — | Test runner and a fake browser |

Plain JavaScript, not TypeScript. Files ending in `.jsx` contain HTML-like markup
(see below); `.js` files do not.

---

## 2. The one big mental shift

In a classic server-rendered app, the server builds HTML and sends it. The
browser is mostly a display.

Here, the server sends **one nearly empty HTML file**. `frontend/index.html` is
essentially:

```html
<div id="root"></div>
<script type="module" src="/src/main.jsx"></script>
```

That's it. Everything you see is built by JavaScript inside `<div id="root">`.
Navigating to `/expenses` does not ask the server for a page — JavaScript swaps
what is inside that div. The server is only ever asked for JSON.

The second shift is the important one:

> **You never write "update this piece of the screen". You describe what the
> screen should look like for a given set of data, and React works out the
> changes.**

In Java terms: no `label.setText(...)`. You write a function
`render(data) -> markup`, you change `data`, and React re-runs the function and
patches the real page to match. The whole framework is that idea, plus tools for
holding `data` and reacting to changes.

---

## 3. React in this codebase

### 3.1 A component is a function

```jsx
export default function AppShell({ active, children, dataScreenLabel, sidebar }) {
  return (
    <div className="app-shell" data-screen-label={dataScreenLabel}>
      {sidebar || <Sidebar active={active} />}
      <main className="app-main">
        <div className="app-main__content">{children}</div>
      </main>
    </div>
  );
}
```
*(`src/components/AppShell.jsx`, real code)*

A component is a function whose name starts with a capital letter and which
returns markup. `<AppShell active="expenses">…</AppShell>` calls that function.

Rules worth knowing immediately:

- Capital letter matters. `<sidebar />` means a literal HTML tag named
  `sidebar`; `<Sidebar />` means your component.
- One `export default` per file is the component; that is what `import Sidebar
  from './Sidebar.jsx'` picks up.
- The function must be **pure with respect to its inputs**: same inputs, same
  output, no surprises. Side effects (HTTP calls, timers) go in `useEffect`, §3.5.

### 3.2 JSX is JavaScript, not a template language

The markup in `.jsx` files is not a string and not a separate template file. It
compiles to plain function calls. It is JavaScript, so:

- `class` is a reserved word, so the attribute is `className`.
- `{ }` drops back into JavaScript. `{user?.fullName || 'Guest'}` prints a value.
- There is no `if` inside markup. You use JavaScript expressions:

```jsx
{isAdmin && (<li><Link to="/admin">Admin</Link></li>)}
```
`&&` here means "if `isAdmin` is false, render nothing". And a chain of `? :`
handles more than two cases — this is the real loading/error/empty pattern from
`src/pages/ExpensesPage.jsx`:

```jsx
{loading ? (
  <div className="txn-empty">Loading expenses…</div>
) : pageError ? (
  <div className="txn-empty" role="alert">{pageError}</div>
) : txns.length === 0 ? (
  <div className="txn-empty">No transactions yet — add your first entry.</div>
) : (
  txns.map((t) => (/* one row per transaction */))
)}
```

- Loops are `array.map()`, which turns a list of data into a list of markup.
  Each item needs a unique `key` prop so React can tell rows apart between
  renders. Use the database id, never the array index.

### 3.3 Props are function parameters

```jsx
<Sidebar active="expenses" />
```

`active` is a **prop**. Props flow one way: parent to child. A child cannot
change a prop. If a child needs to cause a change, the parent passes a function
down and the child calls it. That is the whole pattern — the equivalent of a
callback interface.

`children` is a special prop: whatever you put between the opening and closing
tags. `<AppShell>{content}</AppShell>` makes `content` available as
`props.children`. That is how the layout wraps pages.

### 3.4 State: `useState`

State is data a component remembers between renders, and the **only** thing that
can cause a re-render.

```jsx
const [amount, setAmount] = useState('');
```

Read `amount`. Change it with `setAmount('42')`. That second call is what tells
React "run this component again". Assigning `amount = '42'` does nothing —
the screen will not update.

Two things trip up newcomers:

**Setting state is not immediate.** It schedules a re-render. Right after
`setAmount('42')`, the variable `amount` in the current function still holds the
old value. If your new value depends on the old one, pass a function:

```jsx
setChat((prev) => [...prev, userMsg]);   // correct
```
*(`src/pages/JournalPage.jsx`)*

**Never modify state in place.** React decides whether to re-render by comparing
the old and new value by reference. `chat.push(msg)` is the same array, so React
sees no change and the screen does not update. You always create a new
value — hence `[...prev, item]` for appending, `.map()` for updating one item,
`.filter()` for removing one, `{ ...prev, field: x }` for objects. This is the
single most common source of "my change didn't show up".

**Inputs are "controlled".** A text box does not own its own value; state does:

```jsx
<input value={amount} onChange={(e) => setAmount(e.target.value)} />
```

Typing fires `onChange`, which sets state, which re-renders, which puts the new
text in the box. It feels like a long way around, but it means state is always
the single source of truth. Remove the `onChange` and the box appears frozen.

### 3.5 Side effects: `useEffect`

Rendering must be pure, so HTTP calls, timers and event listeners go in
`useEffect`. It runs *after* the render is on screen.

```jsx
useEffect(() => {
  let cancelled = false;
  Promise.allSettled([analyticsApi.summary(), insightsApi.list()])
    .then(([s, i]) => {
      if (cancelled) return;
      if (s.status === 'fulfilled') setSummary(s.value);
      if (i.status === 'fulfilled') setInsights(i.value);
    });
  return () => { cancelled = true; };
}, []);
```
*(`src/pages/DashboardPage.jsx`)*

Three parts:

1. **The function** — the work to do.
2. **The dependency array** (`[]` at the end) — when to re-run. `[]` means "once
   when the component appears". `[fromDate, toDate]` means "also re-run whenever
   either changes". **Omitting it entirely means after every render**, which
   with a fetch inside is an infinite loop. This is the classic beginner bug.
3. **The returned function** — cleanup, run when the component disappears or
   before the effect re-runs.

That `cancelled` flag is everywhere in this codebase, and it matters. The user
can navigate away while a request is in flight. Without the flag, the response
arrives and calls `setSummary` on a component that no longer exists. The flag
makes the late response a no-op.

It matters twice over because of **StrictMode**. `src/main.jsx` wraps the app in
`<StrictMode>`, which in development deliberately mounts every component,
unmounts it, and mounts it again — precisely to expose missing cleanup. So in
dev you will see **every fetch fire twice**. That is not a bug, and it does not
happen in the production build. If you remove a `cancelled` flag, you get
duplicated effects and flickering data in dev.

### 3.6 The other three hooks you will see

These exist because a component function re-runs from scratch on every render,
so every variable and function inside it is brand new each time.

| Hook | Plain-English purpose | Real use here |
|---|---|---|
| `useCallback(fn, deps)` | Keep the *same* function object across renders | `fetchExpenses` in `ExpensesPage` — it is a dependency of `useApi`, so a new identity each render would re-fetch forever |
| `useMemo(fn, deps)` | Cache a computed value; recompute only when deps change | `segments` in `ExpensesPage` reshapes server data into chart slices |
| `useRef(x)` | A box whose `.current` survives re-renders and does **not** trigger one | `bodyRef` to scroll the chat to the bottom; `fetchFnRef` inside `useApi` |

If you are unsure whether you need `useCallback`/`useMemo`: you usually don't.
Add them when a value is a dependency of another hook, or when profiling says so.

### 3.7 The rules of hooks

Anything named `use…` is a hook. Two hard rules, enforced by the linter:

1. **Only call hooks at the top level of a component or another hook.** Never
   inside `if`, a loop, or a nested function. React matches hooks to their state
   by call order, so a conditional hook corrupts that mapping.
2. **Only call them from components or custom hooks**, never from a plain helper.

A "custom hook" is just a function that starts with `use` and calls other hooks.
This app has three: `useAuth`, `useApi`, `useReference`.

---

## 4. How a page gets on screen

`src/main.jsx` is the entry point. The nesting order matters:

```jsx
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <AuthInit>
        <ReferenceProvider>
          <App />
        </ReferenceProvider>
      </AuthInit>
    </Provider>
  </StrictMode>,
)
```

Reading outside in:

| Wrapper | Why it is there |
|---|---|
| `StrictMode` | Dev-only checks, including the double-mount described above |
| `Provider store={store}` | Makes the Redux store reachable by any component below |
| `AuthInit` | Renders nothing of its own. Restores the session and listens for 401s (§11) |
| `ReferenceProvider` | Loads dropdown vocabulary and user settings from the backend (§7). Sits inside `Provider` because it calls `useAuth()`, which reads Redux |
| `App` | Routing |

So the chain for any screen is:

```
index.html → main.jsx (providers) → App.jsx (router)
    → ProtectedRoute (is the user logged in?)
        → a page in src/pages/
            → AppShell (sidebar + main area)
                → the page's own content and components
```

---

## 5. Routing

`src/App.jsx` holds the entire route table. This is the frontend equivalent of
your `@RequestMapping` list, except the matching happens in the browser.

```jsx
<BrowserRouter>
  <ErrorBoundary>
    <ScrollToTop />
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/daily-log" element={<ProtectedRoute><DailyLogPage /></ProtectedRoute>} />
      <Route path="/expenses" element={<ProtectedRoute><ExpensesPage /></ProtectedRoute>} />
      <Route path="/journal" element={<ProtectedRoute><JournalPage /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </ErrorBoundary>
</BrowserRouter>
```

| Route | Access |
|---|---|
| `/`, `/about`, `/login`, `/register` | Public |
| `/dashboard`, `/daily-log`, `/expenses`, `/journal`, `/analytics`, `/settings` | Logged in |
| `/admin` | Logged in **and** role `ADMIN` |
| anything else | Redirect to `/` |

### Navigating

- `<Link to="/expenses">` instead of `<a href>`. An `<a>` triggers a full page
  load, throwing away all state and re-downloading everything.
- `useNavigate()` for navigation in code: `navigate('/login', { replace: true })`.
  `replace: true` overwrites the current history entry instead of adding one, so
  Back does not return to a page the user was bounced off.

### The guard

```jsx
function ProtectedRoute({ children, requireAdmin = false }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
```

A component that returns either its children or a redirect. Two details carry
real weight:

- **`if (loading) return null;`** — on a page refresh we have a token in
  localStorage but have not yet confirmed the user with the backend. Without this
  line, a logged-in user pressing F5 gets thrown to `/login` for a moment.
  Rendering `null` means "draw nothing yet".
- **`state={{ from: location.pathname }}`** — remembers where the user was
  heading. `LoginPage` reads it back and returns them there after signing in.

This is client-side only. It is convenience, not security. The real check is the
JWT that Spring validates on every request. Someone can always edit the JS in
their own browser; they cannot forge a token.

### `ErrorBoundary`

The only class component in the app, because catching render errors requires
`getDerivedStateFromError`, which has no hook equivalent. If any page throws
while rendering, this shows a "Something went wrong" card instead of a blank
white screen. It does **not** catch errors inside async callbacks — those need
`try/catch` where they happen.

### Why deployment needs `try_files`

The router lives in the browser, so the server has never heard of `/expenses`.
If a user refreshes there, the server gets a real request for a file that does
not exist. `frontend/nginx/default.conf.template` handles it:

```
try_files $uri $uri/ /index.html;
```

"Serve the file if it exists, otherwise serve `index.html`" — which boots the app,
which reads the URL, which renders the right page. Without this, every refresh on
a sub-page is a 404.

---

## 6. Redux, explained from scratch

### 6.1 What problem it solves

Props flow parent → child. When two components far apart in the tree need the
same data, you would have to thread it through every component in between
("prop drilling"). The logged-in user is exactly that: the sidebar needs it, the
route guard needs it, the dashboard greeting needs it.

Redux puts that data in one object outside the component tree. Any component can
read from it and any component can request a change.

### 6.2 The parts, in backend terms

| Redux term | Rough backend analogy |
|---|---|
| **store** | A single in-memory object holding shared state |
| **slice** | One feature's section of the store, plus the code that changes it |
| **action** | A message: `{ type: 'auth/clearAuth' }`. Like a command object |
| **reducer** | `(currentState, action) -> newState`. Pure function, no I/O |
| **dispatch** | Send an action to the store. The only way to change state |
| **thunk** | An async action: do I/O, then dispatch the result |
| **selector** | A function that reads one piece out of the store |

The strict rule: **reducers are the only thing that change state, they are
synchronous, and they contain no I/O.** Anything async happens in a thunk, which
dispatches plain actions when it finishes.

### 6.3 The store here is small on purpose

```js
export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['auth/login/rejected', 'auth/register/rejected', 'auth/fetchMe/rejected'],
        ignoredPaths: ['auth.error'],
      },
    }),
});
```
*(`src/store/index.js`, complete)*

**There is exactly one slice: `auth`.** Expenses, journal entries, daily logs and
analytics are *not* in Redux — each page fetches its own data and holds it in
local state (§9). Do not go looking for an `expensesSlice`; there isn't one, and
adding one is a design decision, not a gap to fill in.

Why the `serializableCheck` tweak: Redux normally warns if you put
non-plain-object values in the store or in actions, because that breaks time
travel debugging. Our failed login carries an `ApiError` instance (a real class),
so those three action types are exempted.

*(Small dead detail: `ignoredPaths: ['auth.error']` refers to a field the slice
does not have. Harmless, but don't trust it as documentation of the state shape.)*

### 6.4 The auth slice, walked through

State shape is just three fields:

```js
export function getInitialState() {
  const token = getToken();          // localStorage['lifetrack.token']
  const user = readUser();           // localStorage['lifetrack.user']
  return {
    user,
    token,
    loading: !!token && !user,       // "we have a token but no user yet"
  };
}
```

The store is seeded from localStorage so a refresh does not log you out. That
`loading` expression is the flag `ProtectedRoute` waits on.

**Synchronous reducers.** Note the pattern: you mutate `state` directly. Redux
Toolkit runs your code against a proxy and produces a new immutable object from
your edits, so `state.user = null` is safe here and *only* here.

```js
reducers: {
  setAuth(state, action) {
    const { user, token } = action.payload;
    state.user = user;
    state.token = token;
    state.loading = false;
    setToken(token);        // <-- writes localStorage
    writeUser(user);        // <-- writes localStorage
  },
  clearAuth(state) {
    state.user = null;
    state.token = null;
    state.loading = false;
    setToken(null);
    writeUser(null);
  },
},
```

Be aware: these reducers write to localStorage, which makes them impure. Textbook
Redux would do that in middleware. It works and the tests rely on it, but it
means dispatching `clearAuth()` has a side effect beyond the store.

**Async thunks.** `createAsyncThunk` generates three action types for you —
`pending`, `fulfilled`, `rejected`:

```js
export const loginThunk = createAsyncThunk('auth/login', async ({ email, password }, { rejectWithValue }) => {
  try {
    const res = await authApi.login({ email, password });
    setToken(res.token);
    writeUser(res.user);
    return res;                    // becomes action.payload of auth/login/fulfilled
  } catch (err) {
    return rejectWithValue(err);   // becomes action.payload of auth/login/rejected
  }
});
```

`rejectWithValue(err)` matters: it preserves our `ApiError` (with its HTTP status
and per-field messages) as the payload, instead of Redux flattening it to a
message string.

**Handling those generated actions** happens in `extraReducers`:

```js
extraReducers: (builder) => {
  builder
    .addCase(fetchMe.pending,   (state) => { state.loading = true; })
    .addCase(fetchMe.fulfilled, (state, action) => { state.user = action.payload; state.loading = false; })
    .addCase(fetchMe.rejected,  (state) => { state.loading = false; })
    .addCase(loginThunk.fulfilled, (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.loading = false;
    })
    .addCase(registerThunk.fulfilled, /* same shape */);
},
```

There is no `loginThunk.rejected` case, and that is intentional: a failed login
is shown on the form, not stored globally. The component receives the error
instead, via `.unwrap()` — see next.

### 6.5 How components actually use it

The raw Redux hooks are `useSelector` (read) and `useDispatch` (write). In this
codebase they appear in **exactly one file**, `src/lib/auth.jsx`, which wraps them
in a friendlier hook. Everything else calls `useAuth()`.

```jsx
export function useAuth() {
  const dispatch = useDispatch();
  const { user, token, loading } = useSelector((state) => state.auth);

  const login = useCallback(
    async (email, password) => {
      const res = await dispatch(loginThunk({ email, password })).unwrap();
      return res.user;
    },
    [dispatch]
  );

  const logout = useCallback(() => { dispatch(clearAuth()); }, [dispatch]);

  return {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isAdmin: user?.role === 'ADMIN',
    loading,
    login,
    register,
    logout,
  };
}
```

Three things to take from this:

- **`useSelector(fn)`** subscribes the component to the store. When the selected
  value changes, that component re-renders — and only that component. Select the
  narrowest thing you need.
- **`.unwrap()`** converts a rejected thunk back into a thrown exception. Without
  it, `dispatch(thunk)` resolves successfully even on failure (with a rejected
  action inside), which surprises everyone once. With it, the calling component
  can write ordinary `try/catch`.
- **`isAuthenticated` and `isAdmin` are derived**, not stored. Anything you can
  compute from existing state should not be a separate field, or the two can
  disagree.

Consumers look like this:

```jsx
const { user, isAdmin, logout } = useAuth();      // src/components/Sidebar.jsx
const { login } = useAuth();                      // src/pages/LoginPage.jsx
```

---

## 7. Context: the other shared state

React Context is a lighter mechanism for "make this value available to a whole
subtree without prop drilling". No actions, no reducers — just a provider and a
hook. This app uses it for data that is loaded once and rarely changes.

`src/lib/reference.jsx` provides the domain vocabulary — which expense categories
exist, which moods, which habits — plus the user's settings (sleep target, budget):

```jsx
useEffect(() => {
  if (!isAuthenticated) return;
  let cancelled = false;
  Promise.allSettled([referenceApi.get(), settingsApi.get()])
    .then(([ref, set]) => {
      if (cancelled) return;
      if (ref.status === 'fulfilled') setReference(ref.value || EMPTY_REFERENCE);
      if (set.status === 'fulfilled') setSettings(set.value);
    })
    .finally(() => { if (!cancelled) setLoading(false); });
  return () => { cancelled = true; };
}, [isAuthenticated]);
```

Why this exists at all: these lists used to be hardcoded in the pages. Now the
backend owns them, so adding a category is a backend change and the UI follows.
Colours and emoji stay on the frontend — the file's own comment puts it well:
"the backend says *which* categories exist, the design system decides what they
look like."

Two design points worth copying:

- **`Promise.allSettled`** rather than `Promise.all`: if settings fail, the
  vocabulary still loads. `Promise.all` rejects the whole batch on one failure.
- **The logged-out view is derived, not cleared.** Rather than wiping state in an
  effect on logout, the value is computed:

```jsx
const value = useMemo(() => (
  isAuthenticated
    ? { ...reference, settings, loading, saveSettings }
    : { ...EMPTY_REFERENCE, settings: null, loading: false, saveSettings }
), [isAuthenticated, reference, settings, loading, saveSettings]);
```

That makes it impossible for a signed-out user to briefly see the previous user's
data, which an effect-based reset would allow.

Usage: `const { expenseCategories } = useReference();`. It throws if used outside
the provider, which is a deliberate fail-fast.

### Redux or Context?

| Use | When |
|---|---|
| **Redux** (`auth`) | Changes often, from many places, and history/debuggability matters |
| **Context** (`reference`) | Loaded once, read widely, rarely written |
| **Local `useState`** | Everything else — which is most things here |

Default to local state. Reach for the other two only when something genuinely
needs to be shared.

---

## 8. Talking to the backends

Everything HTTP lives in `src/lib/api.js`. No component calls `axios` or `fetch`
directly, and that convention is worth keeping.

### Two clients, because there are two backends

```js
const springClient = axios.create({ baseURL: API_BASE, headers: { Accept: 'application/json' } });
const aiClient     = axios.create({ baseURL: AI_BASE,  headers: { Accept: 'application/json' } });
```

`springClient` sends the JWT; `aiClient` does not, because the FastAPI service
has no authentication of its own.

### Interceptors: cross-cutting concerns

An interceptor is a filter that runs on every request or response through that
client. Think servlet filter.

**Attach the token, on every request:**

```js
springClient.interceptors.request.use((config) => {
  if (!config.skipAuth) {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

It reads localStorage per call, so nothing needs re-wiring after login. The
`skipAuth: true` flag opts out — used by `login` and `register`, which have no
token yet.

**Unwrap the body, on every response:**

```js
springClient.interceptors.response.use(
  (res) => (res.status === 204 ? null : res.data),
  (err) => handleAxiosError(err, 'Cannot reach the server. Check that the backend is running.', true)
);
```

> **Remember this one.** Every `xxxApi.foo()` resolves to **the parsed body**,
> not an axios response. So `const rows = await expenseApi.list(from, to)` — and
> `rows.data` would be `undefined`. A `204 No Content` becomes `null`.

### One error type

```js
export class ApiError extends Error {
  constructor(status, message, fieldErrors = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}
```

`handleAxiosError` turns every failure into an `ApiError`, so components never
have to know axios's error shape. It handles four cases:

| Situation | Result |
|---|---|
| Request was cancelled | Rethrown untouched, so cleanup is not treated as failure |
| Server responded 4xx/5xx | `ApiError(status, message, fieldErrors)` |
| FastAPI 422 (an *array* of validation errors) | Flattened into one `; `-joined string |
| Network down / backend not running | `ApiError(0, 'Cannot reach the server…')` — note **status 0** |

`fieldErrors` comes from Spring's `errors` object and maps field name → message,
which is how `LoginPage` highlights individual inputs.

### The 401 bridge

This is the one clever piece of indirection in the codebase, and it is easy to
miss:

```js
if (isSpring && error.response.status === 401) {
  setToken(null);
  window.dispatchEvent(new CustomEvent('lifetrack:unauthorized'));
}
```

`api.js` is a plain module — it has no access to hooks or `dispatch`. So when a
token expires, it fires a browser DOM event. `AuthInit` listens for it and clears
Redux:

```jsx
useEffect(() => {
  const onUnauth = () => { dispatch(clearAuth()); };
  window.addEventListener('lifetrack:unauthorized', onUnauth);
  return () => window.removeEventListener('lifetrack:unauthorized', onUnauth);
}, [dispatch]);
```

The result: any expired token, on any request, anywhere in the app, logs the user
out and the guard redirects them. If you ever wonder how that happens, grep for
`lifetrack:unauthorized` — nothing else connects those two files.

### The endpoint groups

Each group is a plain object of small functions. Add new endpoints here.

| Export | Functions |
|---|---|
| `authApi` | `register`, `login` (both `skipAuth`), `me` |
| `dailyLogApi` | `list`, `merge`, `update`, `remove` |
| `habitApi` | `list(date)`, `create`, `update`, `deactivate`, `toggle(id, date, completed)` |
| `expenseApi` | `list(from, to)`, `create`, `update`, `remove` |
| `journalApi` | `list`, `create`, `update`, `remove` |
| `analyticsApi` | `summary(from, to)` |
| `insightsApi` | `list` — the **rule-based** insights from Spring |
| `adminApi` | `stats`, `users` |
| `referenceApi` | `get` |
| `settingsApi` | `get`, `update` |
| `aiContextApi` | `get(days)` — aggregated lifestyle numbers, computed by Spring |
| `aiApi` | `chat`, `insights`, `command` — the **only** functions that hit FastAPI |

---

## 9. Loading data into a page

There are **two patterns in the codebase for the same job**. Know both, because
you will meet both.

### Pattern A — the `useApi` hook

`src/lib/useApi.js`. Give it a function that returns a promise; get back state.

```jsx
const { data, setData, loading, error, reload } = useApi(fetchExpenses, [fromDate, toDate]);
```

| Returned | Meaning |
|---|---|
| `data` | Whatever your function resolved to. `null` until it does |
| `setData` | Lets you patch the cached data locally, e.g. after a delete |
| `loading` | Starts `true` |
| `error` | A **string**, `''` when fine |
| `reload` | Re-run the fetch. Stable identity, safe in dependency arrays |

Used by `ExpensesPage`, `JournalPage`, `AnalyticsPage`.

Internally it does two things that are worth understanding:

```js
const fetchFnRef = useRef(fetchFn);
useEffect(() => { fetchFnRef.current = fetchFn; }, [fetchFn]);
```
It keeps your fetch function in a ref, so passing a differently-identified
function on each render does not cause a refetch loop. **The consequence:** only
the `deps` array controls refetching. If your fetcher closes over a value that is
not in `deps`, it will keep using the stale one. That is why callers wrap their
fetcher in `useCallback` with the same deps they pass to `useApi`.

```js
}, deps); // eslint-disable-line react-hooks/exhaustive-deps
```
The lint rule is suppressed because `deps` is a runtime parameter here, not a
literal array the linter can analyse. Normal components should not copy that
suppression.

### Pattern B — a hand-rolled effect

`DashboardPage` and `DailyLogPage` do it manually, with separate `loading` and
`error` state per resource:

```jsx
useEffect(() => {
  let cancelled = false;
  Promise.allSettled([analyticsApi.summary(), insightsApi.list()])
    .then(([s, i]) => {
      if (cancelled) return;
      if (s.status === 'fulfilled') setSummary(s.value);
      else setError(s.reason?.message || 'Could not load summary');
      if (i.status === 'fulfilled') setInsights(i.value);
    });
  return () => { cancelled = true; };
}, []);
```

More code, but more control — here the page still renders if insights fail while
the summary succeeds. For a new page, prefer `useApi` unless you need that kind of
partial success.

---

## 10. Full trace: adding an expense

Follow this once and the rest of the app will make sense.
Source: `src/pages/ExpensesPage.jsx`.

**1. The page mounts.** It builds a fetcher that hits two endpoints in parallel
and reshapes the rows for display:

```jsx
const fetchExpenses = useCallback(async () => {
  const [data, summaryData] = await Promise.all([
    expenseApi.list(fromDate, toDate),
    analyticsApi.summary(fromDate, toDate),
  ]);
  const mappedTxns = (data || []).map((e) => ({
    id: e.id,
    isoDate: e.date,
    date: isoToShort(e.date),
    category: e.category,
    amount: Number(e.amount),
  }));
  return { txns: mappedTxns, analytics: summaryData };
}, [fromDate, toDate]);

const { data, setData, loading, error: apiError, reload } = useApi(fetchExpenses, [fromDate, toDate]);
```

Two API calls, one state object. `loading` is `true`, so the JSX shows
"Loading expenses…".

**2. Data arrives.** `useApi` calls `setData`, React re-renders, and the ternary
chain now takes the `txns.map(...)` branch.

**3. The user types.** Each keystroke: `onChange` → `setAmount` → re-render →
input shows the new text. Category buttons work the same way via `setCategory`.

**4. The user submits.** Validate first, and note the numbers are converted here
because form inputs are always strings:

```jsx
const value = parseFloat(amount);
if (!value || value <= 0) {
  setAmountError('Enter an amount greater than 0');
  document.getElementById('entry-amount')?.focus();
  return;
}
```

**5. Create or update, based on `editingId`.** One form serves both modes — `null`
means "creating":

```jsx
if (editingId !== null) {
  const updated = await expenseApi.update(editingId, payload);
  setData((prev) => ({ ...prev, txns: (prev?.txns || []).map((t) => (t.id === editingId ? {/* new row */} : t)) }));
  setEditingId(null);
} else {
  const created = await expenseApi.create(payload);
  setData((prev) => ({ ...prev, txns: [row, ...(prev?.txns || [])] }));
}
```

Look at the shape: `{ ...prev }` copies the object, `.map()` builds a new array.
Nothing is modified in place.

**6. Then it refetches anyway:**

```jsx
setAmount(''); setDate(''); setCategory(defaultCategory());
reload();
```

Why both? The local patch makes the new row appear instantly. But the totals and
the donut chart come from `/api/analytics`, which only the server can recompute.
So `reload()` resyncs. You will see a brief double render — that is the trade.

**7. Deleting is optimistic, with rollback:**

```jsx
const handleDelete = async (id) => {
  const snapshot = data;                                   // remember
  setData((prev) => ({ ...prev, txns: (prev?.txns || []).filter((t) => t.id !== id) }));
  try {
    await expenseApi.remove(id);
    reload();
  } catch (err) {
    setData(snapshot);                                     // put it back
    setActionError(err.message || 'Could not delete that expense');
  }
};
```

The row vanishes immediately so the UI feels fast; if the server refuses, the
snapshot is restored and an error is shown.

**8. Totals are never computed here.** This comment is a rule:

```jsx
// Business totals come from Spring (/api/analytics) — React does NOT compute these.
const total = analytics?.totalExpenses ?? 0;
const spendPct = analytics?.budgetUsagePct ?? 0;
```

Please do not "optimise" this by summing in the browser. Two implementations of
the same business rule will drift, and the backend one is the one under test.

---

## 11. Full trace: login, refresh, logout

### Signing in

1. `LoginPage` keeps `email`/`password` in local state and validates on submit.
2. It calls `await login(email.trim(), password)` from `useAuth()`.
3. `useAuth.login` dispatches the thunk and unwraps it:
   `await dispatch(loginThunk({ email, password })).unwrap()`.
4. The thunk calls `authApi.login(...)` → `POST /api/auth/login` with
   `skipAuth: true`. Resolves to `{ user, token }`.
5. Still inside the thunk: `setToken(res.token)` and `writeUser(res.user)` write
   `lifetrack.token` and `lifetrack.user` to localStorage.
6. `loginThunk.fulfilled` puts `user` and `token` into Redux.
7. Back in the page:

```jsx
const next = location.state?.from || '/dashboard';
navigate(next, { replace: true });
```
   `location.state.from` is the page `ProtectedRoute` bounced them off, if any.

8. If it fails, `.unwrap()` throws the `ApiError` and the page handles it —
   including per-field messages:

```jsx
catch (err) {
  if (err instanceof ApiError) {
    if (err.fieldErrors) setErrors((prev) => ({ ...prev, ...err.fieldErrors }));
    setFormError(err.message || 'Unable to sign in. Please try again.');
  } else {
    setFormError('Something went wrong. Please try again.');
  }
}
```

`RegisterPage` is the same with `registerThunk`.

### Refreshing the page

Everything in memory is lost, so:

1. `getInitialState()` reads both localStorage keys as the store is created.
2. If there is a token but no cached user, `loading` starts `true`.
3. `ProtectedRoute` sees `loading` and renders nothing — no login flash.
4. `AuthInit` fills in the gap:

```jsx
useEffect(() => {
  if (token && !user) {
    dispatch(fetchMe());
  }
}, [dispatch, token, user]);
```
5. `fetchMe.fulfilled` sets the user and flips `loading` to `false`; the page
   renders. If the token was rejected, the 401 path below fires instead.

### Token expiring mid-session

`api.js` clears the token and fires `lifetrack:unauthorized` → `AuthInit`
dispatches `clearAuth()` → `isAuthenticated` becomes false → `ProtectedRoute`
redirects to `/login`. No page needs to handle this itself.

### Signing out

```jsx
const handleLogout = () => {
  logout();                                  // dispatch(clearAuth())
  navigate('/login', { replace: true });
};
```
*(`src/components/Sidebar.jsx`)*

`clearAuth` empties the store and both localStorage keys. **There is no server
call** — JWTs are stateless, so the backend has nothing to forget. The token
remains technically valid until it expires; deleting it client-side is the whole
of logout.

---

## 12. Full trace: the AI chat

The interesting part is the split of responsibilities: **Spring computes the
numbers, FastAPI only writes prose.** The browser is a relay.

### Chat (`src/pages/JournalPage.jsx`)

1. User types and hits send. The message is appended to local `chat` state and a
   typing indicator turns on.
2. The last few turns become conversation history:

```jsx
const history = chat.slice(-6).map((c) => ({
  role: c.from === 'bot' ? 'assistant' : 'user',
  content: c.text,
}));
```
3. Ask **Spring** for the aggregated context — the browser derives none of it:

```jsx
const springContext = await aiContextApi.get(30).catch(() => null);
```
   `.catch(() => null)` means chat still works if that call fails.
4. Rename the fields, because Spring speaks camelCase and FastAPI speaks
   snake_case. `toAiContext()` does the whole mapping:

```jsx
function toAiContext(ctx) {
  if (!ctx) return null;
  return {
    period_days: ctx.periodDays,
    avg_sleep_hours: ctx.avgSleepHours ?? undefined,
    weekly_spend: ctx.weeklySpend ?? undefined,
    expenses_by_category: ctx.expensesByCategory || {},
    mood_counts: ctx.moodCounts || {},
    // …and the rest
  };
}
```
5. `aiApi.chat({ query, context, history, context_mode: 'full', user_name })` →
   `POST /chat` on the FastAPI service.
6. The reply is appended to `chat` and rendered through `ReactMarkdown`.
7. An effect scrolls to the bottom whenever the conversation changes:

```jsx
useEffect(() => {
  if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
}, [chat, botTyping, activeTab]);
```

### Command mode — human in the loop

With `mode` set to `'expense'` or `'daily_log'`, free text like "spent 300 on
groceries" goes to `aiApi.command(...)`. FastAPI returns a structured `payload`,
which is attached to the bot's message as a **draft** rather than being saved:

```jsx
setChat((prev) => [...prev, {
  from: 'bot',
  text: res.message,
  draft: { id: Date.now(), target: res.target, payload: res.payload, status: 'pending' },
}]);
```

The user must confirm. Confirming writes through **Spring**, not the AI service:

```jsx
if (draftItem.target === 'expense') {
  await expenseApi.create(draftItem.payload);
  // then patch that message's draft.status to 'confirmed'
}
```

So the AI never writes to the database. It proposes; the user approves; the
normal validated Spring endpoint performs the write. Keep that property if you
extend this feature.

### Insights (`src/pages/DashboardPage.jsx`)

The dashboard loads Spring's **rule-based** insights (`insightsApi.list()`) by
default. LLM insights are opt-in behind a button, so the app works offline and
does not spend tokens on every page view:

```jsx
const ctx = await aiContextApi.get();
const res = await aiApi.insights({ user_name: user?.fullName, context: { /* mapped */ }, use_ai: true });
setAiInsights(res);
```

Note the camelCase→snake_case mapping is **written out twice** — once as
`toAiContext()` in `JournalPage`, once inline here. They can drift. If you touch
one, check the other.

---

## 13. Where things live

```
frontend/
├─ index.html               the single page; one <div id="root">
├─ vite.config.js           dev server + build
├─ vitest.config.js         test runner (separate file)
├─ eslint.config.js
├─ .env                     VITE_API_BASE_URL, VITE_AI_BASE_URL (build-time)
├─ Dockerfile               build the bundle, serve it with nginx
├─ nginx/                   the reverse-proxy config (see ../DEPLOYMENT.md)
└─ src/
   ├─ main.jsx              entry point: providers
   ├─ App.jsx               routes + ProtectedRoute + ErrorBoundary
   ├─ pages/                one file per screen, one route each
   │   ├─ LandingPage.jsx   AboutPage.jsx      LoginPage.jsx   RegisterPage.jsx
   │   ├─ DashboardPage.jsx DailyLogPage.jsx   ExpensesPage.jsx
   │   └─ JournalPage.jsx   AnalyticsPage.jsx  SettingsPage.jsx  AdminPage.jsx
   ├─ components/           reusable pieces shared by pages
   │   ├─ AppShell.jsx      layout for logged-in pages (sidebar + main)
   │   ├─ AuthShell.jsx     layout for login/register
   │   ├─ Sidebar.jsx       nav + user block + sign out
   │   ├─ PageHeader.jsx    SegmentedTabs.jsx  PasswordInput.jsx
   │   ├─ BrandLogo.jsx     ColorPipelineCard.jsx
   │   ├─ DailyLogHistory.jsx  UserProfileModal.jsx
   ├─ lib/                  non-visual logic
   │   ├─ api.js            all HTTP. Two axios clients, interceptors, ApiError
   │   ├─ auth.jsx          useAuth() + AuthInit. The only file touching Redux hooks
   │   ├─ reference.jsx     ReferenceProvider + useReference() + colours/emoji
   │   ├─ useApi.js         generic fetch-on-mount hook
   │   └─ date.js           ISO date helpers
   ├─ store/
   │   ├─ index.js          configureStore
   │   ├─ authSlice.js      the only slice
   │   └─ __tests__/        the only tests in the project
   ├─ styles/               CSS. Out of scope for this guide
   └─ assets/               images
```

Naming conventions in use: pages are `XxxPage.jsx`, components are `PascalCase.jsx`,
non-visual modules in `lib/` are lowercase. A `.jsx` extension means the file
contains markup — `lib/auth.jsx` and `lib/reference.jsx` are `.jsx` because they
render provider components.

### There are no nested layout routes

Each protected page imports `AppShell` itself and passes a string id so the
sidebar can highlight the right item:

```jsx
<AppShell active="expenses">…</AppShell>
```

That string must match an `id` in `NAV_ITEMS` in `Sidebar.jsx`. A typo silently
loses the highlight — nothing errors.

---

## 14. Common tasks

### Add a new page

1. Create `src/pages/ThingPage.jsx` exporting a default component.
2. Wrap the content in `<AppShell active="thing">`.
3. Register it in `src/App.jsx`, inside `<ProtectedRoute>` if it needs a login.
4. Add a `NAV_ITEMS` entry in `src/components/Sidebar.jsx` with a matching `id`.

### Add a backend endpoint call

1. Add the function to the right group in `src/lib/api.js`:
   ```js
   export const expenseApi = {
     // …
     summaryByMonth: (year) => springClient.get('/expenses/monthly', { params: { year } }),
   };
   ```
2. Call it from a `useCallback`'d fetcher and pass that to `useApi`.
3. Remember the response is already the body, and errors are `ApiError`.

### Add a field to a form

1. `const [note, setNote] = useState('');`
2. `<input value={note} onChange={(e) => setNote(e.target.value)} />`
3. Include it in the payload object on submit.
4. Reset it alongside the others after a successful save.

### Show a new number from the backend

Add it to the Spring response and read it from `analytics?.yourField ?? 0`.
Do not compute it in the browser.

### Add something to global auth state

Add the field in `authSlice.js` (initial state, the reducers that touch it), then
expose it through `useAuth()`'s return object. Components should not call
`useSelector` directly — keep that inside `lib/auth.jsx`.

### Debug

- **React DevTools** browser extension: inspect the component tree, see each
  component's props and state live.
- **Redux DevTools** extension: every dispatched action, the state before and
  after, and time travel. Works out of the box with Redux Toolkit.
- **Network tab**: confirm the request URL, the `Authorization` header, the
  status and the JSON body. Most "React bug" reports are a 400 from the backend.
- `console.log` inside a component body shows you every render. If it prints
  endlessly, you have an effect with a missing or wrong dependency array.

---

## 15. Rules this codebase follows

Keep to these when adding code; they are the conventions that make the app
predictable.

1. **The backend owns business math.** Totals, percentages, averages,
   thresholds — all from `/api/analytics` and `/api/ai-context`. The browser
   formats and draws.
2. **The backend owns the vocabulary.** Categories, moods, habits come from
   `/api/reference` through `useReference()`. No hardcoded lists in pages.
3. **All HTTP goes through `src/lib/api.js`.** No `axios` or `fetch` in a
   component.
4. **Redux is for auth only.** Page data lives in the page.
5. **`useSelector`/`useDispatch` only in `lib/auth.jsx`.** Everyone else uses
   `useAuth()`.
6. **The AI service never writes to the database.** It returns a draft; the user
   confirms; Spring performs the write.
7. **Every fetch effect has cleanup** — a `cancelled` flag and a returned cleanup
   function.
8. **State is replaced, never mutated.** Spread objects, `map`/`filter` arrays.
9. **Errors surface to the user.** Catch, set an error state, render it. Do not
   swallow into `console.error`.
10. **Prefer `useApi` for new pages** over hand-rolled effects.

---

## 16. Gotchas that waste an afternoon

Ordered roughly by how often they bite.

1. **`await someApi.foo()` gives you the body, not a response.** No `.data`.
   204 gives `null`.
2. **The screen did not update** — you mutated state instead of replacing it.
   `arr.push(x)` and `obj.field = x` are invisible to React.
3. **Infinite fetch loop** — a `useEffect` with no dependency array, or one
   containing a value the effect itself changes.
4. **Every fetch fires twice in dev** — that is StrictMode's intentional double
   mount. It does not happen in production.
5. **Redux only holds auth.** Don't hunt for a slice that isn't there.
6. **Two data-loading patterns coexist.** `useApi` in Expenses/Journal/Analytics;
   hand-rolled effects in Dashboard/DailyLog. Same job, different shape.
7. **401 handling travels over a DOM event.** `window.dispatchEvent(new
   CustomEvent('lifetrack:unauthorized'))` in `api.js` → `AuthInit`. Grep the
   string; nothing else links them.
8. **Auth reducers write to localStorage.** Dispatching `setAuth`/`clearAuth` in
   a test mutates storage. The tests depend on this.
9. **`loading` in `ProtectedRoute` is load-bearing.** Drop the
   `if (loading) return null` and refreshes bounce logged-in users to `/login`.
10. **`useApi`'s fetcher is captured in a ref.** Only the `deps` array triggers a
    refetch. A fetcher closing over a value missing from `deps` uses a stale one.
11. **`AppShell active="…"` is a magic string** that must match a `Sidebar`
    `NAV_ITEMS` id. Typos fail silently.
12. **camelCase vs snake_case** at the FastAPI boundary, mapped by hand, and the
    mapping exists in two places (`JournalPage.toAiContext` and
    `DashboardPage.runAiInsights`).
13. **`DonutChart` is defined twice** — in `ExpensesPage.jsx` (absolute values)
    and `DashboardPage.jsx` (percentages). Same name, different props. All charts
    here are hand-written SVG; there is no chart library.
14. **`DailyLogPage.jsx` is the big one** (~820 lines, 18 `useState` calls, its
    own history tab that refetches on tab change). Do not start your React
    learning there.
15. **Some code reaches into the DOM directly** —
    `document.getElementById('entry-amount')?.focus()`. It works but is not
    idiomatic, and it breaks if an id changes. Prefer a ref in new code.
16. **`ReferenceProvider` gates on `isAuthenticated`**, so on public pages
    `expenseCategories` is `[]` and `loading` is `false`. Tolerate empty
    vocabulary: `expenseCategories[0] || ''`.
17. **`ErrorBoundary` only catches render errors**, not errors thrown inside async
    callbacks or event handlers.
18. **Changing `.env` needs a rebuild.** `VITE_*` values are baked into the
    bundle.
19. **`ignoredPaths: ['auth.error']` in `store/index.js` is dead config** — the
    slice has no `error` field. Don't read it as documentation.
20. **Form inputs are always strings.** `parseFloat`/`Number` before arithmetic,
    or `"5" + 1` gives `"51"`.

---

## 17. Tests

```bash
npm test          # vitest run — executes once and exits
```

Config is in `vitest.config.js` (separate from `vite.config.js`): `jsdom` as the
environment — a fake browser in Node, so `localStorage` and `document` exist —
with `globals: true` so `describe`/`it`/`expect` need no import.

**Coverage today is auth only**, in `src/store/__tests__/`:

- `authSlice.test.js` — reducers, session restore from localStorage, and the
  three thunks with `lib/api` mocked.
- `authFlowIntegration.test.jsx` — the React-level flow.

Nothing covers pages, `useApi`, or the error normalisation in `api.js`. That is
the obvious place to contribute.

The mocking style, for reference:

```js
vi.mock('../../lib/api', async () => {
  const actual = await vi.importActual('../../lib/api');
  return { ...actual, authApi: { login: vi.fn(), register: vi.fn(), me: vi.fn() } };
});
```
Keep the real module's exports (`ApiError`, `getToken`) and replace only the
network-touching object.

Thunks are invoked directly rather than through a store, which is why fake
`dispatch`/`getState` appear:

```js
const result = await loginThunk({ email, password })(dispatch, getState, undefined);
expect(result.type).toBe('auth/login/fulfilled');
expect(localStorage.getItem('lifetrack.token')).toBe(mockToken);
```

---

## 18. Glossary

| Term | Meaning here |
|---|---|
| **Component** | A function returning markup. The unit of UI |
| **JSX** | The HTML-like syntax inside `.jsx`. Compiles to JS function calls |
| **Prop** | An input to a component. Read-only, flows parent → child |
| **`children`** | The prop holding whatever sits between a component's tags |
| **State** | Data a component remembers; changing it triggers a re-render |
| **Render** | React calling your component function to get markup |
| **Re-render** | Calling it again after state or props changed |
| **Mount / unmount** | A component appearing on / being removed from the screen |
| **Hook** | A `use…` function that plugs into React's machinery |
| **Custom hook** | Your own `use…` function that calls other hooks |
| **Effect** | Work outside rendering: HTTP, timers, listeners. `useEffect` |
| **Dependency array** | The list controlling when an effect or memo re-runs |
| **Cleanup function** | Returned from an effect; runs on unmount or before a re-run |
| **Ref** | A mutable box that survives renders without causing one |
| **Controlled input** | A form field whose value comes from state |
| **Key** | The unique id React needs for each item in a rendered list |
| **Store** | The single Redux object holding shared state |
| **Slice** | One feature's part of the store plus its reducers |
| **Action** | A plain object describing something that happened |
| **Reducer** | `(state, action) -> newState`. Pure, synchronous |
| **Dispatch** | Sending an action to the store |
| **Thunk** | An async action creator: do I/O, then dispatch the outcome |
| **Selector** | A function reading a slice of store state |
| **`.unwrap()`** | Makes a rejected thunk throw, so `try/catch` works |
| **Provider** | A component making a value available to its whole subtree |
| **Context** | React's built-in mechanism behind a Provider |
| **Interceptor** | An axios filter running on every request or response |
| **SPA** | Single Page Application — one HTML file, JS swaps the content |
| **Bundler** | Tool turning many source files into a few browser files (Vite) |
| **StrictMode** | Dev-only wrapper that double-invokes effects to expose bugs |

---

## Where to go next

Read in this order, and you will have the whole picture in about an hour:

1. `src/main.jsx` — 20 lines, the skeleton
2. `src/App.jsx` — routes and the guard
3. `src/lib/api.js` — every call the app can make
4. `src/store/authSlice.js` + `src/lib/auth.jsx` — all of Redux in this app
5. `src/pages/ExpensesPage.jsx` — the model page: fetch, form, create, edit,
   optimistic delete
6. `src/lib/reference.jsx` — Context, and the backend-owns-the-vocabulary rule

Deployment, nginx and the `VITE_*` build arguments are covered in
[`../DEPLOYMENT.md`](../DEPLOYMENT.md). The backend contract and endpoint list are
in the [root README](../README.md).
