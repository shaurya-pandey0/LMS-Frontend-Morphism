# 04 · Spacing & Layout

Spatial rules and grid system for LifeTrack. All spacing values are in the token table in [`01-design-tokens.md`](./01-design-tokens.md).

---

## 1. Spacing scale recap

Based on a **4px base unit**. Use only these values — no arbitrary pixel counts.

| Token | px | rem | Common use |
|-------|----|----|------------|
| `space-1` | 4 | 0.25 | Inline icon gap, tight padding |
| `space-2` | 8 | 0.50 | Icon-to-label gap, tight list spacing |
| `space-3` | 12 | 0.75 | Input internal padding, badge padding |
| `space-4` | 16 | 1.00 | Card padding (compact), section gap (small) |
| `space-5` | 20 | 1.25 | Card padding (standard), nav item padding |
| `space-6` | 24 | 1.50 | Card padding (large), between card rows |
| `space-8` | 32 | 2.00 | Between major sections on a page |
| `space-10` | 40 | 2.50 | Page top/bottom padding |
| `space-12` | 48 | 3.00 | Hero vertical spacing |
| `space-16` | 64 | 4.00 | Landing page section gap |

---

## 2. Page-level layout

### 2a. Authenticated pages (Dashboard, Daily Log, Expenses, Journal, Trends, Admin)

```
┌────────────────────────────────────────────────────────┐
│  Top navigation bar  (h: 64px, fixed)                  │
├──────────┬─────────────────────────────────────────────┤
│ Sidebar  │  Main content area                          │
│ w: 220px │  padding: space-6 (24px)                    │
│ fixed    │  max-width: 1280px                          │
│          │  centered horizontally                      │
│          │                                             │
│          │  ┌──────┐ ┌──────┐ ┌──────┐                │
│          │  │ Card │ │ Card │ │ Card │ ← grid          │
│          │  └──────┘ └──────┘ └──────┘                │
│          │                                             │
└──────────┴─────────────────────────────────────────────┘
```

| Element | Value | Notes |
|---------|-------|-------|
| Top nav height | 64px | Contains logo, nav links, user avatar |
| Sidebar width | 220px | Fixed left rail; collapses to icon-only (56px) on tablet |
| Main content padding | `space-6` (24px) | All sides |
| Main content max-width | 1280px | Prevents ultra-wide stretch |
| Content grid gap | `space-6` (24px) | Between cards / panels |

### 2b. Unauthenticated pages (Landing, Login, Register)

```
┌──────────────────────────────────────────────────────────┐
│  Full-viewport beige background + botanical overlay      │
│                                                          │
│        ┌────────────────────────────────┐                │
│        │   Centered card (auth form)    │                │
│        │   max-width: 520px             │                │
│        │   padding: space-10 (40px)     │                │
│        └────────────────────────────────┘                │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

| Element | Value |
|---------|-------|
| Auth card max-width | 520px |
| Auth card padding | `space-10` (40px) top/bottom, `space-8` (32px) left/right |
| Auth card border-radius | `radius-lg` (16px) |
| Background | `sand-50` with botanical shadow overlay (CSS `background-image`) |

### 2c. Landing page

```
┌──────────────────────────────────────────────────────────┐
│  Navbar: logo left, "SaaS Landing" right  (h: 64px)     │
├─────────────────────────┬────────────────────────────────┤
│  Dashboard preview      │  Hero text block               │
│  (mockup cards,         │  "Bring Balance to Your        │
│   chart preview)        │   Balance"                     │
│  ~55% width             │  + CTA button                  │
│                         │  ~45% width                    │
└─────────────────────────┴────────────────────────────────┘
```

| Element | Value |
|---------|-------|
| Layout | Two-column, ~55/45 split |
| Hero padding | `space-16` (64px) vertical |
| Gap between columns | `space-8` (32px) |

---

## 3. Grid system

### Dashboard / inner pages

Use CSS Grid with **auto-fill columns** that snap to a minimum card width.

```css
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-6);  /* 24px */
}
```

**Observed column counts per page:**

| Page | Desktop columns | Tablet | Mobile |
|------|----------------|--------|--------|
| Dashboard | 3 (sidebar, chart, finance) | 2 | 1 |
| Daily Log | 3 (metrics, meals, habits+mood) | 2 | 1 |
| Expenses | 3 (form, history, chart) | 2 | 1 |
| Journal | 3 (new entry, history, AI assistant) | 2 | 1 |
| Trends | 2 (2×2 chart grid) | 1 | 1 |
| Admin | 2 (charts, stats) + stat row | 1 | 1 |

### Stat row (Admin)

```css
.stat-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-6);
}
```

---

## 4. Card anatomy

```
┌──────────────────────────────────────┐
│  padding: space-5 (20px)             │  ← card body
│                                      │
│  Heading (text-xl, semibold)         │
│  ─────────────────── ← divider       │
│  Content                             │
│                                      │
│  [Action button]                     │
│                                      │
└──────────────────────────────────────┘
   border-radius: radius-md (10px)
   border: 1px solid sand-200
   shadow: shadow-xs
   bg: sand-0 (white)
