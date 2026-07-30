# LifeTrack Agent Rules

These instructions apply to every AI agent and every change in this repository.
The frontend is not a blank design surface. LifeTrack already has approved
screens, assets, design tokens, typography, layouts, component specifications,
and working implementations. Agents must inspect and reuse them before adding
or changing any frontend page or component.

## 1. Non-negotiable rule

Before editing anything under `frontend/`, an agent must establish:

1. Which approved screen or existing page is the visual reference.
2. Which existing layout, component, CSS class, token, and asset can be reused.
3. Whether the feature is presentation-only or requires an existing API.
4. Whether the route is public, authenticated, or administrator-only.
5. How the result will be verified without requiring browser zoom.

Do not begin implementation until these five questions can be answered from the
repository. If a required reference or asset is genuinely missing, report the
gap instead of inventing a replacement.

## 2. Current frontend state

This section describes what actually exists today. Keep it accurate; update it
in the same change that alters the structure it describes.

### 2.1 Stack

| Concern | Choice |
|---|---|
| Framework | React 19 |
| Build/dev server | Vite 8 |
| Routing | `react-router-dom` 7 (`BrowserRouter`) |
| Global state | Redux Toolkit 2 + `react-redux` 9 |
| HTTP | `axios` (never `fetch` in application code) |
| Markdown rendering | `react-markdown` (AI assistant replies only) |
| Test runner | Vitest 4 + `@testing-library/react` + jsdom |
| Lint | ESLint 10 (flat config in `eslint.config.js`) |

Styling is hand-authored CSS with design tokens. `tailwindcss` and
`@tailwindcss/vite` appear in `package.json` but are **not wired in** — there is
no Tailwind plugin in `vite.config.js` and no `@import "tailwindcss"` in any
stylesheet. Do not write Tailwind utility classes. Do not remove those
dependencies as an incidental change either; that is its own decision.

### 2.2 Folder layout

```text
frontend/src/
  main.jsx              Provider tree: Redux -> AuthInit -> ReferenceProvider -> App
  App.jsx               Routes, ProtectedRoute, ScrollToTop, ErrorBoundary
  index.css             single entry, imports styles/main.css
  App.css               empty / unused
  pages/                one file per route (11 pages)
  components/           shared shells plus single-use page sections
  lib/                  api client, auth hook, reference provider, date, useApi
  store/                Redux store and slices, with __tests__/
  styles/               tokens, reset, typography, layout, components, per-page
  assets/               images and team photos
```

Pages live in `src/pages/` and are imported by `App.jsx` as `./pages/XxxPage`.
Anything a page imports from a sibling folder uses `../` (for example
`../lib/api.js`, `../components/AppShell.jsx`, `../styles/daily-log.css`).

### 2.3 Routing and access

All routes are declared in `frontend/src/App.jsx`. Read it before adding a
route; do not infer protection from the page file.

| Access | Routes |
|---|---|
| Public | `/`, `/about`, `/login`, `/register` |
| Authenticated | `/dashboard`, `/daily-log`, `/expenses`, `/journal`, `/analytics`, `/settings` |
| Administrator | `/admin` (`<ProtectedRoute requireAdmin>`) |

Unknown paths redirect to `/`. `ProtectedRoute` renders nothing while auth is
still resolving, redirects to `/login` with `state.from` when unauthenticated,
and redirects a non-admin away from `/admin` to `/dashboard`.

### 2.4 API layer — `lib/api.js`

Single source of HTTP access. Do not call `axios` or `fetch` directly from a
page or component.

- Two axios instances: `springClient` (`VITE_API_BASE_URL`, default
  `http://localhost:8080/api`) and `aiClient` (`VITE_AI_BASE_URL`, default
  `http://localhost:8100`).
- A request interceptor attaches `Authorization: Bearer <token>` to Spring
  requests unless the call passes `skipAuth: true` (login and register do).
- A response interceptor returns `response.data` directly, so callers receive
  the payload, not an axios response. A 204 resolves to `null`.
