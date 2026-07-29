# UI Consolidation — Phase 1

## Goal

Remove repeated React markup without changing the current UI or behavior.

## Components to Extract

- `AppShell` — shared Sidebar and authenticated-page layout
- `PageHeader` — page title, subtitle, and optional actions
- `BrandLogo` — one LifeTrack logo used everywhere
- `AuthShell` — shared Login/Register background and card
- `PasswordInput` — reusable password field with show/hide
- `SegmentedTabs` — reusable Today/History tabs

## Flow

```text
Existing repeated markup
        ↓
Extract shared component
        ↓
Replace duplicates page by page
        ↓
Compare with the live website
        ↓
Lint and build
```

## Rules

- Reuse the existing CSS classes and design tokens.
- Keep all API, Redux, validation, routes, text, and page logic unchanged.
- Use the current live website as the visual reference.
- Do not use screenshots from `UI/`.
- Do not add Bootstrap, mobile navigation, new styles, or generic wrappers.
- Do not delete CSS selectors.

## Complete When

- All six components replace their duplicated markup.
- Every page looks and behaves exactly as before.
- `npm.cmd run lint` passes.
- `npm.cmd run build` succeeds.
