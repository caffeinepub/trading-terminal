# Trading Terminal

## Current State
- TopNav has nav links: Dashboard, Markets, Analysis, Tools, Account
- MarketWatch panel has a bottom section showing 24h Spot Volume with bars for BTC, ETH, LTC
- The app only tracks 3 assets (BTC, ETH, LTC) in MarketWatch
- Trades table is at the bottom of the page

## Requested Changes (Diff)

### Add
- New "Volume" nav item in TopNav header (alongside Dashboard, Markets, etc.)
- New full-page `VolumeTable` component that shows ALL assets traded on Dzengi, with columns: Symbol, Price, 24h Change %, 24h Volume (base), 24h Quote Volume (USD), High, Low
- Clicking "Volume" nav item shows the VolumeTable section (togglable or inline below main grid)
- Data sourced from Dzengi's `/api/v1/ticker/24hr` endpoint which returns ALL symbols

### Modify
- Remove the "24h Spot Volume" bottom section from MarketWatch panel
- TopNav: add "Volume" as a nav link; clicking it shows/hides the volume table section

### Remove
- 24h Spot Volume bars section at the bottom of MarketWatch

## Implementation Plan
1. Update TopNav to accept an `activeView` prop and call `onViewChange` when nav links are clicked; add "Volume" to nav links
2. Update App.tsx to manage `activeView` state; show VolumeTable section when "Volume" is active
3. Remove volume bars section from MarketWatch.tsx
4. Create new `VolumeTable.tsx` component that:
   - Fetches all tickers from Dzengi `/api/v1/ticker/24hr`
   - Displays a sortable table of all symbols with price, change, volume, high, low
   - Auto-refreshes every 10 seconds
   - Formats numbers nicely (compact volume, price precision)