- Failures reject with `ApiError { status, message, fieldErrors }`. FastAPI
  422 detail arrays are normalised into one string. An unreachable backend
  yields `status: 0` with a friendly message.
- A Spring 401 clears the token and dispatches a `lifetrack:unauthorized`
  window event. `AuthInit` listens for it and clears auth state. This
  indirection exists to avoid a circular import between `api.js` and the store.
- Endpoints are grouped as named objects: `authApi`, `dailyLogApi`, `habitApi`,
  `expenseApi`, `journalApi`, `analyticsApi`, `insightsApi`, `adminApi`,
  `referenceApi`, `settingsApi`, `aiContextApi`, `aiApi`. Add new endpoints to
  the matching group rather than creating a new access path.

### 2.5 State management

Two deliberate layers. Know which one a value belongs to before adding state.

- **Redux** (`store/index.js`, `store/authSlice.js`) holds auth: `user`,
  `token`, `loading`. Thunks `loginThunk`, `registerThunk`, `fetchMe`; reducers
  `setAuth`, `clearAuth`. Token and user are mirrored into `localStorage`
  under `lifetrack.token` and `lifetrack.user`.
- **`useAuth()`** in `lib/auth.jsx` is the only way pages touch auth. It wraps
  the store and exposes `user`, `token`, `isAuthenticated`, `isAdmin`,
  `loading`, `login`, `register`, `logout`. Do not `useSelector` auth state
  directly from a page.
- **`ReferenceProvider`** in `lib/reference.jsx` is still React Context. It
  loads `/api/reference` and `/api/settings` after login and exposes them via
  `useReference()`, along with `saveSettings`. It also owns presentation-only
  maps: `CATEGORY_COLOR` / `colorForCategory` and `MOOD_DISPLAY` /
  `moodDisplay`. Backend decides which categories and moods exist; the design
  system decides how they look.
- Everything else is local component state.

This split is a known inconsistency (auth on Redux, reference on Context). Do
not "fix" it as a side effect of an unrelated task.

### 2.6 Data fetching — `lib/useApi.js`

`useApi(fetchFn, deps)` returns `{ data, setData, loading, error, reload }`.
It runs `fetchFn` on mount and whenever `deps` change, starts `loading` at
`true`, stores `err.message` in `error`, and guards the mount request with a
`cancelled` flag. `setData` is exposed so callers can apply optimistic updates;
`reload()` refetches after a mutation.

Adopted by `ExpensesPage`, `AnalyticsPage`, and `JournalPage`.

Deliberately **not** adopted by:

- `DashboardPage`, `AdminPage`, and `ReferenceProvider`, which use
  `Promise.allSettled` so one failing source does not blank the other. A single
  `error` string cannot express partial failure.
- `DailyLogPage`, whose two effects are conditional (`activeTab === 'history'`)
  and dependency-keyed (`editingDate`).

When adding a page: use `useApi` for a straightforward load, and keep
`allSettled` when two independent sources must fail independently. State which
you chose and why.

### 2.7 Mutation pattern

Create, update, and delete apply an optimistic update first, then reconcile:

1. Snapshot current data.
2. Apply the change locally via `setData` (guard with `(prev || [])` — `data`
   starts as `null`).
3. Await the API call.
4. On failure, restore the snapshot and set an error message.

`ExpensesPage`, `JournalPage`, and the habit toggle in `DailyLogPage` all follow
this. Match it rather than inventing a new approach.

### 2.8 Dates — `lib/date.js`

All date formatting lives here: `formatLocalDate`, `todayIso`,
`getDefaultFromDate`, `getDefaultToDate`, `isoToShort`, `weekdayShort`. Do not
redefine any of these in a page.

Dates are **local-machine calendar dates**, deliberately:

- `formatLocalDate` uses `getFullYear` / `getMonth` / `getDate`, never
  `toISOString()`, which would shift the day for negative UTC offsets.
- `isoToShort` and `weekdayShort` parse `iso + 'T00:00:00'` with no `Z`, so
  parsing happens in local time.
