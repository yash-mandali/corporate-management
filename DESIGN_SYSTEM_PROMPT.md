# HRMS Portal — Design System & UI Prompt

---

## One-Line Summary

> A professional, clean, teal-dominant HRMS web portal with a dark sidebar, light content area, card-based layouts, and a modern SaaS aesthetic — built for desktop-first with responsive mobile support.

---

## Complete Design Prompt

Use this prompt to recreate or extend the UI in any design tool or AI generator:

---

> Design a modern, professional **HR Management System (HRMS) web portal** with the following exact design language:
>
> **Overall Aesthetic:** Clean SaaS dashboard. Light background, white cards, teal/dark-teal primary brand color. Corporate but approachable. No heavy shadows, no dark mode. Feels like a polished internal enterprise tool.
>
> **Layout:** Fixed left sidebar (240px wide, dark teal `#09637e`) + sticky top header (56px, light teal-tinted `#EBF4F6`) + scrollable main content area with `22px 24px` padding. Content uses a light blue-grey background `#ebf4f6` or `#f0f4f8`.
>
> **Sidebar:** Deep teal `#09637e` background. White text at 80% opacity for nav items. Active nav item has a lighter teal highlight `#3689a2`. Nav items have a subtle bottom border separator. Logo in white bold text at top. Logout button at bottom with a ghost/outline style. Slides off-screen on mobile.
>
> **Header/Topbar:** Light teal-tinted background `#EBF4F6` with a 1px bottom border `#d6eaee`. Contains: hamburger menu (mobile), welcome text, current date, notification bell with red badge, and user avatar circle. Avatar is a gradient circle `linear-gradient(135deg, #09637e, #088395)` showing user initials. Notification panel drops down with a teal gradient header and scrollable list.
>
> **Color Palette (exact hex values):**
> - Primary / Brand: `#09637e` (deep teal)
> - Primary Light: `#088395` (medium teal)
> - Primary Bright: `#0bbdcc` (cyan-teal accent)
> - Primary Dark: `#053d51` / `#07536e` (dark teal for gradients)
> - Background: `#ebf4f6` (light teal-grey page bg) or `#f0f4f8` (blue-grey)
> - Surface/Card: `#ffffff`
> - Border: `#d6eaee` (light teal border) or `#e2e8f0`
> - Text Primary: `#0d2d36` (very dark teal, near-black)
> - Text Secondary: `#5a8a94` (muted teal-grey)
> - Text Tertiary: `#94a3b8` (light grey)
> - Success/Green: `#27ae60` / `#16a34a`, light: `#dcfce7`
> - Warning/Amber: `#d68910` / `#d97706`, light: `#fef3c7`
> - Danger/Red: `#c0392b` / `#dc2626`, light: `#fee2e2`
> - Info/Blue: `#2980b9` / `#2563eb`, light: `#dbeafe`
> - Purple: `#8e44ad` / `#7c3aed`, light: `#ede9fe`
> - Sidebar Active: `#3689a2`
> - Sidebar Hover: `rgba(255,255,255,0.1)`
>
> **Typography:**
> - Body font: `'Nunito'` (weights 400, 600, 700, 800, 900) — used across all dashboard pages
> - Auth pages: `'Plus Jakarta Sans'` for labels/body, `'Lucida Sans'` for headlines, `'Segoe UI'` for form titles
> - Sidebar logo: `Verdana`
> - Base font size: 14px, line-height 1.5
> - Page titles: 20px, weight 900, color `#0d2d36`
> - Section labels: 11px, weight 800, uppercase, letter-spacing 1px, color `#5a8a94`
> - Table headers: 10–11px, weight 700–800, uppercase, letter-spacing 0.6px, color `#5a8a94`
> - Table body: 12–13px, weight 600
>
> **Cards:** White background, `border-radius: 12–14px`, `border: 1px solid #d6eaee`, subtle shadow `0 1px 6px rgba(9,99,126,0.05)`. On hover: `translateY(-2px)` lift + slightly stronger shadow. Stat cards have a 3px colored top accent bar.
>
> **Stat Cards:** 4-column grid. Each card has: colored icon box (10px border-radius, tinted background), large bold number (26–28px, weight 900), small uppercase label, and a thin progress bar at the bottom. Top accent bar color matches the stat type (green=present, red=absent, amber=late, teal=rate).
>
> **Buttons:**
> - Primary: `linear-gradient(135deg, #09637e, #088395)`, white text, `border-radius: 8–11px`, weight 700–800, shadow `0 3–4px 12–18px rgba(9,99,126,0.25)`. Hover: `translateY(-2px)` + stronger shadow.
> - Outline: white bg, `border: 1.5px solid #d6eaee`, muted text. Hover: teal border + teal text.
> - Danger: `linear-gradient(135deg, #c0392b, #e74c3c)`.
> - Success: `linear-gradient(135deg, #1e8449, #27ae60)`.
> - Icon-only action buttons: 28–30px square, `border-radius: 7–8px`, light tinted bg, colored icon. Hover fills with solid color.
>
> **Badges/Pills:** `border-radius: 20px`, small padding `3–4px 9–10px`, font-size 10–11px, weight 700–800. Color-coded: green for approved/present, amber for pending/late, red for rejected/absent, blue for info, grey for withdrawn/neutral. Each badge has a small dot `::before` pseudo-element.
>
> **Tables:** Full-width, `border-collapse: collapse`. Header row: `background: #f0f8fa`, uppercase 10px labels. Body rows: `border-bottom: 1px solid #edf6f8`, hover `background: #f7fbfc`. Left accent border on rows for status (3px colored left border). Horizontally scrollable on small screens.
>
> **Filter Tabs:** Pill-shaped toggle buttons in a row. Default: white bg, muted text, teal border on hover. Active: solid fill matching the filter type (teal for all, amber for pending, green for approved, red for rejected). Count badge inside each tab.
>
> **Modals:** Centered overlay with `backdrop-filter: blur(3–4px)` and dark semi-transparent bg `rgba(9,15,28,0.55)`. Modal box: white, `border-radius: 16px`, max-width 440–560px, `box-shadow: 0 20–24px 60–64px rgba(0,0,0,0.15–0.22)`. Modal header: teal gradient `linear-gradient(135deg, #09637e, #088395)` with white title and icon. Slide-up animation on open.
>
> **Forms:** Input fields: `background: #f8fcfd` or `#ebf4f6`, `border: 1.5px solid #ddedf1`, `border-radius: 9–10px`, padding `9–13px`. Focus: teal border `#09637e` + `box-shadow: 0 0 0 3–3.5px rgba(9,99,126,0.09)`. Labels: 11–12px, weight 700, uppercase or small-caps. Error state: red border + light red background.
>
> **Tab Navigation (within pages):** Pill-style tab switcher. Container: white bg, `border: 1px solid #d6eaee`, `border-radius: 11px`, inner padding 4px. Active tab: `background: #09637e`, white text, small shadow. Inactive: transparent, muted text.
>
> **Progress Bars:** Height 3–7px, `border-radius: 10–20px`, background `#ebf4f6`. Fill: `linear-gradient(90deg, #09637e, #0bbdcc)` for teal, solid colors for others. Animated width transition `0.6–0.8s ease`.
>
> **Page Icons:** 44–46px square, `border-radius: 12–13px`, `linear-gradient(135deg, #09637e, #088395)`, white icon inside, `box-shadow: 0 4px 14px rgba(9,99,126,0.28)`.
>
> **Section Dividers:** Thin 1px `#d6eaee` line with a small uppercase label and icon in the middle. Label: 11px, weight 800, color `#5a8a94`.
>
> **Animations:**
> - `slideUp`: `translateY(20–30px) → 0, opacity 0→1`, duration 0.25–0.75s
> - `fadeUp`: `translateY(8px) → 0, opacity 0→1`, duration 0.25s
> - `cardIn`: `translateY(18px) → 0, opacity 0→1`, duration 0.55s, cubic-bezier(0.22,1,0.36,1)
> - `dropIn`: `translateY(-6px) → 0, opacity 0→1`, duration 0.18s
> - `slideDown` (notification panel): `translateY(-8px) scale(0.98) → 0 scale(1)`, duration 0.2s
> - `pulse-dot`: pulsing green dot for live/online indicators
> - `shimmer`: left-to-right light sweep on hover for primary buttons
> - `bounceIn`: scale 0 → 1.3 → 1 for success icons
> - `spin`: 360deg rotation for loading spinners
>
> **Login/Signup Page:** Split-screen layout. Left panel: dark teal gradient `linear-gradient(160deg, #053d51, #07536e, #09637e, #0a7a96)` with animated floating orbs (white, 4% opacity), brand logo, large serif headline with italic cyan accent `#0bbdcc`, stats row with glassmorphism card. Right panel: light teal bg `#f0f8fa`, centered white form card with layered shadows, teal gradient submit button. On mobile: left panel hidden, form takes full screen.
>
> **Scrollbar:** Custom thin scrollbar — 4px width, transparent track, `#cbd5e1` or `#b2dce2` thumb, `border-radius: 2–4px`.
>
> **Responsive Breakpoints:**
> - 1100px: stats grid collapses from 4→2 columns, side panels stack
> - 768px: sidebar hides (slides off-screen), header shows hamburger, grids go single column
> - 480px: further compression, smaller font sizes, tighter padding
>
> **Notification Panel:** 360px wide dropdown, white bg, teal gradient header, scrollable list. Unread items: subtle teal left accent bar (3px) + teal-tinted background. Read items: plain white. Each item has a colored icon box, title, message (2-line clamp), type tag, and time-ago. Pulsing dot for unread, checkmark for read.
>
> **Avatar/Initials:** Circular, `linear-gradient(135deg, #09637e, #088395)`, white text, `border: 2px solid #b2dce2`. Hover: teal ring glow.
>
> **Empty States:** Centered column layout, large icon in a rounded box (`background: #ebf4f6`), bold title, muted subtitle.
>
> **Loading Spinners:** Circular border spinner, `border-top-color: #09637e` or white, `animation: spin 0.7–1s linear infinite`.

