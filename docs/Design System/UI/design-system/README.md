# LifeTrack Design System

> A human-centric AI lifestyle intelligence platform.
> Aesthetic: warm, organic, calm "wellness spa" — terracotta + sage + warm neutrals, with elegant serif headings and clean sans-serif UI.

This documentation set addresses the five workstreams from our review:

| # | Workstream | Document |
|---|-----------|----------|
| 1 | Theme Documentation | This README + all docs below |
| 2 | Visual Hierarchy & Shadows | [`05-shadows-elevation.md`](./05-shadows-elevation.md) |
| 3 | Component-Based Architecture | [`06-components.md`](./06-components.md) |
| 4 | Color System Standardization | [`02-color-system.md`](./02-color-system.md) |
| 5 | Design Token Definition | [`01-design-tokens.md`](./01-design-tokens.md) + [`tokens.json`](./tokens.json) |

---

## File index

```
design-system/
├── README.md                  # Overview & how to use the system (this file)
├── 01-design-tokens.md        # Colors (hex/RGB), typography, spacing, radii, shadows
├── 02-color-system.md         # Semantic color-coding: buttons, headings, text, bg, status
├── 03-typography.md           # Font families, scales, weights, usage
├── 04-spacing-layout.md       # Spacing scale, grid, layering rules
├── 05-shadows-elevation.md    # Reduced/standardized shadow & elevation guidelines
├── 06-components.md           # Modular, reusable component standards (DRY)
├── 07-logo-guidelines.md      # Reserved logo area + styling rules
└── tokens.json                # Machine-readable tokens (dev handoff)
```

---

## Brand snapshot (observed from mockups)

- **Logo:** "LifeTrack" wordmark + feather/pen-nib mark, always top-left.
- **Primary accent:** Terracotta / clay (buttons, key actions).
- **Secondary accent:** Sage green (positive/health data).
- **Neutrals:** Cream, beige, taupe backgrounds and borders.
- **Headings:** Serif (display). **Body/UI:** Sans-serif.
- **Texture:** Subtle botanical (palm-leaf) shadow overlay on app backgrounds.
- **Geometric mesh:** Constellation-style node-and-line pattern on auth pages.

---

## How to use this design system

### For developers

1. **Start with tokens.** Load [`tokens.json`](./tokens.json) into your build pipeline (or copy the CSS custom properties below) so every color, spacing, and typography value is defined in one place.
2. **Use semantic names.** Never hard-code `#B5734F` — write `var(--color-button-primary-bg)` instead. This way a palette refresh only changes `tokens.json`.
3. **Build components from [`06-components.md`](./06-components.md).** Each component section lists exact sizes, states, colors, and spacing. Match these specs, don't freestyle.
4. **Follow the layout rules in [`04-spacing-layout.md`](./04-spacing-layout.md).** The grid, breakpoints, sidebar width, and card anatomy are all documented.

### For designers

1. **Reference the token tables** when creating new screens. All values in docs `01`–`05` are your palette.
2. **Follow component patterns** from [`06-components.md`](./06-components.md) to maintain consistency.
3. **Logo usage** is defined in [`07-logo-guidelines.md`](./07-logo-guidelines.md) — don't deviate from the lockup structure.

### Reading order

If you're new to the system, read in this order:

```
01-design-tokens.md   → Raw values (what colors/sizes exist)
02-color-system.md    → How those colors are used (semantic mapping)
03-typography.md      → Fonts, scales, heading hierarchy
04-spacing-layout.md  → Spacing, grids, page structure
05-shadows-elevation  → Shadow scale, elevation rules
06-components.md      → Reusable UI building blocks
07-logo-guidelines.md → Brand mark rules
```

---

## Quick-reference: CSS custom properties

Drop this into your root stylesheet to bootstrap the design system:

