# Trading Terminal

## Current State
The Analysis tab has 5 sections: Fear & Greed, Macro Markets, Funding Rates, Open Interest, BTC Social Sentiment.

Problems:
1. **Open Interest** -- OKX API has no CORS headers; proxy (corsproxy.io) stopped working, so OI shows "–".
2. **Funding Rates** -- same OKX CORS issue; shows "–".
3. **Macro Markets (S&P 500, Gold, US10Y, DXY)** -- uses Yahoo Finance via corsproxy.io; corsproxy.io changed API and now returns HTML instead of proxied content. All 4 show "unavailable".
4. **BTC Social Sentiment** -- CoinGecko community_data returns all zeros (Reddit/Twitter data deprecated). Shows all zeros.

## Requested Changes (Diff)

### Add
- `allorigins.win/raw` proxy helper as the primary proxy for OKX endpoints (confirmed working for OKX OI and Funding).
- Multiple proxy fallback: try direct → try `api.allorigins.win/raw` → error.
- CoinGecko sentiment score from `sentiment_votes_up_percentage` + `sentiment_votes_down_percentage` for BTC.
- A new `BtcSentimentScore` type with `bullishPct`, `bearishPct`, `loading`, `error`.

### Modify
- **Macro data source**: Replace Yahoo Finance completely. Use Dzengi's `/api/v1/ticker/24hr` (already CORS-enabled, no proxy needed):
  - S&P 500 → `US500.` symbol
  - Gold → `Gold.` symbol  
  - DXY proxy → `USD/JPY_LEVERAGE` (most correlated DXY component, labeled "DXY Proxy (USD/JPY)")
  - US10Y proxy → `TLT.` (20Y Treasury Bond ETF, inversely correlated, labeled "US Bonds (TLT)")
  - Compute prevClose as `lastPrice - priceChange` from ticker data
  - Use `highPrice`/`lowPrice` from the 24h window (no 52w range available, hide range bar for these)
- **OKX proxy**: Replace corsproxy.io with `api.allorigins.win/raw` for all OKX calls (funding rate, OI spot, OI history).
- **Social section**: Replace the 4-tile layout (Twitter/Reddit followers/posts/comments) with a 2-tile layout:
  - BTC Bullish % (from CoinGecko sentiment_votes_up_percentage)
  - BTC Bearish % (from CoinGecko sentiment_votes_down_percentage)
  - Show as percentage gauges/progress bars with color coding (green/red)
  - Keep section header as "BTC Social Sentiment" with badge "CoinGecko"
- **AnalysisPanel**: Remove unused imports (Twitter, Users, MessageSquare) after social section restructure.
- Update the `MacroCard` component to hide the 52w RangeBar when data comes from Dzengi (no 52w data), using a flag `show52wRange`.
- Badge in Macro section header: change from "Yahoo Finance" to "Dzengi".

### Remove
- `fetchYahooFinance` function entirely.
- `BtcSocialState` fields: `twitterFollowers`, `redditSubscribers`, `posts48h`, `comments48h`.
- The CORS proxy constant `CORS_PROXY` pointing to corsproxy.io.

## Implementation Plan
1. Update `useAnalysisData.ts`:
   - Replace corsproxy.io with `allorigins.win/raw` proxy.
   - Replace `fetchYahooFinance` with `fetchDzengiMacro` that reads from Dzengi ticker API.
   - Update `BtcSocialState` to hold `bullishPct` and `bearishPct` only.
   - Update `fetchBtcSocial` to use `sentiment_votes_up_percentage` from CoinGecko.
2. Update `AnalysisPanel.tsx`:
   - Update `MacroCard` to accept optional `show52wRange` prop.
   - Change macro section badge from "Yahoo Finance" to "Dzengi".
   - Rework BTC Social Sentiment section to show 2 sentiment bars instead of 4 tiles.
   - Clean up unused imports.
