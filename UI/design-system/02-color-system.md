# 02 · Color System

Semantic color assignments that map raw palette tokens from [`01-design-tokens.md`](./01-design-tokens.md) to their UI roles. **Always reference the semantic name**, not the raw hex, so a future palette refresh only requires changing the mapping in one place.

---

## 1. Surface & background

| Semantic token | Maps to | Use |
|----------------|---------|-----|
| `color-bg-app` | `sand-50` · `#FAF6F1` | Root application background |
| `color-bg-card` | `sand-0` · `#FFFFFF` | Card / panel surface (top layer) |
| `color-bg-card-alt` | `sand-100` · `#F2EBE3` | Alternating card, sidebar background, input panel |
| `color-bg-sidebar` | `sand-0` · `#FFFFFF` | Left sidebar rail |
| `color-bg-overlay` | `ink-900` @ 40% | Modal / drawer backdrop |
| `color-bg-input` | `sand-0` · `#FFFFFF` | Text input resting background |
| `color-bg-hover` | `clay-50` · `#F7EDE7` | Row hover, list-item hover |
| `color-bg-active-nav` | `clay-500` · `#B5734F` | Active sidebar nav item (filled pill) |
| `color-bg-chip` | `sage-50` · `#ECEFE8` | Status chips ("Sleep Health", "Optimal") |
| `color-bg-chip-alt` | `clay-50` · `#F7EDE7` | Secondary chips / filter tags |
| `color-bg-filter-bar` | `clay-500` · `#B5734F` | Master date-range filter bar (Trends page) |

---

## 2. Text

| Semantic token | Maps to | Use |
|----------------|---------|-----|
| `color-text-heading` | `ink-900` · `#241F1A` | Page titles, card headings (serif) |
| `color-text-primary` | `ink-800` · `#3D3730` | Body copy, labels, list items |
| `color-text-secondary` | `taupe-600` · `#6E6052` | Subtitles, supporting descriptions |
| `color-text-muted` | `taupe-400` · `#A89685` | Placeholders, timestamps, helper text |
| `color-text-on-accent` | `sand-0` · `#FFFFFF` | Text on filled buttons / accent backgrounds |
| `color-text-link` | `clay-500` · `#B5734F` | Inline links ("Login", "Register", "Forgot Password?") |
| `color-text-link-hover` | `clay-700` · `#8A4F32` | Link hover state |

---

## 3. Borders & dividers

| Semantic token | Maps to | Use |
|----------------|---------|-----|
| `color-border-default` | `sand-200` · `#E6DCD0` | Card borders, input borders (resting) |
| `color-border-muted` | `sand-300` · `#D2C4B4` | Dividers, table separators |
| `color-border-input-focus` | `clay-500` · `#B5734F` | Input border on focus |
| `color-border-card-left` | `clay-300` · `#D9A88E` | Left-accent border on meal cards, journal entries |

---

## 4. Interactive — Buttons

### Primary button (terracotta)

| State | Background | Text | Border |
|-------|-----------|------|--------|
| Default | `clay-500` · `#B5734F` | `sand-0` · `#FFFFFF` | none |
| Hover | `clay-600` · `#A4623F` | `sand-0` | none |
| Active / Pressed | `clay-700` · `#8A4F32` | `sand-0` | none |
| Disabled | `clay-300` · `#D9A88E` | `sand-0` @ 60% | none |

> **Observed in mockups:** "Begin Journey", "Register", "Sign In", "Save Entry", "+ Add Entry", "+ Add Item", "Log Wellness", "Log New Expense", "Create New Entry".

### Secondary / outline button

| State | Background | Text | Border |
|-------|-----------|------|--------|
| Default | transparent | `clay-500` | 1px `clay-500` |
| Hover | `clay-50` | `clay-600` | 1px `clay-600` |
| Active | `clay-100` | `clay-700` | 1px `clay-700` |

> **Observed in mockups:** "New Goal", "Log Wellness" (outline variant in Quick Actions).

