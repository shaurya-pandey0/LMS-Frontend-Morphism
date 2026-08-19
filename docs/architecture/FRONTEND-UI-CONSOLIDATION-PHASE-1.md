# UI Consolidation — Phase 1 Document

## Overview

Phase 1 UI consolidation extracted repeated markup across all frontend pages into modular, reusable components while strictly preserving 100% visual, layout, behavioral, and architectural parity with the backup reference application (`http://localhost:5173`).

---

## Shared Components Extracted & Component Contracts

### 1. `AppShell` ([components/AppShell.jsx](file:///C:/Users/PC/Desktop/V2/New%20folder/FrontEnd%20Morphism/frontend/src/components/AppShell.jsx))
- **Purpose**: Centralized application shell layout container wrapping the sidebar overlay, main content wrapper, and botanical background.
- **Props**:
  - `active` (`string`): ID of active navigation link (e.g. `'dashboard'`, `'daily-log'`).
  - `children` (`ReactNode`): Page body contents rendered inside `<main className="app-main"><div className="app-main__content">`.
  - `dataScreenLabel` (`string`): Optional analytics tracking label.
  - `sidebar` (`ReactNode`): Optional custom sidebar override (used by `AdminPage` for admin-specific nav).

### 2. `BrandLogo` ([components/BrandLogo.jsx](file:///C:/Users/PC/Desktop/V2/New%20folder/FrontEnd%20Morphism/frontend/src/components/BrandLogo.jsx))
- **Purpose**: Single source of truth for the LifeTrack leaf SVG mark and typography wordmark.
- **Props**:
  - `id` (`string`): Optional element identifier.
  - `className` (`string`): CSS container class (defaults to `'sidebar__logo'`).
  - `style` (`object`): Optional inline style overrides.

### 3. `AuthShell` ([components/AuthShell.jsx](file:///C:/Users/PC/Desktop/V2/New%20folder/FrontEnd%20Morphism/frontend/src/components/AuthShell.jsx))
- **Purpose**: Wrapper layout for public authentication screens (`LoginPage`, `RegisterPage`).
- **Structure**: Renders `.app-shell--auth`, `.botanical-overlay`, `.mesh-overlay`, and `.card--auth`.

### 4. `PasswordInput` ([components/PasswordInput.jsx](file:///C:/Users/PC/Desktop/V2/New%20folder/FrontEnd%20Morphism/frontend/src/components/PasswordInput.jsx))
- **Purpose**: Form input wrapper for password fields with integrated show/hide suffix toggle button.
- **Props**:
  - `id` (`string`): Input element ID.
  - `value` (`string`), `onChange` (`function`): Controlled input handlers.
  - `placeholder` (`string`), `required` (`boolean`), `autoComplete` (`string`).
  - `toggleId` (`string`): Explicit ID for the toggle button (defaults to `${id}-toggle`).
  - `showLabel` / `hideLabel` (`string`): Custom aria-label strings (e.g. `'Show passwords'` / `'Hide passwords'`).

### 5. `SegmentedTabs` ([components/SegmentedTabs.jsx](file:///C:/Users/PC/Desktop/V2/New%20folder/FrontEnd%20Morphism/frontend/src/components/SegmentedTabs.jsx))
- **Purpose**: Tab control switcher (e.g. `Log Today` vs `History`).
- **Props**:
  - `tabs` (`Array<{ id: string, label: string }>`): Array of tab items.
  - `activeTab` (`string`): Currently selected tab ID.
  - `onTabChange` (`function`): Tab selection callback.
  - `className` (`string`): Wrapper container class (e.g. `'daily-log__tabs'`, `'journal__tabs'`).
  - `btnClass` (`string`): Base CSS class prefix for tab buttons (e.g. `'daily-log__tab'`, `'journal__tab'`). Active button gets `${btnClass}--active`.

### 6. `PageHeader` ([components/PageHeader.jsx](file:///C:/Users/PC/Desktop/V2/New%20folder/FrontEnd%20Morphism/frontend/src/components/PageHeader.jsx))
- **Purpose**: Page header bar displaying title, subtitle, and optional header action controls.

---

## Refactored Pages

| Page | Refactored Markup & Extracted Components Used |
| :--- | :--- |
| **`LoginPage`** | `AuthShell`, `BrandLogo`, `PasswordInput` |
| **`RegisterPage`** | `AuthShell`, `BrandLogo`, `PasswordInput` |
| **`DashboardPage`** | `AppShell`, top-right profile header container |
| **`DailyLogPage`** | `AppShell`, `SegmentedTabs` (`btnClass="daily-log__tab"`) |
| **`ExpensesPage`** | `AppShell` |
| **`JournalPage`** | `AppShell`, `BrandLogo`, `SegmentedTabs` (`btnClass="journal__tab"`) |
| **`AnalyticsPage`** | `AppShell` |
| **`SettingsPage`** | `AppShell`, centered layout wrapper (`margin: 0 auto`) |
| **`AdminPage`** | `AppShell` (custom `AdminSidebar`), 3-column `admin__stats` cards, `Active Users (N)` table |

---

## Visual Parity & Fixes Applied

1. **Password Toggle & Validation Alignment**:
   - Validation text periods removed to match backup (`"Email address is required"`).
   - Password toggle buttons configured with exact target IDs (`login-toggle-password`, `register-toggle-password`).
2. **Tab CSS Styling**:
   - `SegmentedTabs` configured with `btnClass` so `daily-log__tab` and `journal__tab` design system CSS rules apply seamlessly.
3. **Admin Dashboard Parity**:
   - Admin sidebar extracted into `AdminSidebar` with `System Statistics` and `Active Users` navigation items.
   - User table headers updated to `Name`, `Email`, `Role` with active user count in card title.
4. **Dashboard Header & Overlay**:
   - Top-right profile trigger (`SP Shaurya Pandey`) converted from fixed `.topnav` banner to a relative flex header container, preventing card title overlap.
5. **Modal Viewport Centering**:
   - Updated `UserProfileModal` to render via React `createPortal(..., document.body)` so modal overlays center vertically and horizontally in the browser window without parent CSS transform offsets.
6. **Settings Page Layout**:
   - Centered settings form container with `margin: 0 auto`.

---

## Complete & Verified Status

- [x] All 6 shared components extracted and integrated across 9 pages.
- [x] Redux Toolkit authentication slice & Axios clients preserved without modification.
- [x] 100% visual and behavioral parity verified side-by-side against backup (`http://localhost:5173`).
- [x] `npm.cmd run lint` — **PASSED** (0 errors).
- [x] `npm.cmd run build` — **PASSED** (0 errors).
- [x] `npm.cmd test` — **PASSED** (10/10 tests passed).