- Payloads send a bare `yyyy-mm-dd` string with no timezone.

Display labels hard-code the `'en-US'` locale so output is identical on every
machine and matches the approved screenshots. Changing that is a visible change
and needs explicit direction.

### 2.9 Shared components

| Component | Purpose |
|---|---|
| `AppShell` | Authenticated shell: overlay, `Sidebar`, main content. Accepts `active`, `dataScreenLabel`, optional `sidebar` override |
| `AuthShell` | Login/register card shell |
| `Sidebar` | Authenticated navigation, active-item treatment |
| `BrandLogo` | Official LifeTrack mark and wordmark |
| `PageHeader` | Title, subtitle, optional actions |
| `SegmentedTabs` | Tab control (`tabs`, `activeTab`, `onTabChange`) |
| `PasswordInput` | Password field with visibility toggle |
| `UserProfileModal` | Profile modal |
| `ColorPipelineCard` | Marketing/preview card |
| `DailyLogHistory` | Daily-log history list (`logs`, `loading`, `error`, `onEdit`, `onDelete`) |

`components/` holds both genuinely shared shells and single-use page sections.
That is accepted; it is not licence to extract every block into a file. Extract
only when repetition is already real, per section 7.

### 2.10 Styling entry points

`index.css` imports `styles/main.css`, which imports in order: `tokens.css`,
`reset.css`, `typography.css`, `layout.css`, `components.css`, then the
page sheets `daily-log.css`, `expenses.css`, `journal.css`, `analytics.css`,
`admin.css`.

Two current quirks to be aware of rather than silently changing:

- `about.css` is not imported by `main.css`; `AboutPage` imports it directly.
- Some pages also import a page sheet that `main.css` already imports.
- `App.css` is empty and its comment references a file that does not exist.

### 2.11 Testing

`npm.cmd test` runs Vitest once (`vitest run`). Config is `vitest.config.js`:
jsdom environment, globals enabled, setup file
`src/store/__tests__/setup.js`. Existing tests cover `authSlice` and the auth
flow, including a `LoginPage` integration test that mocks `lib/api`. Component
coverage beyond auth is thin — adding a test alongside a behavioural change is
encouraged.

### 2.12 Known gaps

Do not treat these as bugs to fix opportunistically. They are tracked
decisions.

- Auth uses Redux while reference uses Context.
- `useApi`'s `reload()` has no `cancelled` guard, unlike its mount effect, and
  duplicates the mount effect body.
- `ProtectedRoute` renders `null` while auth resolves, so a hard refresh shows
  a blank page until `/auth/me` returns.
- `DailyLogPage` is the largest page and still holds several hand-rolled
  effects.
- The JWT is stored in `localStorage`, which is XSS-exposed. This was a
  deliberate simplicity choice over httpOnly cookies.
- `JournalPage` sends `new Date().toLocaleString()` to the AI service, so the
  string format varies by machine locale.
- Tailwind is installed but unused.

## 3. Required reading order

For every frontend task, inspect these sources in this order.

### Always inspect

1. This guide.
2. [`UI/design-system/README.md`](UI/design-system/README.md).
3. [`UI/Reference.html`](UI/Reference.html), the rendered component and
   typography catalogue.
4. The existing implementation files:
   - [`frontend/src/App.jsx`](frontend/src/App.jsx) for routing and access rules
   - [`frontend/src/main.jsx`](frontend/src/main.jsx) for the provider tree
   - [`frontend/src/lib/api.js`](frontend/src/lib/api.js) for the endpoint groups
   - [`frontend/src/styles/main.css`](frontend/src/styles/main.css)
   - [`frontend/src/styles/tokens.css`](frontend/src/styles/tokens.css)
   - [`frontend/src/styles/typography.css`](frontend/src/styles/typography.css)
   - [`frontend/src/styles/layout.css`](frontend/src/styles/layout.css)
   - [`frontend/src/styles/components.css`](frontend/src/styles/components.css)
5. [`frontend/src/assets/`](frontend/src/assets/) and
   [`frontend/public/`](frontend/public/) before creating or sourcing imagery.

