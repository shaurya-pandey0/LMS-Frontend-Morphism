# 05 · Shadows & Elevation

Guidelines for shadow usage and visual elevation in LifeTrack. The raw shadow tokens live in [`01-design-tokens.md`](./01-design-tokens.md) § 5.

---

## 1. Design philosophy

LifeTrack's aesthetic is **warm, soft, and organic**. Shadows should feel like natural, diffused light — never harsh, never high-contrast. The shadow color is derived from `ink-800` (`#3D3730`) with low opacity, keeping everything in the warm neutral family.

**Principles:**
1. **Fewer is better.** Most surfaces need zero or minimal shadow. Elevation comes from background color contrast, not shadow stacking.
2. **Warm tones.** All shadows use `rgba(61, 55, 48, α)` — never pure black.
3. **Gentle blur.** Prefer wide, soft spreads over tight, dark ones.
4. **Max two levels** visible at any time to avoid visual noise.

---

## 2. Shadow scale

| Token | CSS value | Elevation level |
|-------|----------|-----------------|
| `shadow-none` | `none` | Flat (flush with surface) |
| `shadow-xs` | `0 1px 2px rgba(61,55,48, 0.06)` | Resting card, default state |
| `shadow-sm` | `0 2px 6px rgba(61,55,48, 0.08)` | Hovered card, focused input |
| `shadow-md` | `0 6px 16px rgba(61,55,48, 0.10)` | Dropdown menu, popover |
| `shadow-lg` | `0 12px 28px rgba(61,55,48, 0.12)` | Modal dialog, overlay panel |

---

## 3. Elevation map (what uses what)

### Level 0 — Flush (`shadow-none`)

| Element | Notes |
|---------|-------|
| App background | `sand-50` — no shadow needed |
| Sidebar rail | Separated by border, not shadow |
| Dividers / separators | 1px border, no shadow |
| Input fields (resting) | Bordered, not elevated |
| Inline chips / badges | Flat on card surface |

### Level 1 — Resting (`shadow-xs`)

| Element | Notes |
|---------|-------|
| Content cards | Dashboard cards, metric panels, journal cards |
| Stat cards (Admin) | Total Users, Active Users, Weekly Sign-ups |
| Chart containers | Bar chart, donut, line chart wrappers |
| Auth card (Login/Register) | Center-mounted form card |
| Table rows | Subtle lift on the row container |

### Level 2 — Interactive (`shadow-sm`)

| Element | Notes |
|---------|-------|
| Card on hover | Transition from `shadow-xs` → `shadow-sm` |
| Focused input | Replaces border glow with subtle lift |
| Selected sidebar item | Subtle lift + `clay-500` bg fill |
| Active filter chip | Slight lift when toggled on |

### Level 3 — Floating (`shadow-md`)

| Element | Notes |
|---------|-------|
| Dropdown menus | Category filter dropdown (Expenses page) |
| Select option list | Mood selector dropdown |
| Tooltip / popover | If hover-info patterns are used |
| Date picker panel | Calendar overlay |
| Notification dropdown | User menu / alert dropdown |

### Level 4 — Overlay (`shadow-lg`)

| Element | Notes |
|---------|-------|
| Modal dialogs | Confirmation dialogs, detail views |
| Full-screen overlays | Mobile menu, image viewer |
| AI assistant panel | Grok AI floating chat panel (Journal page) |
| Toast notifications | Floating at top-right |

---

## 4. Transition rules

All shadow transitions should be smooth and gentle:

```css
.card {
  box-shadow: var(--shadow-xs);
  transition: box-shadow 200ms ease-out;
}

.card:hover {
  box-shadow: var(--shadow-sm);
}
```

| Property | Value |
|----------|-------|
| Duration | 200ms |
| Easing | `ease-out` |
| Properties to transition | `box-shadow`, `transform` (if lifting) |

> **Optional lift effect:** Pair `shadow-sm` with `transform: translateY(-2px)` on hover for a subtle "pick up" feel. Use sparingly — only on interactive cards that navigate somewhere on click.

---

## 5. Botanical shadow overlay

The mockups show a **palm-leaf / botanical shadow** cast across the app background. This is purely decorative and is implemented as a CSS background overlay.

```css
.app-bg {
  background-color: var(--sand-50);
  background-image: url('/assets/botanical-shadow.png');
  background-repeat: no-repeat;
  background-position: top right;
  background-size: 60% auto;
  opacity: 0.15;              /* Very subtle */
  pointer-events: none;       /* Non-interactive */
  position: fixed;
  inset: 0;
  z-index: -1;
}
```

| Property | Value | Notes |
|----------|-------|-------|
| Opacity | 0.10–0.20 | Subtle, should not compete with content |
| Position | Top-right | As shown in mockups |
| Size | ~60% viewport width | Scale proportionally |
| Layer | Behind all content (`z-index: -1`) | Decorative only |

> The botanical shadow asset should be a **high-contrast silhouette** (dark on transparent) so it works at low opacity against the warm beige background.

---

## 6. Geometric mesh overlay

A subtle **geometric mesh / node-and-line pattern** appears in the background of auth pages and the landing page (visible in the top-right and bottom-right of the Registration and Login mockups).

```css
.auth-bg-mesh {
  background-image: url('/assets/geometric-mesh.svg');
  background-repeat: no-repeat;
  background-position: top right;
  opacity: 0.08;
  mix-blend-mode: multiply;
}
```

| Property | Value |
|----------|-------|
| Pattern | Node-and-line / constellation style |
| Color | `clay-300` or `taupe-400` (monochrome) |
| Opacity | 0.06–0.10 |
| Position | Top-right corner, extending ~40% of viewport |

---

## 7. Anti-patterns (what NOT to do)

| ❌ Don't | ✅ Do instead |
|----------|--------------|
| Use black shadows (`rgba(0,0,0,…)`) | Use warm shadows (`rgba(61,55,48,…)`) |
| Stack multiple shadows on one element | Use a single shadow from the scale |
| Apply `shadow-lg` to inline elements | Reserve for modals and overlays only |
| Use `shadow-md` on cards at rest | Cards rest at `shadow-xs` |
| Add shadows to flat UI (chips, badges, nav) | Keep flat elements flush with their surface |
| Use drop shadows on text | Reserve text emphasis for weight/color changes |
| Animate shadow on scroll | Only animate on hover/focus/active state changes |

---

## 8. CSS custom properties (implementation)

```css
:root {
  --shadow-none: none;
  --shadow-xs:   0 1px 2px rgba(61, 55, 48, 0.06);
  --shadow-sm:   0 2px 6px rgba(61, 55, 48, 0.08);
  --shadow-md:   0 6px 16px rgba(61, 55, 48, 0.10);
  --shadow-lg:   0 12px 28px rgba(61, 55, 48, 0.12);
}
```
