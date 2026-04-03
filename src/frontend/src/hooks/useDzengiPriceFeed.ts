import { useEffect, useRef, useState } from "react";

const DZENGI_WS_URL = "wss://demo-api-adapter.dzengi.com/connect";
const KEEPALIVE_INTERVAL_MS = 25_000;
const RECONNECT_DELAY_MS = 3_000;

const SYMBOLS = ["BTC/USD_LEVERAGE", "ETH/USD_LEVERAGE", "LTC/USD_LEVERAGE"];

export interface AssetPrice {
  price: number;
  change24h: number;
  open: number;
  high: number;
  low: number;
}

export type PriceFeedStatus = "connecting" | "connected" | "disconnected";

export interface DzengiPriceFeed {
  prices: Record<string, AssetPrice>;
  status: PriceFeedStatus;
}

export function useDzengiPriceFeed(): DzengiPriceFeed {
  const [prices, setPrices] = useState<Record<string, AssetPrice>>({});
  const [status, setStatus] = useState<PriceFeedStatus>("connecting");

  const wsRef = useRef<WebSocket | null>(null);
  const isMountedRef = useRef(true);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keepaliveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Track opening prices per symbol to compute change24h from open→close
  const openPricesRef = useRef<Record<string, number>>({});
  // Track last known change24h to preserve across ticks that don't send it
  const lastChange24hRef = useRef<Record<string, number>>({});

  useEffect(() => {
    isMountedRef.current = true;

    function clearKeepalive() {
      if (keepaliveTimerRef.current !== null) {
        clearInterval(keepaliveTimerRef.current);
        keepaliveTimerRef.current = null;
      }
    }

    function sendKeepalive(ws: WebSocket) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            destination: "/app/ping",
            correlationId: "ping",
          }),
        );
      }
    }

    function connect() {
      if (!isMountedRef.current) return;

      setStatus("connecting");
      const ws = new WebSocket(DZENGI_WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) return;
        setStatus("connected");

        // Subscribe to each symbol
        SYMBOLS.forEach((symbol, idx) => {
          ws.send(
            JSON.stringify({
              destination: "/app/OHLCMarketData.subscribe",
              correlationId: String(idx + 1),
              payload: {
                symbol,
                intervals: ["1m"],
              },
            }),
          );
        });

        // Start keepalive
        clearKeepalive();
        keepaliveTimerRef.current = setInterval(
          () => sendKeepalive(ws),
          KEEPALIVE_INTERVAL_MS,
        );
      };

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;
        try {
          const msg = JSON.parse(event.data as string);
          // Ignore pong/non-payload messages
          if (!msg?.payload) return;

          const payload = msg.payload;
          const symbol: string | undefined = payload.symbol;
          if (!symbol) return;

          const closeStr = payload.close ?? payload.c ?? payload.lastPrice;
          const openStr = payload.open ?? payload.o;
          const highStr = payload.high ?? payload.h;
          const lowStr = payload.low ?? payload.l;

          if (closeStr === undefined && closeStr === null) return;

          const close = Number.parseFloat(String(closeStr));
          if (Number.isNaN(close) || close <= 0) return;

          const open =
            openStr !== undefined ? Number.parseFloat(String(openStr)) : 0;
          const high =
            highStr !== undefined ? Number.parseFloat(String(highStr)) : 0;
          const low =
            lowStr !== undefined ? Number.parseFloat(String(lowStr)) : 0;

          // Compute change24h from open if available; otherwise use last known
          let change24h = lastChange24hRef.current[symbol] ?? 0;
          if (open > 0) {
            // Store first seen open price per symbol as baseline
            if (!openPricesRef.current[symbol]) {
              openPricesRef.current[symbol] = open;
            }
            const baseline = openPricesRef.current[symbol];
            if (baseline > 0) {
              change24h = ((close - baseline) / baseline) * 100;
            }
          }
          lastChange24hRef.current[symbol] = change24h;

          setPrices((prev) => ({
            ...prev,
            [symbol]: { price: close, change24h, open, high, low },
          }));
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        clearKeepalive();
        if (!isMountedRef.current) return;
        setStatus("disconnected");
        reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
      };

      ws.onerror = () => {
        // Let onclose handle reconnect
        ws.close();
      };
    }

    connect();

    return () => {
      isMountedRef.current = false;
      clearKeepalive();
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  return { prices, status };
}
