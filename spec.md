# Trading Terminal

## Current State

A full trading terminal with these main pages/views:
1. **Dashboard** (default) — 3-column grid: MarketWatch (left) + BtcChart (center) + TradingStatsPanel (right), then TradesTable below
2. **Volume tab** — Full-width VolumeTable with category filter tabs, search, sortable columns
3. **Analysis tab** — AnalysisPanel with Fear & Greed gauge, Macro Markets, Funding Rates, Open Interest, BTC Social Sentiment

Header: TopNav with brand logo, nav links, search bar, bell icon, Trader dropdown.

### Known responsiveness gaps
- **TopNav**: Nav links hidden on mobile (`hidden md:flex`), no hamburger menu; search bar only on `lg:` screens; the brand name and full trader chip overflow on small screens
- **App layout (App.tsx)**: 3-column grid with `grid-cols-1 lg:grid-cols-[280px_1fr_280px]` but MarketWatch stacks ABOVE chart on mobile which pushes chart far down; no way to collapse MarketWatch on mobile
- **BtcChart**: Has `h-[440px] md:h-full` but interval buttons may overflow on very small screens
- **MarketWatch**: No specific mobile layout issues but height is `h-full` which may be short when stacked
- **VolumeTable**: `overflow-x-auto` wraps the table but 8 columns are too wide — on mobile many columns are hidden off-screen; category filter tabs can overflow on small screens
- **AnalysisPanel**: Macro grid is `grid-cols-2 lg:grid-cols-4` (fine); Fear & Greed section is `flex-col lg:flex-row` (ok); Funding/OI sections are `flex-col sm:flex-row` (mostly ok). But overall panel padding is 24px which wastes space on mobile
- **TradesTable**: 9 columns with no responsive handling — very wide on mobile
- **TradingStats**: Not read yet, likely has fixed widths

## Requested Changes (Diff)

### Add
- Mobile hamburger menu in TopNav for nav links (use a Sheet/drawer that slides in from left)
- Mobile-friendly search that appears as icon-tap on small screens (or moves into a row below nav)
- Tab navigation becomes horizontally scrollable on mobile in TopNav
- On mobile Dashboard: show a collapsible/accordion for MarketWatch so it doesn't push chart far down; or show MarketWatch as a horizontal scrollable strip
- VolumeTable mobile card layout OR hide less important columns (Volume, High, Low) on small screens
- TradesTable: hide less critical columns (Quantity, Opened, MFE/MAE) on mobile; show only Type, Asset, Current Price, Status, P/L

### Modify
- TopNav: brand area shrinks gracefully on mobile (hide full text "Trading Terminal" at xs, keep "T" logo only)
- App.tsx main grid: on mobile, MarketWatch becomes a compact horizontal scrollable row of asset chips (not full panel), chart takes full width, stats hidden (accessible via scroll)
- VolumeTable: filter tabs wrap properly; search + filters stacked on mobile
- AnalysisPanel: reduce padding on mobile (`px-4 py-4` on mobile vs `px-6 py-6` on desktop); Fear & Greed section stacks properly; Macro grid stays 2-col on mobile
- All section paddings tuned for mobile

### Remove
- Nothing removed; only responsive adjustments

## Implementation Plan

1. **TopNav.tsx** — Add mobile hamburger menu using shadcn Sheet; hide nav links below md, show Sheet with all nav links; make search visible on all sizes (compact icon-only on xs, full input on lg)
2. **App.tsx** — On mobile: change dashboard grid to show MarketWatch as a compact horizontal asset selector strip; chart takes full column; TradingStats moves below chart; everything responsive
3. **MarketWatch.tsx** — Add a compact horizontal "strip" mode that shows asset chips side-by-side on mobile (triggered by parent or media query)
4. **BtcChart.tsx** — Ensure interval buttons wrap/scroll on small screens; price header layout adjusts for mobile
5. **TradesTable.tsx** — Hide non-essential columns on mobile using `hidden sm:table-cell` or similar; ensure horizontal scroll fallback
6. **VolumeTable.tsx** — Hide low-priority columns on mobile; ensure filter tabs scroll horizontally; search input full-width on mobile
7. **AnalysisPanel.tsx** — Reduce padding on mobile; ensure all sections are properly stacked and readable on small screens
