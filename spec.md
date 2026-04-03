# Trading Terminal

## Current State
BtcChart and MarketWatch both use Binance WebSocket streams (`wss://stream.binance.com`) for real-time price ticks, while candle history is fetched from the Dzengi REST API. The live price connections have no relationship to the Dzengi platform.

## Requested Changes (Diff)

### Add
- Dzengi WebSocket hook/utility that connects to `wss://demo-api-adapter.dzengi.com/connect`
- Subscription to `OHLCMarketData.subscribe` for BTC/USD real-time price ticks via Dzengi WS
- Subscription to market data streams for ETH/USD and XRP/USD in MarketWatch via Dzengi WS
- Keepalive ping every 25 seconds to prevent the 30s timeout disconnect
- Connection status badge showing CONNECTING / LIVE on the Dzengi WS

### Modify
- BtcChart: replace Binance WS (`wss://stream.binance.com/ws/btcusdt@ticker`) with Dzengi WS stream for BTC/USD real-time price
- MarketWatch: replace Binance combined WS stream with Dzengi WS subscriptions for BTC/USD, ETH/USD, XRP/USD
- Both components: update source badge from Binance to Dzengi branding

### Remove
- All references to `wss://stream.binance.com` in BtcChart and MarketWatch

## Implementation Plan
1. Create a shared `useDzengiWebSocket` hook in `src/hooks/useDzengiWebSocket.ts` that:
   - Connects to `wss://demo-api-adapter.dzengi.com/connect`
   - Sends subscription messages in the Dzengi WS format (destination + payload + correlationId)
   - Subscribes to `OHLCMarketData.subscribe` endpoint for real-time price data
   - Sends a keepalive ping every 25 seconds
   - Exposes connection status and latest price data per symbol
   - Auto-reconnects on disconnect (3s delay)
2. Update BtcChart to use this hook for the live BTC/USD price
3. Update MarketWatch to use this hook for BTC/USD, ETH/USD, XRP/USD live prices
4. Validate build
