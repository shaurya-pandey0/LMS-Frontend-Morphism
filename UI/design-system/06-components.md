# 06 · Components

Modular, reusable component standards for LifeTrack. Each component references tokens from [`01-design-tokens.md`](./01-design-tokens.md) and semantic colors from [`02-color-system.md`](./02-color-system.md).

> **DRY principle:** Every repeating UI pattern should be implemented once as a component. If you're copy-pasting styles, extract a component instead.

---

## 1. Buttons

### 1a. Primary Button

The main call-to-action. Terracotta fill, white text.

```
┌──────────────────────────┐
│     Button Label         │  ← centered text
└──────────────────────────┘
   bg: clay-500             text: sand-0
   h: 48px                  px: space-6 (24px)
   radius: radius-md (10px)
   font: font-body, text-base, weight-medium
```

| State | Background | Text | Shadow | Transform |
|-------|-----------|------|--------|-----------|
| Default | `clay-500` | `sand-0` | `shadow-xs` | — |
| Hover | `clay-600` | `sand-0` | `shadow-sm` | `translateY(-1px)` |
| Active | `clay-700` | `sand-0` | `shadow-none` | `translateY(0)` |
| Disabled | `clay-300` | `sand-0` @ 60% | `shadow-none` | — |
| Focus | `clay-500` | `sand-0` | Ring: 2px `clay-300` offset 2px | — |

**Instances:** "Begin Journey", "Register", "Sign In", "Save Entry", "+ Add Entry", "+ Add Item", "Log Wellness", "Log New Expense", "Create New Entry".

### 1b. Secondary / Outline Button

For secondary actions alongside a primary button.

| State | Background | Text | Border |
|-------|-----------|------|--------|
| Default | transparent | `clay-500` | 1px solid `clay-500` |
| Hover | `clay-50` | `clay-600` | 1px solid `clay-600` |
| Active | `clay-100` | `clay-700` | 1px solid `clay-700` |

**Sizing:** Same as primary (h: 48px, px: space-6, radius-md).

**Instances:** "New Goal", "Log Wellness" (outline variant).

### 1c. Ghost / Text Button

Minimal, link-like. No background or border.

| State | Text | Underline |
|-------|------|-----------|
| Default | `clay-500` | none |
| Hover | `clay-700` | underline |

**Instances:** "Forgot Password?", "Login", "Register" (footer links on auth pages).

### 1d. Destructive Button

For delete and irreversible actions.

| State | Background | Text |
|-------|-----------|------|
| Default | `danger-500` | `sand-0` |
| Hover | Darken 8% | `sand-0` |

**Sizing:** Compact (h: 36px, px: space-4, text-sm). Always paired with an edit button.

**Instances:** "Delete" in transaction rows, journal entry rows.

### 1e. Icon Button

Square, icon-only. For toolbars, row actions.

| Property | Value |
|----------|-------|
| Size | 36×36px (small) or 44×44px (standard) |
| Radius | `radius-sm` (6px) |
| Background | transparent (resting), `sand-100` (hover) |
| Icon color | `taupe-600` (resting), `ink-800` (hover) |

---

## 2. Cards

### 2a. Standard Card

The primary content container used across all pages.

```
┌──────────────────────────────────────┐
│  ┌ Heading ─────────────────── Tag ┐ │
│  │                                  │ │
│  │  Content area                    │ │
│  │                                  │ │
│  │  [Optional action row]           │ │
│  └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Background | `sand-0` (`#FFFFFF`) |
| Border | 1px solid `sand-200` |
| Radius | `radius-md` (10px) |
| Shadow | `shadow-xs` (resting) → `shadow-sm` (hover) |
| Padding | `space-5` (20px) |
| Heading | `text-xl`, `weight-semibold`, `font-body` |
| Internal gap | `space-4` (16px) |

### 2b. Stat Card

For key metric display (Admin page).

```
┌────────────────────────┐
│   🔥 icon    Label     │
│              12,450    │  ← text-3xl, weight-bold
└────────────────────────┘
```

| Property | Value |
|----------|-------|
| Layout | Icon left, text right (or icon top, text bottom) |
| Number size | `text-3xl` (36px), `weight-bold` |
| Label size | `text-sm`, `taupe-600` |
| Background | `sand-0` |
| Same card styling as Standard Card |

