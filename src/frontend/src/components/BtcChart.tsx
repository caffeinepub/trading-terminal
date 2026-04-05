import { Skeleton } from "@/components/ui/skeleton";
import { useDzengiPriceFeed } from "@/hooks/useDzengiPriceFeed";
import { RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AssetSymbol } from "../App";

const DZENGI_MARKET_BASE = "https://demo-api-adapter.dzengi.com/api/v1";

interface KlineBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
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

const DZENGI_INTERVAL: Record<Interval, string> = {
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "1h": "1h",
  "4h": "4h",
  "1d": "1d",
};

const SYMBOL_LABELS: Record<AssetSymbol, { label: string; ticker: string }> = {
  "BTC/USD_LEVERAGE": { label: "BTC / USD", ticker: "BTC" },
  "ETH/USD_LEVERAGE": { label: "ETH / USD", ticker: "ETH" },
  "LTC/USD_LEVERAGE": { label: "LTC / USD", ticker: "LTC" },
};

const GREEN = "oklch(0.723 0.185 150)";
const RED = "oklch(0.637 0.220 25)";

// Chart padding
const PAD = { top: 10, right: 20, bottom: 30, left: 60 };

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

interface TooltipData {
  candle: KlineBar;
  x: number;
  y: number;
}

interface CandlestickChartProps {
  klines: KlineBar[];
  pMin: number;
  pMax: number;
  /** Ref that the parent updates directly to patch the last candle without state change */
  liveCloseRef: React.RefObject<number>;
}

/**
 * Pure chart canvas — memoized so it only re-renders when klines/pMin/pMax change.
 * Live price ticks are applied directly via DOM to the last candle body+wick
 * without touching React state at all.
 */