### Inspect when relevant

Read the specific design-system document before changing that area:

| Area being changed | Required reference |
|---|---|
| Tokens or raw values | [`UI/design-system/01-design-tokens.md`](UI/design-system/01-design-tokens.md) |
| Colors or status meaning | [`UI/design-system/02-color-system.md`](UI/design-system/02-color-system.md) |
| Fonts or text hierarchy | [`UI/design-system/03-typography.md`](UI/design-system/03-typography.md) |
| Page structure, grid, spacing or breakpoint | [`UI/design-system/04-spacing-layout.md`](UI/design-system/04-spacing-layout.md) |
| Shadows, overlays or elevation | [`UI/design-system/05-shadows-elevation.md`](UI/design-system/05-shadows-elevation.md) |
| Cards, buttons, forms, navigation, tables, charts, modals or toasts | [`UI/design-system/06-components.md`](UI/design-system/06-components.md) |
| Logo, wordmark or brand placement | [`UI/design-system/07-logo-guidelines.md`](UI/design-system/07-logo-guidelines.md) |

Then inspect the closest existing React page and its page-specific stylesheet.
A public marketing page must first inspect
[`frontend/src/pages/LandingPage.jsx`](frontend/src/pages/LandingPage.jsx); an
authenticated data page must first inspect an existing page using `AppShell`,
`useApi` loading states, and the appropriate card/table patterns — for example
[`frontend/src/pages/ExpensesPage.jsx`](frontend/src/pages/ExpensesPage.jsx).

## 4. Approved screen references

Use the closest approved screen as the visual baseline. Do not reinterpret its
overall hierarchy without explicit user direction.

| Screen | Reference |
|---|---|
| Landing | [`UI/1. Landing page.jpg`](UI/1.%20Landing%20page.jpg) |
| Registration | [`UI/2. Registration Page.png`](UI/2.%20Registration%20Page.png) |
| Login | [`UI/3. Login Page.jpg`](UI/3.%20Login%20Page.jpg) |
| Dashboard | [`UI/4. Dahboard.png`](UI/4.%20Dahboard.png) |
| Daily Log | [`UI/5. Daily Log.png`](UI/5.%20Daily%20Log.png) |
| Expenses | [`UI/6. Expense Page.png`](UI/6.%20Expense%20Page.png) |
| Journal | [`UI/7. Journal And Self Reflection.png`](UI/7.%20Journal%20And%20Self%20Reflection.png) |
| Analytics | [`UI/8. Trends Page.png`](UI/8.%20Trends%20Page.png) |
| Admin | [`UI/Admin page.png`](UI/Admin%20page.png) |

A screenshot governs composition and visual hierarchy. `Reference.html` and
the design-system documents govern exact reusable values and component states.
Existing working behavior must be preserved when a screenshot depicts an old
or non-functional concept.

## 5. Source-of-truth priority

When sources appear to conflict, use this priority:

1. The user's current explicit instruction.
2. Existing working authentication, routing, API and data behavior.
3. The approved screenshot for the relevant page.
4. `UI/Reference.html` and `UI/design-system/`.
5. Shared React components and shared CSS already used by the application.
6. Page-specific CSS.

Do not silently choose between genuine conflicts. State the conflict and use the
highest-priority source.

## 6. Rules before adding a page

Create the file at `frontend/src/pages/XxxPage.jsx` and register the route in
`frontend/src/App.jsx`. Before that, the agent must:

1. Search for an existing page with the same shell:
   - Public pages use the landing-page top navigation.
   - Authenticated user pages use `AppShell` (which renders `Sidebar`).
   - Administrator pages preserve administrator access and navigation.
2. Reuse the exact existing header, logo lockup, navigation DOM and class names.
   Do not create a route-specific imitation of a shared header or sidebar.
3. Decide route protection and wire it in `App.jsx` with `ProtectedRoute`
   (add `requireAdmin` for administrator-only). Do not expose protected content
   publicly or protect a public informational page accidentally.