```

| Property | Value |
|----------|-------|
| Padding | `space-5` (20px) all sides |
| Border | 1px solid `sand-200` |
| Border radius | `radius-md` (10px) |
| Shadow | `shadow-xs` (resting), `shadow-sm` (hover) |
| Internal heading-to-content gap | `space-4` (16px) |
| Internal content item gap | `space-3` (12px) |

---

## 5. Sidebar anatomy

```
┌──────────────┐
│  Logo area   │  h: 64px, aligns with top nav
│  (space-5)   │
├──────────────┤
│  Nav item    │  h: 44px, padding-x: space-4
│  Nav item    │  gap between items: space-1 (4px)
│  Nav item ◄──│── Active: clay-500 bg pill, radius-md
│  Nav item    │
│              │
│              │
│  ┌────────┐  │
│  │ Avatar │  │  Bottom-aligned, padding: space-4
│  │ Name   │  │
│  └────────┘  │
└──────────────┘
   w: 220px
   bg: sand-0
   border-right: 1px solid sand-200
```

---

## 6. Top navigation bar

```
┌─────────────────────────────────────────────────────────────┐
│  Logo (left)     Nav links (center)        Avatar (right)   │
│  space-5 pad     gap: space-8 (32px)       space-5 pad      │
│                  active: underline clay-500 (3px)            │
└─────────────────────────────────────────────────────────────┘
   h: 64px
   bg: transparent (overlays card bg)
   border-bottom: 1px solid sand-200
```

---

## 7. Form layout

### Input fields

| Property | Value |
|----------|-------|
| Height | 44px (single line) |
| Padding | `space-3` (12px) horizontal |
| Gap between fields | `space-5` (20px) |
| Label-to-input gap | `space-2` (8px) |
| Border radius | `radius-sm` (6px) on inner pages; bottom-border only on auth pages |

### Auth page form

| Property | Value |
|----------|-------|
| Input style | Bottom-border only (1px `sand-200`) |
| Heading to first input | `space-8` (32px) |
| Input to input | `space-5` (20px) |
| Last input to button | `space-6` (24px) |
| Button width | 100% of form container |
| Footer link ("Already have an account?") | `space-6` (24px) below button |

---

## 8. Breakpoints

| Name | min-width | Layout changes |
|------|-----------|---------------|
| `mobile` | 0 | Single column, sidebar hidden, hamburger menu |
| `tablet` | 768px | Two columns, sidebar collapses to icon-only (56px) |
| `desktop` | 1024px | Full sidebar (220px), three columns |
| `wide` | 1280px | Content max-width caps at 1280px |

---

## 9. Z-index layering

Defined in [`01-design-tokens.md`](./01-design-tokens.md) § 6. Practical stacking:

```
z-toast    (1400)  ── Toasts / snackbars
z-modal    (1300)  ── Modal dialogs
z-overlay  (1200)  ── Modal backdrop, drawer scrim
z-sticky   (1100)  ── Sticky top nav, filter bars
z-dropdown (1000)  ── Dropdown menus, tooltips
z-base     (0)     ── Normal page flow
```

---

## 10. Scrolling behavior

| Region | Behavior |
|--------|----------|
| Top nav | Sticky (`position: sticky; top: 0`) |
| Sidebar | Fixed full-height, internal scroll if needed |
| Main content | Normal document scroll |
| Modal content | Internal scroll with `overflow-y: auto` |
| Card with long list (e.g. transaction history) | Internal scroll, max-height ~400px |
