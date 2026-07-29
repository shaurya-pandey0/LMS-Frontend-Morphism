# 07 · Logo Guidelines

Rules for displaying the LifeTrack brand mark and wordmark. Consistent logo usage reinforces brand recognition across all surfaces.

---

## 1. Logo elements

The LifeTrack logo consists of two parts used together:

| Element | Description |
|---------|-------------|
| **Mark** | A feather / pen-nib icon — represents journaling, reflection, and lightness |
| **Wordmark** | "LifeTrack" set in `font-display` (Playfair Display), italic, `weight-bold` |

These are always used **together** as a lockup. The mark sits to the left of the wordmark with `space-2` (8px) gap.

---

## 2. Logo lockup

```
   ✒ LifeTrack
   ↑     ↑
  mark  wordmark (Playfair Display, italic, bold)
```

### Sizing

| Context | Mark size | Wordmark size | Total lockup height |
|---------|----------|---------------|---------------------|
| Top navigation | 24px | `text-xl` (22px) | 28px |
| Sidebar header | 28px | `text-2xl` (28px) | 32px |
| Auth card | 28px | `text-2xl` (28px) | 32px |
| Landing page header | 28px | `text-2xl` (28px) | 32px |
| Favicon | 16×16px (mark only) | — | 16px |

---

## 3. Placement rules

### 3a. Top navigation bar

```
┌────────────────────────────────────────────────────────┐
│  ✒ LifeTrack      Overview  History  Profile  ...      │
│  ↑                                                     │
│  Left-aligned, vertically centered                     │
│  padding-left: space-5 (20px)                          │
└────────────────────────────────────────────────────────┘
```

### 3b. Sidebar

```
┌────────────────┐
│  ✒ LifeTrack   │  ← Top of sidebar, same height as nav bar (64px)
│                │     Centered vertically within the 64px block
├────────────────┤     padding-left: space-5
│  Nav items...  │
```

### 3c. Auth pages (Login / Register)

```
┌─────────────────────────────────────┐
│  ✒ LifeTrack                        │  ← Top-left corner of auth card
│                                     │     padding: space-5 from card edges
│        Begin Your Journey           │
│        ...                          │
└─────────────────────────────────────┘
```

### 3d. Landing page

```
┌──────────────────────────────────────────────┐
│  SaaS Landing          ✒ LifeTrack           │  ← Right-aligned in nav area
│  ...                                         │
```

> On the landing page mockup, the logo appears **right-aligned** in the header. On inner pages, it's **left-aligned**. Be consistent within each context.

---

## 4. Color usage

| Context | Mark color | Wordmark color |
|---------|-----------|----------------|
| On light background (`sand-0`, `sand-50`) | `ink-900` | `ink-900` |
| On dark background (if dark mode is added) | `sand-0` | `sand-0` |
| On `clay-500` accent background | `sand-0` | `sand-0` |

> The logo is always monochrome — it does **not** use the terracotta or sage brand colors.

---

## 5. Clear space

Maintain a minimum clear space around the logo lockup equal to the height of the mark icon. No other UI element (text, borders, icons) should encroach on this space.

```
          ┌─────────┐
     ↕ h  │         │
  ┌──────────────────────┐
  │  ←h→ ✒ LifeTrack ←h→│
  └──────────────────────┘
     ↕ h  │         │
          └─────────┘

  h = mark icon height (24–28px depending on context)
```

---

## 6. Don'ts

| ❌ Don't | Why |
|----------|-----|
| Stretch or distort the logo | Maintain original proportions |
| Rotate the logo | Always horizontal |
| Apply drop shadows to the logo | Keep it flat and clean |
| Change the typeface of the wordmark | Always Playfair Display italic |
| Use the wordmark without the mark | They are a paired lockup |
| Place on busy/patterned backgrounds without sufficient contrast | Ensure legibility |
| Scale below 16px mark height | Becomes unreadable |
| Add color to the mark (terracotta, sage, etc.) | Logo is always monochrome |
| Place on colored surfaces without testing contrast | Ensure WCAG AA minimum (4.5:1) |

---

## 7. Favicon & app icon

| Asset | Spec |
|-------|------|
| Favicon (`.ico`) | 16×16, 32×32 — mark only, `ink-900` on transparent |
| Apple Touch Icon | 180×180 — mark centered on `sand-50` square background |
| Android icon | 192×192, 512×512 — mark on `sand-50`, rounded per Material spec |
| Open Graph image | 1200×630 — full lockup centered on `sand-50` with generous padding |

---

## 8. Logo in code

```html
<!-- Inline SVG recommended for crisp rendering and color control -->
<a href="/" class="logo-lockup" aria-label="LifeTrack home">
  <svg class="logo-mark" width="24" height="24" aria-hidden="true">
    <!-- feather/pen-nib SVG path -->
  </svg>
  <span class="logo-wordmark">LifeTrack</span>
</a>
```

```css
.logo-lockup {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);          /* 8px */
  text-decoration: none;
  color: var(--ink-900);
}

.logo-wordmark {
  font-family: var(--font-display);
  font-size: var(--text-xl);    /* 22px */
  font-weight: 700;
  font-style: italic;
  line-height: 1;
}
```