### 2c. Auth Card

Centered form card on Login / Register pages.

| Property | Value |
|----------|-------|
| Max-width | 520px |
| Padding | `space-10` (40px) top/bottom, `space-8` (32px) horizontal |
| Radius | `radius-lg` (16px) |
| Shadow | `shadow-sm` |
| Background | `sand-0` with subtle noise texture |
| Title | `font-display`, `text-display` or `text-3xl`, italic |

### 2d. Meal Card (Daily Log)

Left-accent bordered card for each meal category.

```
┌─┬────────────────────────────┐
│ │  Breakfast                 │
│ │  Oatmeal                   │
│ │  Add meal Item             │
└─┴────────────────────────────┘
 ↑ left border: 3px clay-300
```

| Property | Value |
|----------|-------|
| Left border | 3px solid `clay-300` |
| Padding | `space-3` (12px) |
| Heading | `text-base`, `weight-bold` |
| Radius | `radius-sm` (6px) |

---

## 3. Form Controls

### 3a. Text Input

**Inner pages variant** (Daily Log, Expenses):

| Property | Value |
|----------|-------|
| Height | 44px |
| Border | 1px solid `sand-200` |
| Radius | `radius-sm` (6px) |
| Padding | 0 `space-3` (12px) |
| Font | `font-body`, `text-base` |
| Placeholder color | `taupe-400` |
| Focus border | 2px solid `clay-500` |
| Focus shadow | `0 0 0 3px rgba(181,115,79, 0.12)` |

**Auth pages variant** (Login, Register):

| Property | Value |
|----------|-------|
| Height | 44px |
| Border | bottom only, 1px solid `sand-200` |
| Radius | 0 |
| Background | transparent |
| Focus border-bottom | 2px solid `clay-500` |

### 3b. Select / Dropdown

| Property | Value |
|----------|-------|
| Same sizing as Text Input | h: 44px, padding: space-3 |
| Arrow icon | Chevron-down, `taupe-400` |
| Dropdown panel bg | `sand-0` |
| Dropdown panel shadow | `shadow-md` |
| Dropdown panel radius | `radius-md` |
| Option hover bg | `clay-50` |
| Option padding | `space-3` vertical, `space-4` horizontal |

**Instances:** Category Filter (Expenses), Mood selector (Daily Log, Journal).

### 3c. Checkbox

| Property | Value |
|----------|-------|
| Size | 20×20px |
| Border | 1.5px solid `sand-200` |
| Radius | `radius-sm` (6px) — rounded square |
| Checked fill | `clay-500` |
| Checkmark | `sand-0` (white), 2px stroke |
| Label gap | `space-2` (8px) |

**Instances:** Transactional habits (Daily Log), Embedded Habits (Daily Log).

### 3d. Textarea

| Property | Value |
|----------|-------|
| Min-height | 160px |
| Padding | `space-3` (12px) |
| Border | 1px solid `sand-200` |
| Radius | `radius-sm` (6px) |
| Resize | vertical only |

**Instances:** Journal entry textarea ("My Thoughts Today...").

---

## 4. Navigation

### 4a. Top Navigation Bar

