import { useCallback, useEffect, useRef, useState } from "react";

const DZENGI_REST_BASE = "https://api-adapter.dzengi.com/api/v1";
const REST_POLL_INTERVAL_MS = 5_000;

const SYMBOLS = [
  "BTC/USD_LEVERAGE",
  "ETH/USD_LEVERAGE",
  "LTC/USD_LEVERAGE",
  "XRP/USD_LEVERAGE",
  "BNB/USD",
];

export interface AssetPrice {
  price: number;
  change24h: number;
  open: number;
  high: number;
  low: number;
  volume24h: number;
  quoteVolume24h: number;
}

export type PriceFeedStatus = "connecting" | "connected" | "disconnected";

export interface DzengiPriceFeed {
  prices: Record<string, AssetPrice>;
  status: PriceFeedStatus;
}

async function fetchTickersRest(): Promise<Record<string, AssetPrice>> {
  const res = await fetch(`${DZENGI_REST_BASE}/ticker/24hr`);
  if (!res.ok) throw new Error(`REST ticker failed: ${res.status}`);
  const data = await res.json();
  const arr: unknown[] = Array.isArray(data) ? data : [];
  const result: Record<string, AssetPrice> = {};
  for (const item of arr) {
    const t = item as Record<string, unknown>;
    const symbol = String(t.symbol ?? "");
    if (!SYMBOLS.includes(symbol)) continue;
    const price = Number.parseFloat(String(t.lastPrice ?? "0"));
    const open = Number.parseFloat(String(t.openPrice ?? "0"));
    const high = Number.parseFloat(String(t.highPrice ?? "0"));
    const low = Number.parseFloat(String(t.lowPrice ?? "0"));
    const change24h = Number.parseFloat(String(t.priceChangePercent ?? "0"));
    const volume24h = Number.parseFloat(String(t.volume ?? "0"));
    const quoteVolume24h = Number.parseFloat(String(t.quoteVolume ?? "0"));
    if (price > 0) {
      result[symbol] = {
        price,
        change24h,
        open,
        high,
        low,
        volume24h,
        quoteVolume24h,
      };
    }
  }
  return result;
}

export function useDzengiPriceFeed(): DzengiPriceFeed {
  const [prices, setPrices] = useState<Record<string, AssetPrice>>({});
  const [status, setStatus] = useState<PriceFeedStatus>("connecting");

  const isMountedRef = useRef(true);
  const restPollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearRestPoll = useCallback(() => {
    if (restPollTimerRef.current !== null) {
      clearInterval(restPollTimerRef.current);
      restPollTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    async function poll() {
      try {
        const result = await fetchTickersRest();
        if (isMountedRef.current) {
          setPrices(result);
          setStatus("connected");
        }
      } catch {
        if (isMountedRef.current) setStatus("disconnected");
      }
    }

    poll();
    restPollTimerRef.current = setInterval(poll, REST_POLL_INTERVAL_MS);

    return () => {
      isMountedRef.current = false;
      clearRestPoll();
    };
  }, [clearRestPoll]);

  return { prices, status };
}
