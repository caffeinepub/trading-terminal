# Trading Terminal

## Current State
- VolumeTable fetches all 541 Dzengi assets and classifies them into categories
- MarketWatch on dashboard shows only 3 hardcoded assets: BTC, ETH, LTC
- API returns 29 duplicate symbols where both "Gold" and "Gold." (dot-suffixed) versions exist
- Duplicates appear visually in the Commodities filter tab (Gold/Silver/Platinum/Palladium/Oil/Gas each shown twice)

## Requested Changes (Diff)

### Add
- Deduplication logic in VolumeTable: when the API returns both `Symbol` and `Symbol.` (dot-suffix), keep only the non-dot version (prefer the base symbol)
- Expanded MarketWatch on dashboard: fetch all tickers from `/api/v1/ticker/24hr`, show all assets in a scrollable list with category filter tabs (All, Crypto, Forex, Stocks, Commodities, Indexes)
- Search within the expanded Market Watch panel

### Modify
- VolumeTable `fetchTickers`: after parsing, deduplicate by removing dot-suffix symbols that have a base (non-dot) counterpart
- MarketWatch: replace the hardcoded 3-asset ASSET_CONFIG with a dynamic fetch of all tickers; keep BTC/ETH/LTC as clickable for chart; other assets show info only (price, change, volume)
- MarketWatch full-mode panel: add category tabs at the top, make the asset list scrollable and filterable
- MarketWatch compact-mode (mobile): keep showing only BTC/ETH/LTC chips for chart switching

### Remove
- Nothing removed

## Implementation Plan
1. In `VolumeTable.tsx`: after parsing ticker rows, build a Set of all non-dot symbols, then filter out any row where `symbol` ends with `.` AND `symbol.slice(0,-1)` is in the Set
2. In `MarketWatch.tsx`:
   - Add state: `allAssets` (full ticker list), `categoryFilter` (All/Crypto/Forex/Stocks/Commodities/Indexes)
   - On mount, fetch all `/api/v1/ticker/24hr` and store parsed rows
   - In full-mode render: show category tabs, filtered+searched scrollable list
   - Chart-linked symbols (BTC/ETH/LTC via LEVERAGE) remain clickable to switch chart
   - Other assets: show as non-clickable info rows (or allow future expansion)
   - Compact mode (mobile): unchanged — shows only BTC/ETH/LTC chips
3. Reuse the `classifyAsset` logic from VolumeTable (or duplicate it in MarketWatch) to classify each ticker row
