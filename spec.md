# Trading Terminal

## Current State
- BtcChart: fetches candles + ticker from Dzengi REST API every 30 seconds via setInterval
- MarketWatch: fetches /ticker from Dzengi REST API every 30 seconds via setInterval
- No WebSocket connections exist anywhere in the app

## Requested Changes (Diff)

### Add
- WebSocket connection in BtcChart using Binance public stream `wss://stream.binance.com/ws/btcusdt@ticker` for real-time price ticks (no auth required)
- WebSocket connections in MarketWatch for BTC, ETH, XRP using Binance combined stream `wss://stream.binance.com/stream?streams=btcusdt@ticker/ethusdt@ticker/xrpusdt@ticker`
- Auto-reconnect logic (retry after 3s on close/error)
- WS connection status indicator (dot in header)

### Modify
- BtcChart: keep Dzengi REST for candle history (initial load + interval switch), replace 30s ticker polling with WebSocket tick updates
- MarketWatch: keep Dzengi REST for initial price load, replace 30s polling with WebSocket tick updates; "LIVE" badge reflects actual WS connection state
- MarketWatch sparkline history updated on each WS tick instead of on polling interval

### Remove
- setInterval-based ticker polling in BtcChart (the 30s interval for /ticker)
- setInterval-based polling in MarketWatch

## Implementation Plan
1. Update BtcChart.tsx: add useRef for WebSocket, connect to Binance BTC/USDT ticker stream on mount, update currentPrice/priceChange/priceChangePercent on each message, keep Dzengi candles fetch for chart bars, reconnect on error/close, cleanup on unmount
2. Update MarketWatch.tsx: add useRef for WebSocket, connect to Binance combined stream for BTC+ETH+XRP tickers, update asset prices on each message, add connection status to LIVE badge (green=connected, yellow=reconnecting), reconnect on error/close, cleanup on unmount