---

## Color Palette Reference

### Primary Brand (Teal Family)

| Name | Hex | Usage |
|---|---|---|
| Brand Deep | `#09637e` | Sidebar, buttons, icons, links, active states |
| Brand Medium | `#088395` | Gradients, hover states |
| Brand Bright | `#0bbdcc` | Accent highlights, italic text, progress fills |
| Brand Dark 1 | `#07536e` | Login panel gradient mid |
| Brand Dark 2 | `#053d51` | Login panel gradient start |
| Brand Light | `#ebf4f6` | Page background, input backgrounds, tinted areas |
| Brand Lighter | `#f0f8fa` | Form panel bg, table header bg |
| Brand Border | `#d6eaee` | All borders, dividers |
| Brand Border 2 | `#b2dce2` | Avatar border, scrollbar thumb |
| Brand Muted | `#5a8a94` | Secondary text, icons, labels |
| Brand Dark Text | `#0d2d36` | Primary text (near-black teal) |

### Semantic Colors

| Name | Hex | Light Variant | Usage |
|---|---|---|---|
| Success | `#27ae60` / `#16a34a` | `#dcfce7` | Approved, present, paid, online |
| Warning | `#d68910` / `#d97706` | `#fef3c7` | Pending, late, on-hold |
| Danger | `#c0392b` / `#dc2626` | `#fee2e2` | Rejected, absent, delete, error |
| Info | `#2980b9` / `#2563eb` | `#dbeafe` | Draft, info states |
| Purple | `#8e44ad` / `#7c3aed` | `#ede9fe` | Payroll, special states |