4. Reuse existing assets. Do not generate or fabricate people, logos,
   screenshots, statistics, or product capabilities.
5. Reuse `main.css` and its imported design system. Add one narrowly scoped
   page stylesheet only when shared classes cannot express the page, and import
   it in exactly one place.
6. Match the existing `--content-max-width`, `--topnav-height`, spacing scale,
   grid behavior and responsive breakpoints unless the approved reference
   explicitly requires a documented variation.
7. Reach the backend only through an endpoint group in `lib/api.js`, and load it
   with `useApi` unless partial-failure tolerance requires `allSettled`.
8. Define honest loading, error and empty states for any API-backed region.
9. Use `lib/date.js` for every date value or label.
10. Ensure every visible interactive element has a real destination or action.
11. Confirm the page is understandable at normal browser zoom before testing
    alternate zoom levels.

### A page must not

- Duplicate the shared top navigation or sidebar with new class names.
- Call `axios` or `fetch` directly instead of using `lib/api.js`.
- Read auth state from the store directly instead of using `useAuth()`.
- Redefine a helper that already exists in `lib/date.js`.
- Replace the official LifeTrack SVG mark with Unicode, emoji or a new drawing.
- Make the LifeTrack wordmark clickable unless the user explicitly reverses
  the current requirement that it remain non-clickable.
- Require 50%, 80%, or any other browser zoom to become usable.
- Use CSS `zoom`, global `transform: scale(...)`, or zoom-specific hacks.
- Introduce a new font, palette, spacing scale or shadow language.
- Introduce Tailwind utility classes.
- Show invented user data, metrics, charts, testimonials or counts as real.
- Add routes, backend fields, dependencies or database changes merely to fill
  visual space.

## 7. Rules before adding a component

Before creating a component, search:

1. `frontend/src/components/`
2. `frontend/src/styles/components.css`
3. `UI/Reference.html`
4. `UI/design-system/06-components.md`
5. Existing page JSX for a working instance

If the pattern already exists, reuse it. A new component is justified only when
there is a real behavior or repeated UI unit not represented by the existing
system.

When a new component is justified:

- Compose existing tokens and classes instead of creating another mini design
  system.
- Keep business calculations and domain rules out of the component.
- Accept data and callbacks through clear props.
- Keep purely local UI state inside the component; keep fetching and API calls
  in the page that owns the data.
- Return a fragment when the parent already provides the card wrapper.
- Include loading, error, empty, disabled, hover, focus and keyboard behavior
  when those states apply.
- Use semantic HTML first. Add ARIA only where native semantics are
  insufficient.
- Use an actual `button` for an action and a `Link`/anchor for navigation.
- Give icon-only controls an accessible name.
- Preserve a minimum 44×44px interactive target where practical.
- Respect `prefers-reduced-motion`.
- Do not copy a large block of markup into multiple pages. Reuse an existing
  component, or extract a narrowly scoped shared component when repetition is
  already real.

Do not over-engineer speculative reusable abstractions. LifeTrack needs a
stable shared presentation layer, not a second framework inside the project.
Extraction that moves lines between files without reducing complexity is not an
improvement; say so instead of doing it.

## 8. Typography contract

Typography comes from `UI/Reference.html`,
`UI/design-system/03-typography.md`, and the existing typography tokens:

- Display/page/section headings: `Playfair Display` via `--font-display`.
- Body text, UI text, navigation and card headings: `Inter` via
  `--font-body`.
- Use the semantic classes already provided:
  - `.text-display`
  - `.page-title`
  - `.section-heading`
  - `.card-heading`
  - `.sub-heading`
  - `.text-base`, `.text-sm`, `.text-xs`
  - `.font-display`, `.font-body`
- Use weight and line-height tokens. Do not approximate the reference with
  arbitrary pixel sizes.
- Do not add route-specific font stacks.
- A page-specific stylesheet may control layout margins and alignment around a
  heading, but it must not replace the shared font family or hierarchy.

Public pages that share navigation must use the same logo typography, navigation
typography and body font classes.