const CandlestickChart = memo(function CandlestickChart({
  klines,
  pMin,
  pMax,
  liveCloseRef,
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  // IDs for direct DOM patching of the last candle
  const LAST_BODY_ID = "chart-last-body";
  const LAST_WICK_ID = "chart-last-wick";

  // Observe container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });
    ro.observe(el);
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setDimensions({ width: rect.width, height: rect.height });
    }
    return () => ro.disconnect();
  }, []);

  // Subscribe to live price and patch last candle DOM directly — zero re-renders
  useEffect(() => {
    // We poll liveCloseRef via rAF so we don't need any state update
    let rafId: number;
    let lastPatched = -1;

    function patch() {
      const close = liveCloseRef.current;
      if (close > 0 && close !== lastPatched && klines.length > 0) {
        const last = klines[klines.length - 1];
        const { width, height } = dimensions;
        const chartW = Math.max(1, width - PAD.left - PAD.right);
        const chartH = Math.max(1, height - PAD.top - PAD.bottom);
        const priceToY = (p: number) => {
          if (pMax === pMin) return PAD.top + chartH / 2;
          return PAD.top + ((pMax - p) / (pMax - pMin)) * chartH;
        };

        const n = klines.length;
        const slotW = chartW / n;
        const bodyW = Math.max(1, slotW * 0.6);
        const cx = PAD.left + (n - 0.5) * slotW;
        const isGreen = close >= last.open;
        const color = isGreen ? GREEN : RED;

        const wickTop = priceToY(Math.max(last.high, close));
        const wickBottom = priceToY(last.low);
        const bodyTop = priceToY(Math.max(last.open, close));
        const bodyBottom = priceToY(Math.min(last.open, close));
        const bodyHeight = Math.max(1, bodyBottom - bodyTop);

        const bodyEl = document.getElementById(LAST_BODY_ID);
        const wickEl = document.getElementById(LAST_WICK_ID);

        if (bodyEl) {
          bodyEl.setAttribute("x", String(cx - bodyW / 2));
          bodyEl.setAttribute("y", String(bodyTop));
          bodyEl.setAttribute("width", String(bodyW));
          bodyEl.setAttribute("height", String(bodyHeight));
          bodyEl.setAttribute("fill", color);
        }
        if (wickEl) {
          wickEl.setAttribute("x1", String(cx));
          wickEl.setAttribute("y1", String(wickTop));
          wickEl.setAttribute("x2", String(cx));
          wickEl.setAttribute("y2", String(wickBottom));
          wickEl.setAttribute("stroke", color);
        }

        lastPatched = close;
      }
      rafId = requestAnimationFrame(patch);
    }

    rafId = requestAnimationFrame(patch);
    return () => cancelAnimationFrame(rafId);
  }, [klines, pMin, pMax, dimensions, liveCloseRef]);

  const { width, height } = dimensions;

  const chartW = Math.max(1, width - PAD.left - PAD.right);
  const chartH = Math.max(1, height - PAD.top - PAD.bottom);

  const priceToY = useCallback(
    (p: number) => {
      if (pMax === pMin) return PAD.top + chartH / 2;
      return PAD.top + ((pMax - p) / (pMax - pMin)) * chartH;
    },
    [pMin, pMax, chartH],
  );

  const yLabels = useMemo(() => {
    const count = 5;
    return Array.from({ length: count }, (_, i) => {
      const price = pMin + ((pMax - pMin) * i) / (count - 1);
      return { price, y: priceToY(price), key: `y-${i}` };
    });
  }, [pMin, pMax, priceToY]);

  const candles = useMemo(() => {
    if (!klines.length) return [];
    const n = klines.length;
    const slotW = chartW / n;
    const bodyW = Math.max(1, slotW * 0.6);

    return klines.map((k, i) => {
      const cx = PAD.left + (i + 0.5) * slotW;
      const wickTop = priceToY(k.high);
      const wickBottom = priceToY(k.low);
      const bodyTop = priceToY(Math.max(k.open, k.close));
      const bodyBottom = priceToY(Math.min(k.open, k.close));
      const bodyHeight = Math.max(1, bodyBottom - bodyTop);
      const color = k.isGreen ? GREEN : RED;
      const isLast = i === n - 1;

      return {
        key: `candle-${i}`,
        cx,
        slotW,
        bodyW,
        wickTop,
        wickBottom,
        bodyTop,
        bodyHeight,
        color,
        candle: k,
        hoverX: PAD.left + i * slotW,
        hoverY: PAD.top,
        hoverH: chartH,
        isLast,
      };
    });
  }, [klines, chartW, chartH, priceToY]);

  const xLabels = useMemo(() => {
    if (!klines.length) return [];
    const n = klines.length;
    const step = Math.max(1, Math.floor(n / 8));
    const slotW = chartW / n;
    const result: { label: string; x: number; key: string }[] = [];
    for (let i = 0; i < n; i += step) {
      result.push({
        label: klines[i].time,
        x: PAD.left + (i + 0.5) * slotW,
        key: `x-${i}`,
      });
    }
    return result;
  }, [klines, chartW]);

  const gridLines = yLabels.map((yl) => ({ y: yl.y, key: `grid-${yl.key}` }));

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGRectElement>, candle: KlineBar) => {
      setTooltip({ candle, x: e.clientX, y: e.clientY });
    },
    [],
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Candlestick chart"
        style={{ display: "block" }}
      >
        {/* Grid lines */}
        {gridLines.map((gl) => (
          <line
            key={gl.key}
            x1={PAD.left}
            y1={gl.y}
            x2={width - PAD.right}
            y2={gl.y}
            stroke="oklch(1 0 0 / 0.06)"
            strokeWidth={1}
          />
        ))}

        {/* Y-axis labels */}
        {yLabels.map((yl) => (
          <text
            key={yl.key}
            x={PAD.left - 6}
            y={yl.y}
            dominantBaseline="middle"
            textAnchor="end"
            fontSize={10}
            fill="oklch(0.450 0.012 240)"
          >
            ${(yl.price / 1000).toFixed(1)}k
          </text>
        ))}

        {/* X-axis labels */}
        {xLabels.map((xl) => (
          <text
            key={xl.key}
            x={xl.x}
            y={height - PAD.bottom + 14}
            textAnchor="middle"
            fontSize={9}
            fill="oklch(0.450 0.012 240)"
          >
            {xl.label}
          </text>
        ))}

        {/* Candles */}
        {candles.map((c) => (
          <g key={c.key}>
            {/* Wick — last candle gets an id for direct DOM patching */}
            <line
              id={c.isLast ? LAST_WICK_ID : undefined}
              x1={c.cx}
              y1={c.wickTop}
              x2={c.cx}
              y2={c.wickBottom}
              stroke={c.color}
              strokeWidth={1}
            />
            {/* Body — last candle gets an id for direct DOM patching */}
            <rect
              id={c.isLast ? LAST_BODY_ID : undefined}
              x={c.cx - c.bodyW / 2}
              y={c.bodyTop}
              width={c.bodyW}
              height={c.bodyHeight}
              fill={c.color}
              rx={0.5}
            />
            {/* Transparent hover area */}
            <rect
              x={c.hoverX}
              y={c.hoverY}
              width={c.slotW}
              height={c.hoverH}
              fill="transparent"
              onMouseMove={(e) => handleMouseMove(e, c.candle)}
              onMouseLeave={handleMouseLeave}
              style={{ cursor: "crosshair" }}
            />
          </g>
        ))}
      </svg>

      {/* HTML Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded-xl px-3 py-2.5 text-xs"
          style={{
            left: tooltip.x + 14,
            top: tooltip.y - 20,
            background: "oklch(0.168 0.020 240)",
            border: "1px solid oklch(1 0 0 / 0.12)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          <div
            className="font-semibold mb-1.5"
            style={{ color: "oklch(0.910 0.015 240)" }}
          >
            {tooltip.candle.time}
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
                        ? tooltip.candle.isGreen
                          ? GREEN
                          : RED
                        : "oklch(0.870 0.012 240)",
                  }}
                >
                  {formatPrice(tooltip.candle[k])}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

/**
 * Price header — isolated component that subscribes to the price feed.
 * Re-renders on every price tick but is completely separate from the chart canvas.
 */
const ChartPriceHeader = memo(function ChartPriceHeader({
  symbol,
  seedPrice,
  seedChange,
  liveCloseRef,
  isLoading,
  onPriceUpdate,
}: {
  symbol: AssetSymbol;
  seedPrice: number;
  seedChange: number;
  liveCloseRef: React.RefObject<number>;
  isLoading: boolean;
  /** Notify parent when we have a fresh price so it can store into liveCloseRef */
  onPriceUpdate: (price: number, change: number, open: number) => void;
}) {
  const { prices } = useDzengiPriceFeed();
  const feed = prices[symbol];

  const currentPrice = feed?.price ?? seedPrice;
  const priceChangePercent = feed?.change24h ?? seedChange;
  const priceChange = feed && feed.open > 0 ? feed.price - feed.open : 0;
  const isPositive = priceChangePercent >= 0;

  const info = SYMBOL_LABELS[symbol];

  // Write live price into the ref (no setState — chart canvas reads via rAF)
  useEffect(() => {
    if (currentPrice > 0) {
      liveCloseRef.current = currentPrice;
      onPriceUpdate(currentPrice, priceChangePercent, feed?.open ?? 0);
    }
  }, [currentPrice, priceChangePercent, feed, liveCloseRef, onPriceUpdate]);

  return (
    <div>
      <div className="flex items-center gap-2">
        <span
          className="text-base font-semibold"
          style={{ color: "oklch(0.910 0.015 240)" }}
        >
          {info.label}
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
          {isLoading ? "\u2014" : formatPrice(currentPrice)}
        </span>
        {!isLoading && (
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
  );
});

interface BtcChartProps {
  symbol: AssetSymbol;
}

export function BtcChart({ symbol }: BtcChartProps) {
  const [selectedInterval, setSelectedInterval] = useState<Interval>("1h");
  const [klines, setKlines] = useState<KlineBar[]>([]);
  const [loading, setLoading] = useState(true);
  const [seedPrice, setSeedPrice] = useState(0);
  const [seedChange, setSeedChange] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const isMountedRef = useRef(true);

  /**
   * Ref that holds the latest live close price.
   * Written by ChartPriceHeader (which re-renders on each tick).
   * Read by CandlestickChart via rAF to directly patch the last candle DOM —
   * so the chart SVG never goes through React reconciliation on a price tick.
   */
  const liveCloseRef = useRef<number>(0);

  const handlePriceUpdate = useCallback(
    (price: number, _change: number, _open: number) => {
      liveCloseRef.current = price;
    },
    [],
  );

  // Reset state when symbol changes (liveCloseRef is a ref — set directly outside effect)
  // biome-ignore lint/correctness/useExhaustiveDependencies: liveCloseRef is a ref, not reactive
  useEffect(() => {
    setKlines([]);
    setLoading(true);
    setSeedPrice(0);
    setSeedChange(0);
    liveCloseRef.current = 0;
  }, [symbol]);

  // Fetch current ticker price as seed (runs on symbol change)
  useEffect(() => {
    async function fetchSeedPrice() {
      try {
        const res = await fetch(
          `${DZENGI_MARKET_BASE}/ticker/24hr?symbol=${encodeURIComponent(symbol)}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        // The endpoint may return an array or a single object depending on query
        const entry = Array.isArray(data)
          ? data.find((d: Record<string, unknown>) => d.symbol === symbol)
          : data;
        const p = Number.parseFloat(String(entry?.lastPrice ?? "0"));
        const pct = Number.parseFloat(String(entry?.priceChangePercent ?? "0"));
        if (p > 0 && isMountedRef.current) {
          setSeedPrice(p);
          setSeedChange(pct);
          liveCloseRef.current = p;
        }
      } catch {
        // Silently fail
      }
    }
    fetchSeedPrice();
  }, [symbol]);

  const fetchKlines = useCallback(
    async (iv: Interval, showRefresh = false) => {
      if (showRefresh) setRefreshing(true);
      try {
        const dzengiInterval = DZENGI_INTERVAL[iv];
        const candlesRes = await fetch(
          `${DZENGI_MARKET_BASE}/klines?symbol=${encodeURIComponent(symbol)}&interval=${dzengiInterval}&limit=100`,
        );

        if (candlesRes.ok) {
          const raw: unknown = await candlesRes.json();
          const items: [number, string, string, string, string, number][] =
            Array.isArray(raw)
              ? (raw as [number, string, string, string, string, number][])
              : ((
                  raw as {
                    results?: [
                      number,
                      string,
                      string,
                      string,
                      string,
                      number,
                    ][];
                  }
                ).results ?? []);
          const bars: KlineBar[] = items.map((k) => {
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
              isGreen,
            };
          });
          if (isMountedRef.current) {
            setKlines(bars);
            if (bars.length > 0 && liveCloseRef.current <= 0) {
              liveCloseRef.current = bars[bars.length - 1].close;
              setSeedPrice(bars[bars.length - 1].close);
            }
          }
        }
      } catch {
        // Silently fail
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [symbol],
  );

  useEffect(() => {
    setLoading(true);
    fetchKlines(selectedInterval);
  }, [selectedInterval, fetchKlines]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // pMin/pMax computed from klines only — never changes on a price tick
  const { pMin, pMax } = useMemo(() => {
    const allPrices = klines.flatMap((k) => [k.low, k.high]);
    return {
      pMin: allPrices.length ? Math.min(...allPrices) * 0.9995 : 0,
      pMax: allPrices.length ? Math.max(...allPrices) * 1.0005 : 100000,
    };
  }, [klines]);

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
          {/* Price header — re-renders on price tick, isolated from chart */}
          <ChartPriceHeader
            symbol={symbol}
            seedPrice={seedPrice}
            seedChange={seedChange}
            liveCloseRef={liveCloseRef}
            isLoading={loading}
            onPriceUpdate={handlePriceUpdate}
          />

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

      {/* Chart area */}
      <div className="flex-1 px-2 py-3 min-h-0">
        {loading ? (
          <Skeleton
            className="w-full h-full rounded-xl"
            style={{ background: "oklch(1 0 0 / 0.04)" }}
          />
        ) : (
          <CandlestickChart
            klines={klines}
            pMin={pMin}
            pMax={pMax}
            liveCloseRef={liveCloseRef}
          />
        )}
      </div>
    </div>
  );
}