### Neutral / UI

| Name | Hex | Usage |
|---|---|---|
| White | `#ffffff` | Cards, modals, inputs |
| Page BG | `#f0f4f8` | Global background (global CSS) |
| Page BG Alt | `#ebf4f6` | Dashboard pages background |
| Border Light | `#e2e8f0` | Global border |
| Border Teal | `#d6eaee` | Component borders |
| Text Primary | `#1e293b` | Global text (global CSS) |
| Text Primary Alt | `#0d2d36` | Dashboard text |
| Text Secondary | `#64748b` / `#5a8a94` | Muted text |
| Text Tertiary | `#94a3b8` | Placeholder, disabled |

### Sidebar Specific

| Name | Hex | Usage |
|---|---|---|
| Sidebar BG | `#09637e` | Sidebar background |
| Sidebar Active | `#3689a2` | Active nav item |
| Sidebar Hover | `rgba(255,255,255,0.1)` | Nav item hover |

---

## Typography System

| Element | Font | Size | Weight | Color |
|---|---|---|---|---|
| Body | Nunito | 14px | 400 | `#0d2d36` |
| Page Title | Nunito | 20px | 900 | `#0d2d36` |
| Page Subtitle | Nunito | 12px | 600 | `#5a8a94` |
| Section Label | Nunito | 11px | 800 | `#5a8a94` |
| Card Value (large) | Nunito | 26–28px | 900 | `#0d2d36` |
| Card Label | Nunito | 10–11px | 700 | `#5a8a94` |
| Table Header | Nunito | 10–11px | 700–800 | `#5a8a94` |
| Table Body | Nunito | 12–13px | 600 | `#0d2d36` |
| Badge | Nunito | 10–11px | 700–800 | varies |
| Button | Nunito / Inter | 12–14px | 700–800 | white |
| Form Label | Plus Jakarta Sans | 11–12px | 700 | `#0d2d36` |
| Form Input | Plus Jakarta Sans | 13–14px | 500 | `#0d2d36` |
| Auth Headline | Lucida Sans | 44–46px | 400 | white |
| Auth Form Title | Segoe UI | 30px | 400 | `#0d2d36` |
| Logo | Verdana / Plus Jakarta Sans | 20px | 800 | white |
| Notification Title | Nunito | 12px | 800 | `#0d2d36` |