## 9. Color, spacing and visual effects

- Use existing semantic CSS variables. Do not hard-code a hex value when a
  matching token exists.
- Use the documented 4px spacing scale.
- Use the documented radius and shadow tokens.
- Terracotta/clay is the primary action color.
- Sage communicates positive or health-related data.
- Warm sand/taupe tokens provide surfaces, borders and supporting text.
- Category swatches and mood chrome come from `lib/reference.jsx`
  (`colorForCategory`, `moodDisplay`), not from new per-page maps.
- Avoid arbitrary gradients, pure-black shadows, excessive blur, or unrelated
  accent colors.
- Do not modify global tokens to fix one page. If the design system truly must
  change, update `UI/design-system/tokens.json`, the relevant documentation and
  the CSS token together, and explain the repository-wide impact.

## 10. Asset and imagery contract

Before adding an image:

1. Inspect `frontend/src/assets/`, `frontend/public/`, and the relevant `UI/`
   screenshot.
2. Reuse the botanical, mesh, logo and other supplied assets in their intended
   context.
3. Preserve aspect ratio and avoid enlarging low-resolution assets beyond a
   reasonable display size.
4. Supply meaningful `alt` text for informative images and empty `alt` text or
   `aria-hidden="true"` for decorative imagery.

Never fabricate a named person's portrait or imply that a generated face is
that person. If team photographs are absent, use a clearly neutral placeholder
or request the real photographs.

Do not use React/Vite starter assets in finished LifeTrack UI. Note that
`assets/react.svg` and `assets/vite.svg` still exist; leave them alone unless
removing them is the task.

## 11. Navigation and interaction contract

- A control that looks clickable must work.
- A control that is unavailable must be removed or clearly disabled with an
  explanation.
- Do not use `href="#"` as a finished interaction.
- Understand anchor navigation before changing it: for example, Landing
  “Preview” points to an existing section, not a separate route.
- Preserve the active navigation treatment using the shared classes.
- Logout, destructive actions and externally visible mutations must retain
  their established confirmation and security behavior.
- Preserve the optimistic-update-with-rollback pattern described in section 2.7
  for destructive actions.
- Do not add decorative dropdown arrows, tabs, filters or menus unless the
  interaction exists.

## 12. Data and architecture contract

The boundary is:

```text
React presentation
        ↓ HTTP (springClient)          ↓ HTTP (aiClient)
Spring Security + controllers + DTOs   FastAPI AI service
        ↓                                     ↑
Services: validation, rules, aggregation      |
        ↓                              /api/ai-context
JPA/Hibernate                          supplies the context
        ↓
MySQL
```

Therefore:

- React renders state, captures input and calls APIs.
- Spring Boot owns validation, authorization, business rules and aggregation.
- MySQL-backed responses are the source of displayed user metrics.
- Totals, percentages, budget usage and streaks come from `/api/analytics` or
  `/api/insights`. React must not compute them. `ExpensesPage` is the reference
  for this: it reads `analytics.totalExpenses`, `analytics.expensesByCategory`
  and `analytics.budgetUsagePct` rather than summing rows.
- Do not move business rules into JSX, chart components or CSS-heavy pages.
- Mapping a response into a chart's point shape is presentation and belongs in
  a `useMemo` in the page. Deriving a business figure is not.
- Do not display seeded/random/demo values as authenticated user data.
- Marketing-only examples must be clearly confined to the public preview.
- The Python AI service is wired: `aiApi.chat`, `aiApi.insights` and
  `aiApi.command` call the FastAPI service, and `aiContextApi.get(days)` fetches
  the aggregated context from Spring that gets passed to it. `JournalPage` is
  the only consumer today. There is still no Spring AI integration — do not
  claim one.
- Do not modify backend or database structures during a frontend-only task
  unless the user explicitly expands the scope.

## 13. Responsive and visual verification

Every new or materially changed page/component must be checked for:

- No horizontal scrolling at 390px, 768px, 1024px, 1366px and 1920px widths.
- Readable normal usage at 100% browser zoom.
- Stable layout at the user's common 80% Chrome zoom.
- No desktop-to-mobile breakpoint that stacks major sections prematurely.
- No fluid `clamp()` value that becomes dramatically larger than the approved
  reference.
- No image aspect ratio that unintentionally controls the entire page height.
- No fixed/minimum height that creates large empty regions.
- Header, sidebar and content widths matching their shared tokens.
- Keyboard focus visibility and sensible tab order.

Browser zoom may be used for verification, never as the implementation
mechanism.

If browser/DOM inspection is unavailable, the agent must say that visual QA was
not performed and must not claim pixel-perfect verification.

## 14. Scope and collaboration safety

- Preserve unrelated edits and assume another agent may be working in the same
  repository.
- Inspect `git status` and the target files before editing.
- Do not rewrite a whole page when a narrow change is sufficient.
- Do not change reference screenshots, `UI/Reference.html`, or design-system
  documentation merely to make an implementation appear compliant.
- Do not delete or replace user work to resolve a style conflict.
- Keep page-specific rules scoped to the page. Avoid broad selectors that can
  alter authenticated screens unintentionally.
- Do not install a new UI library or dependency without explicit approval.
- Do not opportunistically fix an item from section 2.12. Those are tracked
  decisions; changing one is its own task.
- When a refactor is requested, state the expected effect on readability
  honestly, including when the change moves code without simplifying it.

## 15. Mandatory validation

After frontend changes, run all three from `frontend/`:

1. `npm.cmd run lint`
2. `npm.cmd run build`
3. `npm.cmd test`

Then review the changed files for:

- duplicated shared UI
- raw colors or arbitrary fonts
- dead controls
- mock authenticated data
- unused imports/classes
- direct `axios`/`fetch` use outside `lib/api.js`
- date helpers redefined outside `lib/date.js`
- `setData` callbacks that assume `data` is not `null`
- accidental route or access changes

When visual testing is available or requested, compare against the relevant
approved screenshot and `UI/Reference.html` at normal zoom.

Passing lint, build and tests does not prove visual correctness. A task is
complete only when it also follows the reference hierarchy and reuse rules
above.

## 16. Required agent handoff

Before editing, briefly state:

- which approved screen/document was inspected
- which existing component/classes/assets will be reused
- whether behavior or data flow will change

After editing, report:

- what was reused
- what was added
- whether any reference or asset was missing
- whether lint, build and tests passed
- whether browser visual QA was actually performed
- which specific behaviors were verified and which were not

Never claim that a screen matches the reference unless it was compared against
that reference. Never claim a behavior was confirmed if only lint and build were
run.

## 17. Preflight checklist

An agent should be able to answer “yes” to every applicable item:

- [ ] I inspected the relevant approved screenshot.
- [ ] I inspected `UI/Reference.html`.
- [ ] I read the relevant design-system documents.
- [ ] I read section 2 and matched the existing state, fetching and mutation
      patterns.
- [ ] I searched existing components, classes and pages before creating new UI.
- [ ] I inspected existing assets before adding imagery.
- [ ] I am reusing the official logo and shared navigation.
- [ ] My typography uses the documented semantic classes.
- [ ] My colors, spacing, radii and shadows use tokens.
- [ ] I added no Tailwind utility classes.
- [ ] New pages live in `src/pages/` and are routed from `App.jsx`.
- [ ] I understand whether this route is public, protected or admin-only.
- [ ] All HTTP goes through an endpoint group in `lib/api.js`.
- [ ] All dates go through `lib/date.js`.
- [ ] Loading, error and empty states exist for every API-backed region.
- [ ] Every visible interaction works.
- [ ] Every authenticated metric comes from a real API/MySQL source.
- [ ] I did not add frontend business logic that belongs in Spring Boot.
- [ ] The layout works without browser zoom hacks.
- [ ] I preserved unrelated work and touched no section 2.12 item by accident.
- [ ] I ran lint, production build and tests.
- [ ] I accurately reported whether visual browser QA occurred.