```
┌────────────────────────────────────────────────────────────┐
│  [Logo]     Overview  History  Profile  Insights    [👤▾]  │
└────────────────────────────────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Height | 64px |
| Background | transparent / `sand-0` |
| Border-bottom | 1px solid `sand-200` |
| Logo | `font-display`, `text-xl`, `weight-bold` + feather icon |
| Nav links | `font-body`, `text-base`, `weight-medium` |
| Active indicator | 3px bottom border, `clay-500` |
| Gap between links | `space-8` (32px) |
| Avatar | 36px circle, right-aligned |

### 4b. Sidebar Navigation

| Property | Value |
|----------|-------|
| Width | 220px (full) / 56px (collapsed) |
| Background | `sand-0` |
| Border-right | 1px solid `sand-200` |
| Item height | 44px |
| Item padding | `space-3` left, `space-4` right |
| Item gap | `space-1` (4px) |
| Icon size | 20px |
| Icon-to-label gap | `space-2` (8px) |
| Active item | bg: `clay-500`, text: `sand-0`, radius: `radius-md` |
| Hover item | bg: `sand-100` |
| User block | Bottom-pinned, avatar (40px circle) + name |

### Sidebar icons observed

| Item | Icon description |
|------|-----------------|
| Dashboard | Grid / 4-square icon |
| Daily Log | Calendar/clipboard icon |
| Analytics | Bar chart icon |
| Expenses | Dollar/coin icon |
| Journal | Document/notepad icon |

---

## 5. Chips & Badges

### 5a. Status Chip

Small, rounded label for categorization.

| Property | Value |
|----------|-------|
| Height | 28px |
| Padding | `space-1` (4px) vertical, `space-3` (12px) horizontal |
| Radius | `radius-pill` (999px) |
| Font | `text-sm`, `weight-medium` |

**Variants:**

| Variant | Background | Text |
|---------|-----------|------|
| Sage (positive) | `sage-50` | `sage-700` |
| Clay (neutral/category) | `clay-50` | `clay-600` |
| Info | `#EDF3F6` | `info-500` |
| Warning | `#FDF6E3` | `warning-500` |
| Danger | `#FBF0EE` | `danger-500` |

**Instances:** "Sleep Health", "Optimal", "4 Health", "Body Analytics", "Mind Analytics", "Finance Analytics".

### 5b. Category Badge (Expenses)

Used in the Category Filter dropdown as color-coded pills.

| Property | Value |
|----------|-------|
| Background | `clay-500` (when selected) / `sand-100` (default) |
| Text | `sand-0` (selected) / `ink-800` (default) |
| Radius | `radius-md` |

---

## 6. Tables

### Transaction History Table (Expenses page)

```
┌────────┬──────────┬────────┬───────────────┐
│  Date  │ Category │ Amount │ Actions       │
├────────┼──────────┼────────┼───────────────┤
│ Dec 27 │ Food     │ $50.00 │ [Edit][Delete]│
│ Dec 27 │ Housing  │ $3-20k │ [Edit][Delete]│
└────────┴──────────┴────────┴───────────────┘
```

| Property | Value |
|----------|-------|
| Header bg | `sand-100` |
| Header font | `text-sm`, `weight-semibold` |
| Row height | 48px |
| Row border-bottom | 1px solid `sand-200` |
| Row hover bg | `sand-50` |
| Row padding | `space-3` horizontal |
| Alternating row | Optional: `sand-50` even rows |
| Category icon | 24px circle, color-coded |
| Action buttons | Icon buttons (Edit, Delete), 36px |

---

## 7. Charts

### 7a. Bar Chart

| Property | Value |
|----------|-------|
| Bar radius | top corners `radius-sm` (6px) |
| Bar colors | See [`02-color-system.md`](./02-color-system.md) § 7 |
| Axis labels | `text-xs`, `taupe-600` |
| Grid lines | 1px dashed `sand-200` |
| Axis lines | 1px solid `sand-300` |
| Bar gap | 4px between grouped bars |
| Category gap | 12px between groups |

### 7b. Donut / Pie Chart

| Property | Value |
|----------|-------|
| Stroke width | ~35% of radius |
| Center hole | ~50% of radius |
| Segment gap | 2px |
| Legend | Right or below, `text-sm`, color dot (10px circle) + label |
| Percentage labels | `text-sm`, `weight-semibold` |

### 7c. Line Chart

| Property | Value |
|----------|-------|
| Stroke width | 2px |
| Stroke color | `sage-500` |
| Data points | 6px circles, `clay-500` fill, 2px `sand-0` stroke |
| Fill area | `sage-50` @ 40% opacity |
| Grid | Horizontal dashed lines, `sand-200` |
| Smooth | `stroke-linejoin: round` / bezier interpolation |

### 7d. Gauge / Speedometer (Daily Log)

The semi-circular gauge icon used for Sleep Hours, Step Target.

| Property | Value |
|----------|-------|
| Track color | `sand-200` |
| Fill color | Gradient `clay-300` → `clay-600` |
| Needle | `ink-800`, 2px |
| Size | 48×32px (compact inline) |

