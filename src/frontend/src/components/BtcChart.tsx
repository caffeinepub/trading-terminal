import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const DZENGI_MARKET_BASE = "https://marketcap.dzengi.com/api/v1";

interface KlineBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  candleRange: [number, number];
  bodyRange: [number, number];
  isGreen: boolean;
}

type Interval = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

const INTERVALS: { label: string; value: Interval }[] = [
  { label: "1M", value: "1m" },
  { label: "5M", value: "5m" },
  { label: "15M", value: "15m" },
  { label: "1H", value: "1h" },
  { label: "4H", value: "4h" },
  { label: "1D", value: "1d" },
];

// Map app interval → Dzengi interval code
const DZENGI_INTERVAL: Record<Interval, string> = {
  "1m": "M1",
  "5m": "M5",
  "15m": "M15",
  "1h": "H1",
  "4h": "H4",
  "1d": "D1",
};

function formatPrice(p: number) {
  return `$${p.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatTime(ts: number, iv: Interval): string {
  const d = new Date(ts);
  if (iv === "1d")
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function CandleTooltip({
  active,
  payload,
}: { active?: boolean; payload?: any[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as KlineBar;
  if (!d) return null;
  return (
    <div
      className="rounded-xl px-3 py-2.5 text-xs"
      style={{
        background: "oklch(0.168 0.020 240)",
        border: "1px solid oklch(1 0 0 / 0.12)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      <div
        className="font-semibold mb-1.5"
        style={{ color: "oklch(0.910 0.015 240)" }}
      >
        {d.time}
      </div>
      <div className="space-y-0.5">
        {(["open", "high", "low", "close"] as const).map((k) => (
          <div key={k} className="flex items-center justify-between gap-4">
            <span
              style={{ color: "oklch(0.500 0.015 240)" }}
              className="uppercase"
            >
              {k}
            </span>
            <span
              className="font-mono font-medium"
              style={{
                color:
                  k === "close"
                    ? d.isGreen
                      ? "oklch(0.723 0.185 150)"
                      : "oklch(0.637 0.220 25)"
                    : "oklch(0.870 0.012 240)",
              }}
            >
              {formatPrice(d[k])}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BtcChart() {
  const [selectedInterval, setSelectedInterval] = useState<Interval>("1h");
  const [klines, setKlines] = useState<KlineBar[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceChange, setPriceChange] = useState(0);
  const [priceChangePercent, setPriceChangePercent] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const isMountedRef = useRef(true);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch candles only (no ticker — price comes from WebSocket)
  const fetchKlines = useCallback(
    async (iv: Interval, showRefresh = false) => {
      if (showRefresh) setRefreshing(true);
      try {
        const dzengiInterval = DZENGI_INTERVAL[iv];
        const symbol = "BTC/USD";

        const candlesRes = await fetch(
          `${DZENGI_MARKET_BASE}/candles?symbol=${encodeURIComponent(symbol)}&interval=${dzengiInterval}&limit=100`,
        );

        if (candlesRes.ok) {
          // Dzengi candle format: [timestamp_ms, open, high, low, close]
          const raw: [number, string, string, string, string][] =
            await candlesRes.json();
          const bars: KlineBar[] = raw.map((k) => {
            const o = Number.parseFloat(k[1]);
            const h = Number.parseFloat(k[2]);
            const l = Number.parseFloat(k[3]);
            const c = Number.parseFloat(k[4]);
            const isGreen = c >= o;
            return {
              time: formatTime(k[0], iv),
              open: o,
              high: h,
              low: l,
              close: c,
              candleRange: [l, h] as [number, number],
              bodyRange: [Math.min(o, c), Math.max(o, c)] as [number, number],
              isGreen,
            };
          });
          if (isMountedRef.current) {
            setKlines(bars);
            // Seed currentPrice from last candle only if WS hasn't connected yet
            if (bars.length > 0 && currentPrice === 0) {
              setCurrentPrice(bars[bars.length - 1].close);
            }
          }
        }
      } catch {
        // Silently fail — keep last known data
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [currentPrice],
  );

  // Effect: fetch candles when interval changes
  useEffect(() => {
    setLoading(true);
    fetchKlines(selectedInterval);
  }, [selectedInterval, fetchKlines]);

  // Effect: WebSocket for live price ticks (runs once on mount)
  useEffect(() => {
    isMountedRef.current = true;

    function connect() {
      if (!isMountedRef.current) return;

      const ws = new WebSocket("wss://stream.binance.com/ws/btcusdt@ticker");
      wsRef.current = ws;

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;
        try {
          const msg = JSON.parse(event.data as string);
          const price = Number.parseFloat(msg.c);
          const change = Number.parseFloat(msg.p);
          const changePct = Number.parseFloat(msg.P);
          setCurrentPrice(price);
          setPriceChange(change);
          setPriceChangePercent(changePct);
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (!isMountedRef.current) return;
        reconnectTimerRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        if (!isMountedRef.current) return;
        ws.close();
      };
    }

    connect();

    return () => {
      isMountedRef.current = false;
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

  const isPositive = priceChangePercent >= 0;

  const displayData = klines.map((k, i) => ({
    ...k,
    displayTime:
      i % Math.max(1, Math.floor(klines.length / 12)) === 0 ? k.time : "",
  }));

  const allPrices = klines.flatMap((k) => [k.low, k.high]);
  const pMin = allPrices.length ? Math.min(...allPrices) * 0.9995 : 0;
  const pMax = allPrices.length ? Math.max(...allPrices) * 1.0005 : 100000;

  return (
    <div
      className="rounded-2xl flex flex-col h-[440px] md:h-full md:min-h-[540px]"
      style={{
        background:
          "linear-gradient(145deg, oklch(0.155 0.020 240), oklch(0.148 0.018 240))",
        border: "1px solid oklch(1 0 0 / 0.08)",
        boxShadow:
          "0 4px 24px rgba(0,0,0,0.3), 0 1px 0 oklch(1 0 0 / 0.04) inset",
      }}
    >
      {/* Header */}
      <div
        className="px-5 pt-4 pb-3"
        style={{ borderBottom: "1px solid oklch(1 0 0 / 0.07)" }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="text-base font-semibold"
                style={{ color: "oklch(0.910 0.015 240)" }}
              >
                BTC / USD
              </span>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider"
                style={{
                  background: "oklch(0.785 0.135 200 / 0.15)",
                  color: "oklch(0.785 0.135 200)",
                }}
              >
                Dzengi
              </span>
            </div>
            <div className="flex items-end gap-3 mt-1">
              <span
                className="text-3xl font-bold tracking-tight"
                style={{ color: "oklch(0.960 0.010 240)" }}
              >
                {loading ? "\u2014" : formatPrice(currentPrice)}
              </span>
              {!loading && (
                <div
                  className="flex items-center gap-1 mb-1 text-sm font-semibold"
                  style={{
                    color: isPositive
                      ? "oklch(0.723 0.185 150)"
                      : "oklch(0.637 0.220 25)",
                  }}
                >
                  {isPositive ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  {isPositive ? "+" : ""}
                  {priceChange.toFixed(0)} ({isPositive ? "+" : ""}
                  {priceChangePercent.toFixed(2)}%)
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Interval selector */}
            <div
              className="flex flex-wrap items-center gap-0.5 p-1 rounded-xl"
              style={{
                background: "oklch(1 0 0 / 0.05)",
                border: "1px solid oklch(1 0 0 / 0.08)",
              }}
            >
              {INTERVALS.map((iv) => (
                <button
                  key={iv.value}
                  type="button"
                  data-ocid="chart.tab"
                  onClick={() => setSelectedInterval(iv.value)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background:
                      selectedInterval === iv.value
                        ? "oklch(0.785 0.135 200 / 0.2)"
                        : "transparent",
                    color:
                      selectedInterval === iv.value
                        ? "oklch(0.785 0.135 200)"
                        : "oklch(0.500 0.015 240)",
                    border:
                      selectedInterval === iv.value
                        ? "1px solid oklch(0.785 0.135 200 / 0.3)"
                        : "1px solid transparent",
                  }}
                >
                  {iv.label}
                </button>
              ))}
            </div>

            {/* Refresh */}
            <button
              type="button"
              data-ocid="chart.button"
              onClick={() => fetchKlines(selectedInterval, true)}
              className="p-2 rounded-lg transition-colors hover:bg-white/5"
              aria-label="Refresh chart"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
                style={{ color: "oklch(0.500 0.015 240)" }}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 px-2 py-3 min-h-0 min-h-[280px]">
        {loading ? (
          <Skeleton
            className="w-full h-full rounded-xl"
            style={{ background: "oklch(1 0 0 / 0.04)" }}
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={displayData}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="btcGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="oklch(0.785 0.135 200)"
                    stopOpacity={0.25}
                  />
                  <stop
                    offset="95%"
                    stopColor="oklch(0.785 0.135 200)"
                    stopOpacity={0.0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="oklch(1 0 0 / 0.05)"
                strokeDasharray="0"
                vertical={false}
              />
              <XAxis
                dataKey="displayTime"
                tick={{ fill: "oklch(0.450 0.012 240)", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval={0}
              />
              <YAxis
                domain={[pMin, pMax]}
                tick={{ fill: "oklch(0.450 0.012 240)", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                width={50}
                yAxisId="price"
              />
              <YAxis
                yAxisId="vol"
                orientation="right"
                tick={{ fill: "oklch(0.450 0.012 240)", fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                width={40}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CandleTooltip />} />
              {/* Close price area */}
              <Area
                dataKey="close"
                yAxisId="price"
                type="monotone"
                stroke="oklch(0.785 0.135 200)"
                strokeWidth={2}
                fill="url(#btcGradient)"
                dot={false}
                activeDot={{
                  r: 4,
                  fill: "oklch(0.785 0.135 200)",
                  stroke: "oklch(0.148 0.018 240)",
                  strokeWidth: 2,
                }}
              />
              {/* High line */}
              <Line
                dataKey="high"
                yAxisId="price"
                type="monotone"
                stroke="oklch(0.723 0.185 150 / 0.4)"
                strokeWidth={1}
                dot={false}
                strokeDasharray="2 2"
              />
              {/* Low line */}
              <Line
                dataKey="low"
                yAxisId="price"
                type="monotone"
                stroke="oklch(0.637 0.220 25 / 0.4)"
                strokeWidth={1}
                dot={false}
                strokeDasharray="2 2"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