---

## Layout System

```
┌─────────────────────────────────────────────────────┐
│  SIDEBAR (240px fixed)  │  MAIN CONTENT (flex: 1)   │
│  bg: #09637e            │                            │
│                         │  HEADER (56px sticky)      │
│  [Logo]                 │  bg: #EBF4F6               │
│                         │  ─────────────────────     │
│  [Nav Items]            │  PAGE CONTENT              │
│  - active: #3689a2      │  padding: 22px 24px        │
│  - hover: rgba(w,0.1)   │  bg: #ebf4f6               │
│                         │                            │
│  [Logout]               │  [Stats Grid 4-col]        │
│                         │  [Cards / Tables]          │
└─────────────────────────────────────────────────────┘
```

### Grid Utilities

| Class | Columns | Gap | Usage |
|---|---|---|---|
| `stats-grid` | 4 equal | 14px | Stat cards row |
| `grid-2` | 1fr 1fr | 15px | Two-column content |
| `grid-3-1` | 2fr 1fr | 15px | Main + sidebar panel |
| `form-row` | 1fr 1fr | 12px | Form field pairs |
| `slips-grid` | auto-fill 280px | 14px | Salary slip cards |

---

## Component Patterns

### Stat Card

```
┌──────────────────────────────┐  ← 3px colored top bar
│  [Icon Box]  26px Number     │
│              LABEL           │
│  ▓▓▓▓▓░░░░░ progress bar    │
└──────────────────────────────┘
```

- Border-radius: 12–14px
- Icon box: 36–44px, 10–11px radius, tinted bg
- Number: 26–28px, weight 900
- Label: 10–11px, uppercase, weight 700
- Progress: 3px height, teal gradient