---

## 8. Modal Dialog

```
┌──────────────────────────────────┐
│  ✕                               │  ← close button top-right
│                                  │
│  Modal Heading                   │
│  ────────────────────            │
│  Content                         │
│                                  │
│         [Cancel] [Confirm]       │  ← action row
└──────────────────────────────────┘
   Overlay: ink-900 @ 40%
```

| Property | Value |
|----------|-------|
| Background | `sand-0` |
| Radius | `radius-lg` (16px) |
| Shadow | `shadow-lg` |
| Padding | `space-6` (24px) |
| Max-width | 480px |
| Backdrop | `ink-900` @ 40% opacity |
| Close button | Icon button, top-right, `taupe-400` |
| Action row | Right-aligned, `space-3` (12px) gap between buttons |

---

## 9. Toast / Notification

```
┌──────────────────────────────────┐
│  ●  Message text          ✕     │
└──────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Position | Top-right, `space-6` from edges |
| Min-width | 320px |
| Padding | `space-3` vertical, `space-4` horizontal |
| Radius | `radius-md` (10px) |
| Shadow | `shadow-md` |
| Auto-dismiss | 5 seconds |
| Animation | Slide in from right, fade out |

| Variant | Left accent | Background | Icon color |
|---------|------------|------------|------------|
| Success | `sage-500` (3px) | `sage-50` | `sage-500` |
| Warning | `warning-500` (3px) | `#FDF6E3` | `warning-500` |
| Error | `danger-500` (3px) | `#FBF0EE` | `danger-500` |
| Info | `info-500` (3px) | `#EDF3F6` | `info-500` |

---

## 10. Avatar

| Property | Value |
|----------|-------|
| Sizes | 32px (compact), 40px (standard), 48px (large) |
| Shape | Circle (`border-radius: 50%`) |
| Border | 2px solid `sand-200` |
| Fallback | Initials on `clay-100` bg, `clay-600` text |

**Instances:** Top nav user avatar, sidebar user block, Admin "Admin One".

---

## 11. AI Assistant Panel (Journal Page)

```
┌──────────────────────────────────┐
│  [Grok AI Assistant]  ← header   │
├──────────────────────────────────┤
│  Bot message (sand-0 bg)         │
│  User message (clay-50 bg)       │
│  Bot message                     │
│  User message                    │
├──────────────────────────────────┤
│  [Input field          ▶]       │
└──────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Width | ~300px (right sidebar) |
| Header | `clay-500` bg, `sand-0` text, `text-base`, `weight-semibold` |
| Bot bubble bg | `sand-0` |
| User bubble bg | `clay-50` |
| Bubble radius | `radius-md` (10px), square on sender-side corner |
| Bubble padding | `space-3` |
| Bubble font | `text-sm` |
| Input | Standard text input, send button (icon, `clay-500`) |
| Shadow | `shadow-md` (floating panel) |

---

## 12. Emoji / Mood Selector (Journal)

| Property | Value |
|----------|-------|
| Layout | Vertical list or horizontal row of emoji + label |
| Item height | 36px |
| Emoji size | 24px |
| Label | `text-sm`, `weight-medium` |
| Selected bg | `clay-50` |
| Selected border | 1px solid `clay-300` |
| Border radius | `radius-pill` (pill shape) |

**Moods observed:** 😊 Happy, 😌 Calm, 😢 Anxious, ❤️ Grateful, 😊 (variant).

---

## Component checklist

| Component | Status | Doc section |
|-----------|--------|-------------|
| Button (primary, secondary, ghost, destructive, icon) | ✅ | §1 |
| Card (standard, stat, auth, meal) | ✅ | §2 |
| Form controls (input, select, checkbox, textarea) | ✅ | §3 |
| Navigation (top bar, sidebar) | ✅ | §4 |
| Chips & badges | ✅ | §5 |
| Tables | ✅ | §6 |
| Charts (bar, donut, line, gauge) | ✅ | §7 |
| Modal dialog | ✅ | §8 |
| Toast / notification | ✅ | §9 |
| Avatar | ✅ | §10 |
| AI assistant panel | ✅ | §11 |
| Emoji / mood selector | ✅ | §12 |
