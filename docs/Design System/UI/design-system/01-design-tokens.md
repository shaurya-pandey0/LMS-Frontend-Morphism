# 01 · Design Tokens

The single source of truth for all raw values. Every other document and all code should reference these token names, never raw hex values. Machine-readable version: [`tokens.json`](./tokens.json).

> Hex values are sampled from the LifeTrack mockups and normalized into a consistent ramp. Fine-tune against source files before final sign-off.

---

## 1. Color primitives (raw palette)

### Brand — Terracotta / Clay (primary)
| Token | Hex | RGB | Sampled use |
|-------|-----|-----|-------------|
| `clay-50`  | `#F7EDE7` | 247,237,231 | Tint backgrounds |
| `clay-100` | `#EBD3C6` | 235,211,198 | Hover tints, chips |
| `clay-300` | `#D9A88E` | 217,168,142 | Disabled accent |
| `clay-500` | `#B5734F` | 181,115,79  | **Primary buttons, links** |
| `clay-600` | `#A4623F` | 164,98,63   | Button hover/active |
| `clay-700` | `#8A4F32` | 138,79,50   | Pressed / strong accent |

### Brand — Sage Green (secondary / positive)
| Token | Hex | RGB | Sampled use |
|-------|-----|-----|-------------|
| `sage-50`  | `#ECEFE8` | 236,239,232 | Success tint bg |
| `sage-100` | `#D6DECB` | 214,222,203 | Chart fills |
| `sage-300` | `#A9B894` | 169,184,148 | Chart series |
| `sage-500` | `#7E9469` | 126,148,105 | **Positive / "Optimal"** |
| `sage-700` | `#5E7050` | 94,112,80   | Strong positive text |

### Neutrals — Warm sand / taupe
| Token | Hex | RGB | Sampled use |
|-------|-----|-----|-------------|
| `sand-0`   | `#FFFFFF` | 255,255,255 | Card surface (top) |
| `sand-50`  | `#FAF6F1` | 250,246,241 | App background / cards |
| `sand-100` | `#F2EBE3` | 242,235,227 | Panel background |
| `sand-200` | `#E6DCD0` | 230,220,208 | Borders, dividers |
| `sand-300` | `#D2C4B4` | 210,196,180 | Muted borders |
| `taupe-400`| `#A89685` | 168,150,133 | Secondary text/icons |
| `taupe-600`| `#6E6052` | 110,96,82   | Body text (muted) |
| `ink-800`  | `#3D3730` | 61,55,48    | Primary text |
| `ink-900`  | `#241F1A` | 36,31,26    | Headings (serif) |

### Functional / status
| Token | Hex | RGB | Use |
|-------|-----|-----|-----|
| `success-500` | `#7E9469` | 126,148,105 | Success (maps to sage-500) |
| `warning-500` | `#C9A227` | 201,162,39  | Warning |
| `danger-500`  | `#B5503F` | 181,80,63   | Error / delete |
| `info-500`    | `#6E8CA0` | 110,140,160 | Info |

---

## 2. Typography tokens
| Token | Value |
|-------|-------|
| `font-display` | "Playfair Display", Georgia, serif *(or your licensed serif)* |
| `font-body`    | "Inter", "Helvetica Neue", Arial, sans-serif |
| `text-xs`  | 12px / 16px |
| `text-sm`  | 14px / 20px |
| `text-base`| 16px / 24px |
| `text-lg`  | 18px / 28px |
| `text-xl`  | 22px / 30px |
| `text-2xl` | 28px / 36px |
| `text-3xl` | 36px / 44px |
| `text-display` | 56px / 64px |
| `weight-regular` | 400 |
| `weight-medium`  | 500 |
| `weight-semibold`| 600 |
| `weight-bold`    | 700 |

## 3. Spacing scale (4px base)
| Token | px |
|-------|----|
| `space-1` | 4 |
| `space-2` | 8 |
| `space-3` | 12 |
| `space-4` | 16 |
| `space-5` | 20 |
| `space-6` | 24 |
| `space-8` | 32 |
| `space-10`| 40 |
| `space-12`| 48 |
| `space-16`| 64 |

## 4. Radius
| Token | px |
|-------|----|
| `radius-sm` | 6 |
| `radius-md` | 10 |
| `radius-lg` | 16 |
| `radius-xl` | 24 |
| `radius-pill` | 999 |

## 5. Elevation / shadow (see doc 05 for rules)
| Token | Value |
|-------|-------|
| `shadow-none` | none |
| `shadow-xs` | `0 1px 2px rgba(61,55,48,0.06)` |
| `shadow-sm` | `0 2px 6px rgba(61,55,48,0.08)` |
| `shadow-md` | `0 6px 16px rgba(61,55,48,0.10)` |
| `shadow-lg` | `0 12px 28px rgba(61,55,48,0.12)` |

## 6. Z-index
| Token | Value |
|-------|-------|
| `z-base` | 0 |
| `z-dropdown` | 1000 |
| `z-sticky` | 1100 |
| `z-overlay` | 1200 |
| `z-modal` | 1300 |
| `z-toast` | 1400 |