### Page Header

```
[Gradient Icon Box]  Page Title (20px 900)
                     Subtitle (12px muted)
                                    [Action Buttons]
```

### Modal Structure

```
┌─────────────────────────────────┐
│ [Teal Gradient Header]          │  ← linear-gradient(135deg, #09637e, #088395)
│  [Icon]  Title                  │
│          Subtitle          [✕]  │
├─────────────────────────────────┤
│  Form Body (scrollable)         │
├─────────────────────────────────┤
│  [Cancel]  [Primary Action]     │  ← bg: #f9fdfe
└─────────────────────────────────┘
```

### Filter Tab Bar

```
[All (12)] [Pending (3)] [Approved (7)] [Rejected (2)]
  ↑ active = solid teal fill, white text
  ↑ inactive = white bg, muted text, teal border on hover
```

### Table Row

```
│ # │ Employee │ Date │ Status │ Amount │ Actions │
│   │          │      │ ●Pill  │        │ [👁][✏][🗑] │
```

- Row hover: `background: #f7fbfc`
- Status left accent: 3px colored left border
- Action buttons: 28–30px icon-only squares

---

## Animation Reference

| Animation | Effect | Duration | Trigger |
|---|---|---|---|
| `slideUp` | Y+20px → 0, fade in | 0.25–0.75s | Modal open, page load |
| `cardIn` | Y+18px → 0, fade in | 0.55s | Auth form card |
| `fadeUp` | Y+8px → 0, fade in | 0.25s | General fade |
| `dropIn` | Y-6px → 0, fade in | 0.18s | Profile dropdown |
| `slideDown` | Y-8px scale(0.98) → 0 scale(1) | 0.2s | Notification panel |
| `drift` | translate(0,0) → (10px,-16px) | 9s infinite | Login orbs |
| `pulse-dot` | box-shadow pulse | 1.4–2s infinite | Online indicator |
| `shimmer` | left -100% → 100% | 1.5s infinite | Button hover |
| `bounceIn` | scale(0) → scale(1.3) → scale(1) | 0.6s | Success checkmark |
| `spin` | rotate 360deg | 0.7–1s infinite | Loading spinner |
| `pop-in` | scale(0) → scale(1) | 0.25s | Notification badge |
| `successPulse` | box-shadow expand | 0.6s | Check-in/out success |

---

## Responsive Breakpoints

| Breakpoint | Changes |
|---|---|
| `≤ 1100px` | Stats grid: 4→2 cols, side panels stack vertically |
| `≤ 768px` | Sidebar hides (translateX(-100%)), header shows hamburger, grids go 1-col, padding reduces |
| `≤ 480px` | Further compression, smaller values, tighter gaps |
| `≤ 360px` | Stats grid stays 2-col with minimal gap |

---

## Design Decisions & Patterns

1. **Teal is the only brand color** — no blue, no purple as primary. Everything anchors to `#09637e`.
2. **Cards never have heavy shadows** — always subtle `0 1px 6px rgba(9,99,126,0.05)`. Depth comes from borders and hover lifts.
3. **Gradients are used sparingly** — only on: sidebar, buttons, page icons, modal headers, hero sections, progress fills.
4. **Status is always communicated with color + dot** — never color alone. Every badge has a small circle dot.
5. **Tables use left accent borders** — colored 3px left border on `<td>:first-child` to indicate row status at a glance.
6. **Modals always have teal gradient headers** — creates visual consistency across all dialogs.
7. **Font weight 900 is used for numbers** — all stat values, counts, and key metrics use weight 900 for visual punch.
8. **Hover always lifts** — interactive cards and buttons use `translateY(-2px)` on hover, never color change alone.
9. **Backdrop blur on overlays** — all modal overlays use `backdrop-filter: blur(3–5px)` for depth.
10. **Auth pages are split-screen** — left brand panel (dark teal gradient) + right form panel (light teal). Mobile hides the brand panel.
