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

## 2. Required reading order

For every frontend task, inspect these sources in this order.

### Always inspect

1. This `AGENTS.md`.
2. [`UI/design-system/README.md`](UI/design-system/README.md).
3. [`UI/Reference.html`](UI/Reference.html), the rendered component and
   typography catalogue.
4. The existing implementation files:
   - [`frontend/src/styles/main.css`](frontend/src/styles/main.css)
   - [`frontend/src/styles/tokens.css`](frontend/src/styles/tokens.css)
   - [`frontend/src/styles/typography.css`](frontend/src/styles/typography.css)
   - [`frontend/src/styles/layout.css`](frontend/src/styles/layout.css)
   - [`frontend/src/styles/components.css`](frontend/src/styles/components.css)
5. [`frontend/src/App.jsx`](frontend/src/App.jsx) for routing and access rules.
6. [`frontend/src/assets/`](frontend/src/assets/) and
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
For example, a public marketing page must first inspect `LandingPage.jsx`; an
authenticated data page must first inspect an existing page using `Sidebar`,
API loading states, and the appropriate card/table patterns.

## 3. Approved screen references

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

## 4. Source-of-truth priority

When sources appear to conflict, use this priority:

1. The user's current explicit instruction.
2. Existing working authentication, routing, API and data behavior.
3. The approved screenshot for the relevant page.
4. `UI/Reference.html` and `UI/design-system/`.
5. Shared React components and shared CSS already used by the application.
6. Page-specific CSS.

Do not silently choose between genuine conflicts. State the conflict and use the
highest-priority source.

## 5. Rules before adding a page

Before creating a page, the agent must:

1. Search for an existing page with the same shell:
   - Public pages use the landing-page top navigation.
   - Authenticated user pages use the shared application shell and `Sidebar`.
   - Administrator pages preserve administrator access and navigation.
2. Reuse the exact existing header, logo lockup, navigation DOM and class names.
   Do not create a route-specific imitation of a shared header or sidebar.
3. Determine route protection from `App.jsx`. Do not expose protected content
   publicly or protect a public informational page accidentally.
4. Reuse existing assets. Do not generate or fabricate people, logos,
   screenshots, statistics, or product capabilities.
5. Reuse `main.css` and its imported design system. Add one narrowly scoped
   page stylesheet only when shared classes cannot express the page.
6. Match the existing `--content-max-width`, `--topnav-height`, spacing scale,
   grid behavior and responsive breakpoints unless the approved reference
   explicitly requires a documented variation.
7. Define honest loading, error and empty states for any API-backed region.
8. Ensure every visible interactive element has a real destination or action.
9. Confirm the page is understandable at normal browser zoom before testing
   alternate zoom levels.

### A page must not

- Duplicate the shared top navigation or sidebar with new class names.
- Replace the official LifeTrack SVG mark with Unicode, emoji or a new drawing.
- Make the LifeTrack wordmark clickable unless the user explicitly reverses
  the current requirement that it remain non-clickable.
- Require 50%, 80%, or any other browser zoom to become usable.
- Use CSS `zoom`, global `transform: scale(...)`, or zoom-specific hacks.
- Introduce a new font, palette, spacing scale or shadow language.
- Show invented user data, metrics, charts, testimonials or counts as real.
- Add routes, backend fields, dependencies or database changes merely to fill
  visual space.

## 6. Rules before adding a component

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

## 7. Typography contract

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

## 8. Color, spacing and visual effects

- Use existing semantic CSS variables. Do not hard-code a hex value when a
  matching token exists.
- Use the documented 4px spacing scale.
- Use the documented radius and shadow tokens.
- Terracotta/clay is the primary action color.
- Sage communicates positive or health-related data.
- Warm sand/taupe tokens provide surfaces, borders and supporting text.
- Avoid arbitrary gradients, pure-black shadows, excessive blur, or unrelated
  accent colors.
- Do not modify global tokens to fix one page. If the design system truly must
  change, update `UI/design-system/tokens.json`, the relevant documentation and
  the CSS token together, and explain the repository-wide impact.

## 9. Asset and imagery contract

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

Do not use React/Vite starter assets in finished LifeTrack UI.

## 10. Navigation and interaction contract

- A control that looks clickable must work.
- A control that is unavailable must be removed or clearly disabled with an
  explanation.
- Do not use `href="#"` as a finished interaction.
- Understand anchor navigation before changing it: for example, Landing
  “Preview” points to an existing section, not a separate route.
- Preserve the active navigation treatment using the shared classes.
- Logout, destructive actions and externally visible mutations must retain
  their established confirmation and security behavior.
- Do not add decorative dropdown arrows, tabs, filters or menus unless the
  interaction exists.

## 11. Data and architecture contract

The Phase 3 boundary is:

```text
React presentation
        ↓ HTTP
Spring Security + controllers + DTOs
        ↓
Services: validation, rules and aggregation
        ↓
JPA/Hibernate
        ↓
MySQL
```

Therefore:

- React renders state, captures input and calls APIs.
- Spring Boot owns validation, authorization, business rules and aggregation.
- MySQL-backed responses are the source of displayed user metrics.
- Do not move business rules into JSX, chart components or CSS-heavy pages.
- Do not display seeded/random/demo values as authenticated user data.
- Marketing-only examples must be clearly confined to the public preview.
- Python AI/RAG is Phase 4. Do not claim Spring AI integration or present
  planned AI behavior as an existing Phase 3 capability.
- Do not modify backend or database structures during a frontend-only task
  unless the user explicitly expands the scope.

## 12. Responsive and visual verification

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

## 13. Scope and collaboration safety

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

## 14. Mandatory validation

After frontend changes:

1. Run `npm.cmd run lint` from `frontend/`.
2. Run `npm.cmd run build` from `frontend/`.
3. Review the changed files for:
   - duplicated shared UI
   - raw colors or arbitrary fonts
   - dead controls
   - mock authenticated data
   - unused imports/classes
   - accidental route or access changes
4. When visual testing is available or requested, compare against the relevant
   approved screenshot and `UI/Reference.html` at normal zoom.

Passing lint and build does not prove visual correctness. A task is complete
only when it also follows the reference hierarchy and reuse rules above.

## 15. Required agent handoff

Before editing, briefly state:

- which approved screen/document was inspected
- which existing component/classes/assets will be reused
- whether behavior or data flow will change

After editing, report:

- what was reused
- what was added
- whether any reference or asset was missing
- whether lint and build passed
- whether browser visual QA was actually performed

Never claim that a screen matches the reference unless it was compared against
that reference.

## 16. Preflight checklist

An agent should be able to answer “yes” to every applicable item:

- [ ] I inspected the relevant approved screenshot.
- [ ] I inspected `UI/Reference.html`.
- [ ] I read the relevant design-system documents.
- [ ] I searched existing components, classes and pages before creating new UI.
- [ ] I inspected existing assets before adding imagery.
- [ ] I am reusing the official logo and shared navigation.
- [ ] My typography uses the documented semantic classes.
- [ ] My colors, spacing, radii and shadows use tokens.
- [ ] I understand whether this route is public, protected or admin-only.
- [ ] Every visible interaction works.
- [ ] Every authenticated metric comes from a real API/MySQL source.
- [ ] I did not add frontend business logic that belongs in Spring Boot.
- [ ] The layout works without browser zoom hacks.
- [ ] I preserved unrelated work.
- [ ] I ran lint and production build.
- [ ] I accurately reported whether visual browser QA occurred.