```css
:root {
  /* ── Colors: Primitives ── */
  --clay-50:   #F7EDE7;
  --clay-100:  #EBD3C6;
  --clay-300:  #D9A88E;
  --clay-500:  #B5734F;
  --clay-600:  #A4623F;
  --clay-700:  #8A4F32;

  --sage-50:   #ECEFE8;
  --sage-100:  #D6DECB;
  --sage-300:  #A9B894;
  --sage-500:  #7E9469;
  --sage-700:  #5E7050;

  --sand-0:    #FFFFFF;
  --sand-50:   #FAF6F1;
  --sand-100:  #F2EBE3;
  --sand-200:  #E6DCD0;
  --sand-300:  #D2C4B4;
  --taupe-400: #A89685;
  --taupe-600: #6E6052;
  --ink-800:   #3D3730;
  --ink-900:   #241F1A;

  /* ── Colors: Functional ── */
  --success-500: #7E9469;
  --warning-500: #C9A227;
  --danger-500:  #B5503F;
  --info-500:    #6E8CA0;

  /* ── Typography ── */
  --font-display: 'Playfair Display', Georgia, serif;
  --font-body:    'Inter', 'Helvetica Neue', Arial, sans-serif;

  --text-xs:      12px;
  --text-sm:      14px;
  --text-base:    16px;
  --text-lg:      18px;
  --text-xl:      22px;
  --text-2xl:     28px;
  --text-3xl:     36px;
  --text-display: 56px;

  /* ── Spacing (4px base) ── */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* ── Border Radius ── */
  --radius-sm:   6px;
  --radius-md:   10px;
  --radius-lg:   16px;
  --radius-xl:   24px;
  --radius-pill: 999px;

  /* ── Shadows ── */
  --shadow-none: none;
  --shadow-xs:   0 1px 2px rgba(61, 55, 48, 0.06);
  --shadow-sm:   0 2px 6px rgba(61, 55, 48, 0.08);
  --shadow-md:   0 6px 16px rgba(61, 55, 48, 0.10);
  --shadow-lg:   0 12px 28px rgba(61, 55, 48, 0.12);

  /* ── Z-Index ── */
  --z-base:     0;
  --z-dropdown: 1000;
  --z-sticky:   1100;
  --z-overlay:  1200;
  --z-modal:    1300;
  --z-toast:    1400;
}
```

---

## Page-to-mockup inventory

Each mockup screenshot and the components / patterns it demonstrates:

| # | Page | Mockup file | Key patterns |
|---|------|------------|--------------|
| 1 | Landing | `1. Landing page.jpg` | Hero layout (2-column), serif display heading, CTA button, dashboard preview cards, top nav |
| 2 | Registration | `2. Registration Page.png` | Auth card, bottom-border inputs, primary button (full-width), botanical + mesh bg, logo lockup |
| 3 | Login | `3. Login Page.jpg` | Auth card, bottom-border inputs, ghost link ("Forgot Password?"), layout mirrors registration |
| 4 | Dashboard | `4. Dahboard.png` | Top nav + sidebar, 3-column grid, stat card, bar chart, donut chart, journal card, chips, avatar |
| 5 | Daily Log | `5. Daily Log.png` | Sidebar active state, input fields, checkboxes, meal cards (left-accent), gauge icons, emoji/mood dropdowns |
| 6 | Expenses | `6. Expense Page.png` | Transaction form, select dropdown (open state), transaction table, destructive buttons, donut chart, category badges |
| 7 | Journal | `7. Journal And Self Reflection.png` | Textarea, emoji/mood selector, journal history list, AI assistant chat panel, action buttons |
| 8 | Trends | `8. Trends Page.png` | 2×2 chart grid, master filter bar (clay-500 bg), bar chart, line chart, donut chart, date range selector |
| 9 | Admin | `Admin page.png` | Admin sidebar variant, stat row (3-up), bar chart, line chart, donut chart, large stat numbers |

---

## Accessibility checklist

All implementations must meet **WCAG 2.1 AA** minimum:

| Requirement | Target | How to verify |
|-------------|--------|---------------|
| Color contrast (normal text) | ≥ 4.5:1 | `ink-800` on `sand-0` = ~11:1 ✅ |
| Color contrast (large text) | ≥ 3:1 | `ink-900` on `sand-50` = ~13:1 ✅ |
| Button contrast | ≥ 3:1 (non-text) | `clay-500` on `sand-0` ≈ 4.2:1 ✅ |
| Focus indicators | Visible ring | 2px offset ring in `clay-300` on all interactive elements |
| Keyboard navigation | Full tab order | All buttons, inputs, links, nav items reachable via Tab |
| Screen reader labels | `aria-label` / `alt` | Logo, icon buttons, charts need descriptive labels |
| Motion sensitivity | `prefers-reduced-motion` | Disable hover lifts, shadow transitions, slide-in toasts |
| Touch targets | ≥ 44×44px | All buttons and interactive elements meet minimum size |

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Updating the design system

When the design evolves:

1. **Update `tokens.json` first.** All raw values live here.
2. **Update the relevant doc** (`01`–`07`) to reflect the change.
3. **Update this README** if the change affects the file index, brand snapshot, or CSS properties block.
4. **Grep for old values** in the codebase and replace with the updated token names.
5. **Test contrast ratios** for any color change using a WCAG checker.

---

## ⚠️ Note on color accuracy

The hex values in this system were **sampled visually from the mockup screenshots** and rounded to a clean, consistent palette. Before final sign-off, verify against the source design files (Figma) or with a precise color picker and update [`tokens.json`](./tokens.json) — everything else references those tokens.