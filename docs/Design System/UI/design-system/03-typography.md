# 03 · Typography

Typographic rules derived from the LifeTrack mockups. References token values defined in [`01-design-tokens.md`](./01-design-tokens.md).

---

## 1. Font families

| Role | Family stack | Token | Observed in |
|------|-------------|-------|-------------|
| **Display / Headings** | "Playfair Display", Georgia, serif | `font-display` | Page titles, hero text, section headings |
| **Body / UI** | "Inter", "Helvetica Neue", Arial, sans-serif | `font-body` | Labels, body copy, buttons, navigation |

### Loading fonts

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
```

> **Why two families?** The serif display typeface gives LifeTrack its "wellness spa" personality, while the clean sans-serif keeps UI elements scannable and functional. This contrast is a core part of the brand identity.

---

## 2. Type scale

All sizes use a **Major Third (1.25×)** ratio base, normalized to the 4px grid.

| Token | Size (px) | Line height (px) | Line height (ratio) | Primary use |
|-------|-----------|-------------------|---------------------|-------------|
| `text-xs` | 12 | 16 | 1.333 | Captions, badges, fine print |
| `text-sm` | 14 | 20 | 1.429 | Helper text, table cells, secondary labels |
| `text-base` | 16 | 24 | 1.500 | Body copy, form labels, nav items |
| `text-lg` | 18 | 28 | 1.556 | Card sub-headings, emphasized body |
| `text-xl` | 22 | 30 | 1.364 | Section headings ("Quick Actions", "Health At A Glance") |
| `text-2xl` | 28 | 36 | 1.286 | Page sub-titles ("Weekly Sleep Duration") |
| `text-3xl` | 36 | 44 | 1.222 | Page titles ("Expenses Page", "Daily Log Page") |
| `text-display` | 56 | 64 | 1.143 | Hero text ("Bring Balance to Your Balance") |

---

## 3. Font weights

| Token | Weight | Use |
|-------|--------|-----|
| `weight-regular` | 400 | Body copy, form placeholders, descriptions |
| `weight-medium` | 500 | Nav items, button labels, form labels |
| `weight-semibold` | 600 | Card headings (sans-serif), chip text, table headers |
| `weight-bold` | 700 | Page titles (serif), hero text, stat numbers ("12,450") |

---

## 4. Heading hierarchy (observed from mockups)

| Level | Font | Size token | Weight | Color token | Example |
|-------|------|-----------|--------|-------------|---------|
| **Hero** | `font-display` | `text-display` | 700 | `ink-900` | "Bring Balance to Your Balance" |
| **Page title** | `font-display` | `text-3xl` | 700 | `ink-900` | "Daily Log Page: Commit to Balance" |
| **Section heading** | `font-display` | `text-2xl` | 700 | `ink-900` | "Weekly Sleep Duration", "Financial Wellness" |
| **Card heading** | `font-body` | `text-xl` | 600 | `ink-800` | "Quick Actions", "Today's Activity Metrics" |
| **Sub-heading** | `font-body` | `text-lg` | 600 | `ink-800` | "Sleep Hours (Last Night)", "Breakfast" |
| **Label** | `font-body` | `text-base` | 500 | `ink-800` | Form labels, nav items |
| **Caption** | `font-body` | `text-sm` | 400 | `taupe-600` | Helper text, timestamps |

---

## 5. Paragraph & body text

| Property | Value |
|----------|-------|
| Font | `font-body` (Inter) |
| Size | `text-base` (16px) |
| Weight | `weight-regular` (400) |
| Line height | 24px (1.5) |
| Color | `ink-800` · `#3D3730` |
| Max width (reading) | 65ch (~600px) |
| Paragraph spacing | `space-4` (16px) |

---

## 6. Italic & emphasis

- **Italic serif** is used sparingly for the hero page subtitle text: *"Create your account to start achieving balance"*, *"Sign in to continue your journey toward balance"*.
- **Bold sans-serif** for emphasis within body copy and stat values (e.g., "12,450", "8,720").
- **Avoid underline** for emphasis — reserve it strictly for links.

---

## 7. Button typography

| Variant | Font | Size | Weight | Letter spacing | Text transform |
|---------|------|------|--------|----------------|----------------|
| Primary (large) | `font-body` | `text-base` (16px) | `weight-medium` (500) | 0.02em | None |
| Secondary (outline) | `font-body` | `text-sm` (14px) | `weight-medium` (500) | 0.01em | None |
| Small / chip | `font-body` | `text-sm` (14px) | `weight-medium` (500) | 0 | None |

---

## 8. Navigation typography

| Element | Font | Size | Weight | Color |
|---------|------|------|--------|-------|
| Top nav items | `font-body` | `text-base` | `weight-medium` | `ink-800` |
| Top nav active | `font-body` | `text-base` | `weight-semibold` | `ink-900` + underline accent (`clay-500`) |
| Sidebar items | `font-body` | `text-base` | `weight-medium` | `ink-800` |
| Sidebar active | `font-body` | `text-base` | `weight-semibold` | `sand-0` on `clay-500` bg |

---

## 9. Data & numbers

| Element | Font | Size | Weight | Tabular? |
|---------|------|------|--------|----------|
| Stat hero number | `font-body` | `text-3xl` | `weight-bold` | Yes |
| Chart axis labels | `font-body` | `text-xs` | `weight-regular` | Yes |
| Table data | `font-body` | `text-sm` | `weight-regular` | Yes (mono amounts) |
| Percentage badges | `font-body` | `text-sm` | `weight-semibold` | — |

> Use `font-variant-numeric: tabular-nums` for any column of numbers (prices, stats, dates) so digits align vertically.

---

## 10. Responsive adjustments

| Breakpoint | Hero | Page title | Section | Body |
|------------|------|-----------|---------|------|
| ≥ 1280px (desktop) | 56px | 36px | 28px | 16px |
| 768–1279px (tablet) | 44px | 30px | 24px | 16px |
| < 768px (mobile) | 36px | 26px | 22px | 15px |

Scale down headings proportionally. Body stays at 15–16px for readability on all screen sizes.