### Destructive button

| State | Background | Text |
|-------|-----------|------|
| Default | `danger-500` · `#B5503F` | `sand-0` |
| Hover | Darken 8% | `sand-0` |

> **Observed:** "Delete" action buttons in transaction / journal rows.

---

## 5. Interactive — Form controls

| Element | Resting | Focus | Error |
|---------|---------|-------|-------|
| **Input bg** | `sand-0` | `sand-0` | `sand-0` |
| **Input border** | `sand-200` | `clay-500` (2px) | `danger-500` (2px) |
| **Input text** | `ink-800` | `ink-800` | `ink-800` |
| **Placeholder** | `taupe-400` | — | — |
| **Select / dropdown bg** | `sand-0` | `sand-0` | — |
| **Select arrow** | `taupe-400` | `clay-500` | — |
| **Checkbox ring** | `sand-200` | `clay-500` | — |
| **Checkbox checked fill** | `clay-500` | — | — |

> **Note:** Inputs in the mockups use a bottom-border-only style on auth pages (Login / Register) and a full-border rounded style on inner pages (Daily Log, Expenses).

---

## 6. Status & feedback

| Semantic token | Maps to | Use |
|----------------|---------|-----|
| `color-success` | `sage-500` · `#7E9469` | Positive metrics, "Optimal" chip, completed habits |
| `color-success-bg` | `sage-50` · `#ECEFE8` | Success toast / banner background |
| `color-warning` | `warning-500` · `#C9A227` | Caution states, approaching limits |
| `color-warning-bg` | `#FDF6E3` | Warning toast background |
| `color-danger` | `danger-500` · `#B5503F` | Errors, delete actions, over-budget |
| `color-danger-bg` | `#FBF0EE` | Error toast background |
| `color-info` | `info-500` · `#6E8CA0` | Informational callouts |
| `color-info-bg` | `#EDF3F6` | Info toast background |

---

## 7. Chart & data-visualization palette

Charts in the mockups use the brand palette rather than arbitrary rainbow colors. This keeps the data feel "on brand."

### Bar charts (Sleep Duration, Step Frequency, Expenses)

| Series | Color | Token |
|--------|-------|-------|
| Primary bars | `sage-500` · `#7E9469` | Health / positive data |
| Secondary bars | `sage-300` · `#A9B894` | Comparison / lighter series |
| Tertiary bars | `sand-300` · `#D2C4B4` | Muted / background series |
| Accent bars | `clay-500` · `#B5734F` | Financial / Travel data |

### Donut / pie charts (Financial Wellness, Habit Completion, Expenditure)

| Segment | Color | Use |
|---------|-------|-----|
| Groceries / Food | `sage-500` · `#7E9469` | — |
| Utilities / Housing | `sage-100` · `#D6DECB` | — |
| Wellness App | `sage-300` · `#A9B894` | — |
| Savings / Travel | `clay-500` · `#B5734F` | — |
| Banking | `sand-300` · `#D2C4B4` | — |
| Misc | `taupe-400` · `#A89685` | — |

### Line charts (Sleep Duration trend)

| Element | Color |
|---------|-------|
| Line stroke | `sage-500` · `#7E9469` |
| Data points | `clay-500` · `#B5734F` |
| Dashed grid / threshold | `sand-200` · `#E6DCD0` |
| Fill area (optional) | `sage-50` @ 40% |

---

## 8. Sidebar navigation

| State | Background | Text / icon | Left accent |
|-------|-----------|-------------|-------------|
| Default | transparent | `ink-800` | none |
| Hover | `sand-100` | `ink-800` | none |
| Active | `clay-500` (pill fill) | `sand-0` | none |

---

## 9. Dark mode considerations

> The current mockups show a **light-only** theme. If dark mode is needed later, swap the surface and text primitives while keeping the brand accents (clay, sage) largely the same. Define a parallel set of semantic tokens prefixed `dark-` or use CSS custom properties with a `[data-theme="dark"]` selector.
