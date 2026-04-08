import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  BarChart2,
  DollarSign,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import type {
  MacroAssetState,
  OpenInterestState,
  Us10yState,
} from "../hooks/useAnalysisData";
import { useAnalysisData } from "../hooks/useAnalysisData";

// ---- Helpers ----
function fmtNum(n: number, decimals = 2): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("en-US");
}

function fmtOIUsd(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString("en-US")}`;
}

function fmtRate(rate: number): string {
  const sign = rate >= 0 ? "+" : "";
  return `${sign}${(rate * 100).toFixed(4)}%`;
}

function calcChange(price: number, prevClose: number): number {
  if (!prevClose) return 0;
  return ((price - prevClose) / prevClose) * 100;
}

function useCountdown(targetMs: number): string {
  const [label, setLabel] = useState("");
  useEffect(() => {
    function update() {
      const diff = targetMs - Date.now();
      if (diff <= 0) {
        setLabel("settling...");
        return;
      }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      if (h > 0) setLabel(`${h}h ${m}m ${s}s`);
      else if (m > 0) setLabel(`${m}m ${s}s`);
      else setLabel(`${s}s`);
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetMs]);
  return label;
}

function useFngCountdown(seconds: number): string {
  const [label, setLabel] = useState("");
  useEffect(() => {
    if (!seconds) return;
    let remaining = seconds;
    function update() {
      if (remaining <= 0) {
        setLabel("updating...");
        return;
      }
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      setLabel(m > 0 ? `${m}m ${s}s` : `${s}s`);
      remaining -= 1;
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [seconds]);
  return label;
}

// ---- Fear & Greed gauge color ----
function fngColor(value: number): string {
  if (value <= 25) return "oklch(0.637 0.220 25)";
  if (value <= 45) return "oklch(0.720 0.185 55)";
  if (value <= 55) return "oklch(0.820 0.160 90)";
  if (value <= 75) return "oklch(0.780 0.185 145)";
  return "oklch(0.723 0.185 150)";
}

// ---- SVG Arc Gauge ----
interface GaugeProps {
  value: number;
  loading: boolean;
}

function FearGreedGauge({ value, loading }: GaugeProps) {
  const cx = 65;
  const cy = 70;
  const r = 55;
  const GAP_DEG = 2.5;
  const segSpan = (180 - 4 * GAP_DEG) / 5;

  const SEGMENTS = [
    { color: "#EA3943" },
    { color: "#EA8C00" },
    { color: "#F3D42F" },
    { color: "#93D900" },
    { color: "#16C784" },
  ];

  function polarToXY(angleDeg: number) {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
  }

  function arcPath(startAngle: number, endAngle: number) {
    const p1 = polarToXY(startAngle);
    const p2 = polarToXY(endAngle);
    return `M ${p1.x.toFixed(4)} ${p1.y.toFixed(4)} A ${r} ${r} 0 0 0 ${p2.x.toFixed(4)} ${p2.y.toFixed(4)}`;
  }

  const needleAngle = 180 - (value / 100) * 180;
  const needlePt = polarToXY(needleAngle);

  return (
    <div
      style={{
        position: "relative",
        width: 130,
        height: 75,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-end",
      }}
    >
      <svg width="130" height="75" viewBox="0 0 130 75" aria-hidden="true">
        {SEGMENTS.map((seg, i) => {
          const startAngle = 180 - i * (segSpan + GAP_DEG);
          const endAngle = startAngle - segSpan;
          return (
            <path
              key={seg.color}
              d={arcPath(startAngle, endAngle)}
              stroke={seg.color}
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />
          );
        })}
        {!loading && (
          <>
            <circle
              cx={needlePt.x}
              cy={needlePt.y}
              r="6"
              fill="none"
              stroke="white"
              strokeWidth="2"
              style={{ transition: "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)" }}
            />
            <circle
              cx={needlePt.x}
              cy={needlePt.y}
              r="5"
              fill="black"
              style={{ transition: "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)" }}
            />
          </>
        )}
      </svg>
    </div>
  );
}

// ---- 52-week range bar ----
interface RangeBarProps {
  price: number;
  low52w: number;
  high52w: number;
}

function RangeBar({ price, low52w, high52w }: RangeBarProps) {
  const range = high52w - low52w;
  const pct = range > 0 ? ((price - low52w) / range) * 100 : 50;
  const clampedPct = Math.min(100, Math.max(0, pct));

  return (
    <div className="mt-3">
      <div
        className="flex justify-between text-[10px] mb-1"
        style={{ color: "oklch(0.450 0.015 240)" }}
      >
        <span>{low52w > 0 ? fmtNum(low52w) : "\u2014"}</span>
        <span
          className="text-[9px] uppercase tracking-wider"
          style={{ color: "oklch(0.500 0.015 240)" }}
        >
          52W Range
        </span>
        <span>{high52w > 0 ? fmtNum(high52w) : "\u2014"}</span>
      </div>
      <div
        className="relative h-1 rounded-full"
        style={{ background: "oklch(1 0 0 / 0.08)" }}
      >
        <div
          className="absolute h-full rounded-full"
          style={{
            width: `${clampedPct}%`,
            background:
              "linear-gradient(90deg, oklch(0.637 0.220 25 / 0.6), oklch(0.785 0.135 200 / 0.7))",
          }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2"
          style={{
            left: `calc(${clampedPct}% - 5px)`,
            background: "oklch(0.910 0.015 240)",
            borderColor: "oklch(0.785 0.135 200)",
            boxShadow: "0 0 6px oklch(0.785 0.135 200 / 0.6)",
          }}
        />
      </div>
    </div>
  );
}

// ---- Macro card ----
interface MacroCardProps {
  label: string;
  ticker: string;
  data: MacroAssetState;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  icon: React.ReactNode;
  show52wRange?: boolean;
}

function MacroCard({
  label,
  ticker,
  data,
  prefix = "$",
  suffix = "",
  decimals = 2,
  icon,
  show52wRange = true,
}: MacroCardProps) {
  const change = calcChange(data.price, data.prevClose);
  const isPositive = change >= 0;
  const color = isPositive ? "oklch(0.723 0.185 150)" : "oklch(0.637 0.220 25)";

  return (
    <div
      className="rounded-xl p-3 sm:p-4 flex flex-col gap-1 min-w-0 overflow-hidden"
      style={{
        background: "oklch(0.155 0.020 240)",
        border: "1px solid oklch(1 0 0 / 0.08)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: "oklch(0.785 0.135 200 / 0.12)",
              color: "oklch(0.785 0.135 200)",
            }}
          >
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="text-xs font-semibold truncate"
              style={{ color: "oklch(0.910 0.015 240)" }}
            >
              {label}
            </div>
            <div
              className="text-[10px] font-mono truncate"
              style={{ color: "oklch(0.450 0.015 240)" }}
            >
              {ticker}
            </div>
          </div>
        </div>
        {data.loading ? (
          <Skeleton
            className="h-4 w-12 sm:w-16 rounded shrink-0"
            style={{ background: "oklch(1 0 0 / 0.06)" }}
          />
        ) : data.error ? (
          <span
            className="text-xs shrink-0"
            style={{ color: "oklch(0.450 0.015 240)" }}
          >
            {"\u2013"}
          </span>
        ) : (
          <div
            className="flex items-center gap-1 text-xs font-semibold shrink-0"
            style={{ color }}
          >
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>
              {isPositive ? "+" : ""}
              {change.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {/* Price */}
      {data.loading ? (
        <Skeleton
          className="h-7 w-24 sm:w-28 rounded mt-1"
          style={{ background: "oklch(1 0 0 / 0.06)" }}
        />
      ) : data.error ? (
        <span
          className="text-sm sm:text-base font-mono font-bold truncate"
          style={{ color: "oklch(0.450 0.015 240)" }}
        >
          unavailable
        </span>
      ) : (
        <div
          className="font-mono font-bold text-base sm:text-xl mt-0.5 truncate min-w-0"
          style={{ color: "oklch(0.910 0.015 240)" }}
        >
          {prefix}
          {fmtNum(data.price, decimals)}
          {suffix}
        </div>
      )}

      {/* Range bar */}
      {show52wRange && !data.loading && !data.error && data.high52w > 0 && (
        <RangeBar
          price={data.price}
          low52w={data.low52w}
          high52w={data.high52w}
        />
      )}
    </div>
  );
}

// ---- Funding card ----
interface FundingCardProps {
  asset: "BTC" | "ETH";
  rate: number;
  nextSettlement: number;
  intervalHours: number;
  loading: boolean;
  error: boolean;
}

function FundingCard({
  asset,
  rate,
  nextSettlement,
  intervalHours,
  loading,
  error,
}: FundingCardProps) {
  const countdown = useCountdown(nextSettlement);

  let rateColor = "oklch(0.550 0.015 240)";
  let sentiment: "bearish" | "bullish" | "neutral" = "neutral";
  if (!loading && !error) {
    if (Math.abs(rate) < 0.00001) {
      rateColor = "oklch(0.550 0.015 240)";
      sentiment = "neutral";
    } else if (rate > 0) {
      rateColor = "oklch(0.637 0.220 25)";
      sentiment = "bearish";
    } else {
      rateColor = "oklch(0.723 0.185 150)";
      sentiment = "bullish";
    }
  }

  const sentimentConfig = {
    bearish: {
      label: "Bearish",
      subtext: "Longs pay shorts",
      bg: "oklch(0.637 0.220 25 / 0.12)",
      border: "oklch(0.637 0.220 25 / 0.30)",
      color: "oklch(0.637 0.220 25)",
    },
    bullish: {
      label: "Bullish",
      subtext: "Shorts pay longs",
      bg: "oklch(0.723 0.185 150 / 0.12)",
      border: "oklch(0.723 0.185 150 / 0.30)",
      color: "oklch(0.723 0.185 150)",
    },
    neutral: {
      label: "Neutral",
      subtext: "Market balanced",
      bg: "oklch(0.550 0.015 240 / 0.12)",
      border: "oklch(0.550 0.015 240 / 0.30)",
      color: "oklch(0.600 0.015 240)",
    },
  };
  const sc = sentimentConfig[sentiment];

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2 flex-1 min-w-0"
      style={{
        background: "oklch(0.155 0.020 240)",
        border: "1px solid oklch(1 0 0 / 0.08)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background: "oklch(0.785 0.135 200 / 0.12)",
              color: "oklch(0.785 0.135 200)",
            }}
          >
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <div
              className="text-xs font-semibold"
              style={{ color: "oklch(0.910 0.015 240)" }}
            >
              {asset} Funding Rate
            </div>
            <div
              className="text-[10px]"
              style={{ color: "oklch(0.450 0.015 240)" }}
            >
              {asset}USDT PERP
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {!loading && !error && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: sc.bg,
                color: sc.color,
                border: `1px solid ${sc.border}`,
              }}
            >
              {sc.label}
            </span>
          )}
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: "oklch(0.785 0.135 200 / 0.10)",
              color: "oklch(0.785 0.135 200)",
              border: "1px solid oklch(0.785 0.135 200 / 0.25)",
            }}
          >
            Binance
          </span>
        </div>
      </div>

      {loading ? (
        <Skeleton
          className="h-8 w-24 rounded"
          style={{ background: "oklch(1 0 0 / 0.06)" }}
        />
      ) : error ? (
        <span
          className="text-2xl font-mono font-bold"
          style={{ color: "oklch(0.450 0.015 240)" }}
        >
          {"\u2013"}
        </span>
      ) : (
        <div className="flex flex-col gap-0.5">
          <div
            className="font-mono font-bold text-2xl"
            style={{ color: rateColor }}
          >
            {fmtRate(rate)}
          </div>
          <div className="text-[11px] font-medium" style={{ color: sc.color }}>
            {sc.subtext}
          </div>
        </div>
      )}

      <div
        className="flex items-center gap-1.5 text-[11px]"
        style={{ color: "oklch(0.500 0.015 240)" }}
      >
        <span className="uppercase tracking-wider text-[10px]">
          Next settlement
        </span>
        {loading ? (
          <Skeleton
            className="h-3 w-12 rounded"
            style={{ background: "oklch(1 0 0 / 0.06)" }}
          />
        ) : (
          <span
            className="font-mono"
            style={{ color: "oklch(0.720 0.015 240)" }}
          >
            {countdown || "\u2013"}
          </span>
        )}
      </div>

      <div
        className="flex items-center gap-1.5 text-[11px]"
        style={{ color: "oklch(0.500 0.015 240)" }}
      >
        <span className="uppercase tracking-wider text-[10px]">Interval</span>
        {loading ? (
          <Skeleton
            className="h-3 w-10 rounded"
            style={{ background: "oklch(1 0 0 / 0.06)" }}
          />
        ) : (
          <span
            className="font-mono"
            style={{ color: "oklch(0.720 0.015 240)" }}
          >
            every {intervalHours}h
          </span>
        )}
      </div>
    </div>
  );
}

// ---- OI Sparkline ----
interface SparklineProps {
  data: number[];
  color?: string;
}

function OISparkline({
  data,
  color = "oklch(0.785 0.135 200)",
}: SparklineProps) {
  if (!data || data.length < 2) return null;

  const W = 200;
  const H = 48;
  const pad = 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2);
    const y = H - pad - ((v - min) / range) * (H - pad * 2);
    return `${x},${y}`;
  });

  const polylinePoints = points.join(" ");
  const firstX = pad;
  const lastX = pad + (W - pad * 2);
  const fillPath = `M ${points[0]} L ${points.join(" L ")} L ${lastX},${H - pad} L ${firstX},${H - pad} Z`;
  const gradientId = `sparkline-grad-${Math.random().toString(36).slice(2, 7)}`;

  return (
    <svg
      width="100%"
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${gradientId})`} />
      <polyline
        points={polylinePoints}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---- Open Interest card ----
interface OICardProps {
  asset: "BTC" | "ETH";
  data: OpenInterestState;
}

function OICard({ asset, data }: OICardProps) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2 flex-1 min-w-0"
      style={{
        background: "oklch(0.155 0.020 240)",
        border: "1px solid oklch(1 0 0 / 0.08)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background: "oklch(0.785 0.135 200 / 0.12)",
              color: "oklch(0.785 0.135 200)",
            }}
          >
            <BarChart2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <div
              className="text-xs font-semibold"
              style={{ color: "oklch(0.910 0.015 240)" }}
            >
              {asset} Open Interest
            </div>
            <div
              className="text-[10px]"
              style={{ color: "oklch(0.450 0.015 240)" }}
            >
              {asset}USDT PERP
            </div>
          </div>
        </div>
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{
            background: "oklch(0.785 0.135 200 / 0.10)",
            color: "oklch(0.785 0.135 200)",
            border: "1px solid oklch(0.785 0.135 200 / 0.25)",
          }}
        >
          Binance
        </span>
      </div>

      {data.loading ? (
        <Skeleton
          className="h-8 w-28 rounded"
          style={{ background: "oklch(1 0 0 / 0.06)" }}
        />
      ) : data.error ? (
        <span
          className="text-2xl font-mono font-bold"
          style={{ color: "oklch(0.450 0.015 240)" }}
        >
          {"\u2013"}
        </span>
      ) : (
        <div
          className="font-mono font-bold text-2xl"
          style={{ color: "oklch(0.910 0.015 240)" }}
        >
          {fmtOIUsd(data.oiUsd)}
        </div>
      )}

      {!data.loading && !data.error && (
        <div
          className="text-[11px] font-mono"
          style={{ color: "oklch(0.500 0.015 240)" }}
        >
          {fmtCompact(data.oiCcy)} {asset}
        </div>
      )}

      {data.loading ? (
        <Skeleton
          className="h-12 w-full rounded"
          style={{ background: "oklch(1 0 0 / 0.06)" }}
        />
      ) : data.history.length >= 2 ? (
        <div className="mt-1">
          <OISparkline data={data.history} />
        </div>
      ) : null}

      {!data.loading && (
        <div
          className="text-[10px] uppercase tracking-wider"
          style={{ color: "oklch(0.450 0.015 240)" }}
        >
          48h trend
        </div>
      )}
    </div>
  );
}

// ---- US10Y Sparkline with x-axis date labels ----
interface Us10ySparklineProps {
  data: number[];
  dates: string[];
  color: string;
}

function Us10ySparkline({ data, dates, color }: Us10ySparklineProps) {
  if (!data || data.length < 1) return null;

  const W = 300;
  const H = 80;
  const padX = 2;
  const padY = 8;

  // For a single point, render a flat horizontal line at the midpoint
  const effectiveData = data.length === 1 ? [data[0], data[0]] : data;
  const effectiveDates = data.length === 1 ? [dates[0] ?? ""] : dates;

  const min = Math.min(...effectiveData) - 0.02;
  const max = Math.max(...effectiveData) + 0.02;
  const range = max - min || 0.1;

  const pts = effectiveData.map((v, i) => {
    const x = padX + (i / (effectiveData.length - 1)) * (W - padX * 2);
    const y = H - padY - ((v - min) / range) * (H - padY * 2);
    return { x, y };
  });

  const polylinePoints = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const innerPoints = pts.map((p) => `L ${p.x},${p.y}`).join(" ");
  const fillPath = `M ${pts[0].x},${pts[0].y} ${innerPoints} L ${pts[pts.length - 1].x},${H - padY} L ${pts[0].x},${H - padY} Z`;

  const gradId = `us10y-grad-${Math.random().toString(36).slice(2, 7)}`;

  // Show at most 7 date labels, one per point
  const labelIndices =
    effectiveDates.length <= 7
      ? effectiveDates.map((_, i) => i)
      : [
          0,
          Math.floor(effectiveDates.length / 3),
          Math.floor((2 * effectiveDates.length) / 3),
          effectiveDates.length - 1,
        ];

  return (
    <div className="w-full">
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.30" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fillPath} fill={`url(#${gradId})`} />
        <polyline
          points={polylinePoints}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Dot on last point */}
        <circle
          cx={pts[pts.length - 1].x}
          cy={pts[pts.length - 1].y}
          r="3"
          fill={color}
        />
      </svg>
      {/* X-axis labels */}
      {effectiveDates.length > 0 && (
        <div className="relative w-full" style={{ height: 16 }}>
          {labelIndices.map((idx) => {
            if (!effectiveDates[idx]) return null;
            const pct = (idx / (effectiveData.length - 1)) * 100;
            return (
              <span
                key={idx}
                className="absolute text-[9px] font-mono -translate-x-1/2"
                style={{
                  left: `${pct}%`,
                  top: 0,
                  color: "oklch(0.450 0.015 240)",
                  whiteSpace: "nowrap",
                }}
              >
                {effectiveDates[idx]}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---- US 10Y Treasury section card ----
interface Us10ySectionProps {
  data: Us10yState;
}

function historySourceLabel(source: Us10yState["historySource"]): string {
  switch (source) {
    case "FRED":
      return "FRED";
    case "Treasury":
      return "US Treasury";
    case "moneymatter":
      return "moneymatter";
    case "canister":
      return "Accumulated";
    default:
      return "US Treasury";
  }
}

function Us10ySection({ data }: Us10ySectionProps) {
  const { current, history, dates } = data;
  const prev = history.length >= 2 ? history[0] : current;
  const delta = current - prev;
  const isDown = delta <= 0; // yield falling = bullish (green)
  const sparkColor = isDown
    ? "oklch(0.723 0.185 150)"
    : "oklch(0.637 0.220 25)";
  const deltaColor = isDown
    ? "oklch(0.723 0.185 150)"
    : "oklch(0.637 0.220 25)";
  const deltaSign = delta > 0 ? "+" : "";
  const srcLabel = historySourceLabel(data.historySource);

  return (
    <div
      className="rounded-xl p-4 sm:p-5 flex flex-col gap-3"
      style={{
        background: "oklch(0.155 0.020 240)",
        border: "1px solid oklch(1 0 0 / 0.08)",
      }}
    >
      {/* Top row: yield value + delta */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          {data.loading ? (
            <Skeleton
              className="h-10 w-24 rounded"
              style={{ background: "oklch(1 0 0 / 0.06)" }}
            />
          ) : data.error ? (
            <span
              className="text-3xl font-mono font-bold"
              style={{ color: "oklch(0.450 0.015 240)" }}
            >
              unavailable
            </span>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span
                  className="font-mono font-black text-3xl sm:text-4xl"
                  style={{ color: "oklch(0.910 0.015 240)" }}
                >
                  {fmtNum(current, 2)}%
                </span>
                {history.length >= 2 && (
                  <span
                    className="flex items-center gap-1 text-sm font-semibold font-mono"
                    style={{ color: deltaColor }}
                  >
                    {isDown ? (
                      <TrendingDown className="w-3.5 h-3.5" />
                    ) : (
                      <TrendingUp className="w-3.5 h-3.5" />
                    )}
                    {deltaSign}
                    {fmtNum(delta, 2)}%
                  </span>
                )}
              </div>
              <div
                className="text-[11px] mt-0.5"
                style={{ color: "oklch(0.500 0.015 240)" }}
              >
                {`7-day change from ${history.length >= 2 ? `${fmtNum(prev, 2)}%` : "—"}`}
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!data.loading && !data.error && (
            <div
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: "oklch(0.785 0.135 200 / 0.07)",
                color: "oklch(0.600 0.015 240)",
                border: "1px solid oklch(1 0 0 / 0.10)",
              }}
            >
              {`Source: ${srcLabel}`}
            </div>
          )}
          <div
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full self-start"
            style={{
              background: "oklch(0.785 0.135 200 / 0.10)",
              color: "oklch(0.785 0.135 200)",
              border: "1px solid oklch(0.785 0.135 200 / 0.25)",
            }}
          >
            US Treasury
          </div>
        </div>
      </div>

      {/* Sparkline */}
      {data.loading ? (
        <Skeleton
          className="h-20 w-full rounded"
          style={{ background: "oklch(1 0 0 / 0.06)" }}
        />
      ) : !data.error && history.length >= 2 ? (
        <Us10ySparkline data={history} dates={dates} color={sparkColor} />
      ) : !data.error && history.length === 1 ? (
        <Us10ySparkline data={history} dates={dates} color={sparkColor} />
      ) : !data.error && history.length === 0 && current > 0 ? (
        <div
          className="text-[11px] italic"
          style={{ color: "oklch(0.450 0.015 240)" }}
        >
          Building 7-day history — check back tomorrow as daily readings
          accumulate
        </div>
      ) : null}

      {/* Interpretation note */}
      {!data.loading && !data.error && (
        <p
          className="text-[11px] italic"
          style={{ color: "oklch(0.450 0.015 240)" }}
        >
          {isDown
            ? "Yields falling \u2014 typically bullish for equities and bonds."
            : "Yields rising \u2014 increases borrowing costs, typically bearish pressure on risk assets."}
        </p>
      )}
    </div>
  );
}

// ---- Section header ----
function SectionHeader({
  title,
  subtitle,
  badge,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex flex-col gap-0.5">
        <h2
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: "oklch(0.612 0.020 240)" }}
        >
          {title}
        </h2>
        {subtitle && (
          <span
            className="text-[10px]"
            style={{ color: "oklch(0.450 0.015 240)" }}
          >
            {subtitle}
          </span>
        )}
      </div>
      {badge && (
        <span
          className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0"
          style={{
            background: "oklch(0.785 0.135 200 / 0.10)",
            color: "oklch(0.785 0.135 200)",
            border: "1px solid oklch(0.785 0.135 200 / 0.20)",
          }}
        >
          {badge}
        </span>
      )}
      <div
        className="flex-1 h-px"
        style={{ background: "oklch(1 0 0 / 0.07)" }}
      />
    </div>
  );
}

// ---- Main component ----
export function AnalysisPanel() {
  const data = useAnalysisData();
  const fngCountdown = useFngCountdown(data.fearGreed.timeUntilUpdate);
  const { fearGreed } = data;
  const fgColor = fngColor(fearGreed.value);

  return (
    <div
      className="rounded-2xl"
      style={{
        background:
          "linear-gradient(145deg, oklch(0.155 0.020 240), oklch(0.148 0.018 240))",
        border: "1px solid oklch(1 0 0 / 0.08)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
      }}
      data-ocid="analysis.panel"
    >
      {/* Panel header */}
      <div
        className="px-4 sm:px-6 py-4"
        style={{ borderBottom: "1px solid oklch(1 0 0 / 0.07)" }}
      >
        <div className="flex items-center gap-3">
          <BarChart2
            className="w-5 h-5"
            style={{ color: "oklch(0.785 0.135 200)" }}
          />
          <h1
            className="text-base font-semibold"
            style={{ color: "oklch(0.910 0.015 240)" }}
          >
            Market Analysis
          </h1>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider"
            style={{
              background: "oklch(0.723 0.185 150 / 0.12)",
              color: "oklch(0.723 0.185 150)",
              border: "1px solid oklch(0.723 0.185 150 / 0.30)",
            }}
          >
            Live
          </span>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4 sm:py-6 flex flex-col gap-8 md:gap-10">
        {/* ===== Section 1: Market Sentiment ===== */}
        <section data-ocid="analysis.section">
          <SectionHeader title="Market Sentiment" badge="alternative.me" />
          <div className="flex flex-col lg:flex-row items-start gap-4 sm:gap-6">
            {/* Gauge card */}
            <div
              className="rounded-xl p-4 sm:p-5 flex flex-col items-center w-full lg:w-auto"
              style={{
                background: "oklch(0.145 0.018 240)",
                border: "1px solid oklch(1 0 0 / 0.08)",
                minWidth: "220px",
              }}
            >
              {fearGreed.loading ? (
                <div className="flex flex-col items-center gap-4 py-4">
                  <Skeleton
                    className="w-[130px] h-[75px] rounded-xl"
                    style={{ background: "oklch(1 0 0 / 0.06)" }}
                  />
                  <Skeleton
                    className="h-10 w-20 rounded"
                    style={{ background: "oklch(1 0 0 / 0.06)" }}
                  />
                </div>
              ) : fearGreed.error ? (
                <div
                  className="py-10 text-sm"
                  style={{ color: "oklch(0.450 0.015 240)" }}
                >
                  unavailable
                </div>
              ) : (
                <>
                  <div className="flex justify-center w-full">
                    <FearGreedGauge
                      value={fearGreed.value}
                      loading={fearGreed.loading}
                    />
                  </div>
                  <div className="text-center mt-2">
                    <div
                      className="font-mono font-black text-5xl"
                      style={{ color: fgColor }}
                    >
                      {fearGreed.value}
                    </div>
                    <div
                      className="text-sm font-semibold mt-1"
                      style={{ color: fgColor }}
                    >
                      {fearGreed.label}
                    </div>
                    {fngCountdown && (
                      <div
                        className="text-[11px] mt-2"
                        style={{ color: "oklch(0.500 0.015 240)" }}
                      >
                        Next update in {fngCountdown}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Scale legend */}
              <div className="mt-4 w-full">
                <div
                  className="text-[10px] font-semibold uppercase tracking-wider mb-2 text-center"
                  style={{ color: "oklch(0.500 0.015 240)" }}
                >
                  Scale
                </div>
                <div
                  className="h-2 rounded-full w-full"
                  style={{
                    background:
                      "linear-gradient(90deg, #EA3943, #EA8C00, #F3D42F, #93D900, #16C784)",
                  }}
                />
                <div className="flex justify-between mt-1.5">
                  <span
                    className="text-[9px] font-medium"
                    style={{ color: "#EA3943" }}
                  >
                    Extreme Fear
                  </span>
                  <span
                    className="text-[9px] font-medium"
                    style={{ color: "#F3D42F" }}
                  >
                    Neutral
                  </span>
                  <span
                    className="text-[9px] font-medium"
                    style={{ color: "#16C784" }}
                  >
                    Extreme Greed
                  </span>
                </div>
                <div className="flex justify-between mt-0.5">
                  <span
                    className="text-[9px] font-mono"
                    style={{ color: "oklch(0.450 0.015 240)" }}
                  >
                    0
                  </span>
                  <span
                    className="text-[9px] font-mono"
                    style={{ color: "oklch(0.450 0.015 240)" }}
                  >
                    50
                  </span>
                  <span
                    className="text-[9px] font-mono"
                    style={{ color: "oklch(0.450 0.015 240)" }}
                  >
                    100
                  </span>
                </div>
              </div>
            </div>

            {/* Sentiment description */}
            <div className="flex-1 min-w-0 w-full lg:w-auto">
              <div
                className="rounded-xl p-4 sm:p-5 h-full"
                style={{
                  background: "oklch(0.145 0.018 240)",
                  border: "1px solid oklch(1 0 0 / 0.08)",
                }}
              >
                <div
                  className="text-xs font-semibold uppercase tracking-wider mb-3"
                  style={{ color: "oklch(0.612 0.020 240)" }}
                >
                  About This Index
                </div>
                <div
                  className="space-y-2 text-sm"
                  style={{ color: "oklch(0.700 0.015 240)" }}
                >
                  <p>
                    The Crypto Fear &amp; Greed Index measures market sentiment
                    on a scale of 0 (Extreme Fear) to 100 (Extreme Greed). It
                    aggregates data from multiple sources including volatility,
                    market momentum, social media, surveys, dominance, and
                    trends.
                  </p>
                  <p>
                    <span
                      style={{ color: "oklch(0.637 0.220 25)" }}
                      className="font-semibold"
                    >
                      {"Extreme Fear (0\u201325)"}
                    </span>
                    {
                      " \u2014 Investors are very worried. Historically a buying opportunity."
                    }
                  </p>
                  <p>
                    <span
                      style={{ color: "oklch(0.820 0.160 90)" }}
                      className="font-semibold"
                    >
                      {"Neutral (46\u201355)"}
                    </span>
                    {
                      " \u2014 Market is balanced with no strong bias in either direction."
                    }
                  </p>
                  <p>
                    <span
                      style={{ color: "oklch(0.723 0.185 150)" }}
                      className="font-semibold"
                    >
                      {"Extreme Greed (76\u2013100)"}
                    </span>
                    {
                      " \u2014 Market is over-excited. Historically a sell signal."
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Section 2: Macro Markets — 3 cards (SPX, Gold, DXY) ===== */}
        <section data-ocid="analysis.section">
          <SectionHeader title="Macro Markets" badge="Dzengi" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <MacroCard
              label="S&P 500"
              ticker="US500"
              data={data.spx}
              prefix=""
              decimals={2}
              icon={<BarChart2 className="w-3.5 h-3.5" />}
              show52wRange={false}
            />
            <MacroCard
              label="Gold"
              ticker="Gold"
              data={data.gold}
              prefix="$"
              decimals={2}
              icon={<DollarSign className="w-3.5 h-3.5" />}
              show52wRange={false}
            />
            <MacroCard
              label="DXY"
              ticker="Dzengi"
              data={data.dxy}
              prefix=""
              decimals={2}
              icon={<Activity className="w-3.5 h-3.5" />}
              show52wRange={false}
            />
          </div>
        </section>

        {/* ===== Section 3: Funding Rates ===== */}
        <section data-ocid="analysis.section">
          <SectionHeader
            title={"Crypto Derivatives \u2014 Funding Rates"}
            badge="Binance"
          />
          <div className="flex flex-col sm:flex-row gap-4">
            <FundingCard
              asset="BTC"
              rate={data.btcFunding.rate}
              nextSettlement={data.btcFunding.nextSettlement}
              intervalHours={data.btcFunding.intervalHours}
              loading={data.btcFunding.loading}
              error={data.btcFunding.error}
            />
            <FundingCard
              asset="ETH"
              rate={data.ethFunding.rate}
              nextSettlement={data.ethFunding.nextSettlement}
              intervalHours={data.ethFunding.intervalHours}
              loading={data.ethFunding.loading}
              error={data.ethFunding.error}
            />
          </div>
          <div
            className="mt-3 rounded-lg p-3 flex gap-2.5"
            style={{
              background: "oklch(0.785 0.135 200 / 0.06)",
              border: "1px solid oklch(0.785 0.135 200 / 0.15)",
            }}
          >
            <svg
              role="img"
              aria-label="Info"
              className="w-3.5 h-3.5 shrink-0 mt-0.5"
              viewBox="0 0 16 16"
              fill="none"
              style={{ color: "oklch(0.785 0.135 200)" }}
            >
              <title>Info</title>
              <circle
                cx="8"
                cy="8"
                r="7"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M8 7v4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <circle cx="8" cy="5" r="0.75" fill="currentColor" />
            </svg>
            <div className="flex flex-col gap-1.5 min-w-0">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span className="flex items-center gap-1 text-[11px]">
                  <span
                    className="inline-block w-2 h-2 rounded-full shrink-0"
                    style={{ background: "oklch(0.637 0.220 25)" }}
                  />
                  <span
                    style={{ color: "oklch(0.637 0.220 25)" }}
                    className="font-semibold"
                  >
                    Bearish
                  </span>
                  <span style={{ color: "oklch(0.500 0.015 240)" }}>
                    {" "}
                    — rate &gt; 0: longs pay shorts, market is overheated
                  </span>
                </span>
                <span className="flex items-center gap-1 text-[11px]">
                  <span
                    className="inline-block w-2 h-2 rounded-full shrink-0"
                    style={{ background: "oklch(0.723 0.185 150)" }}
                  />
                  <span
                    style={{ color: "oklch(0.723 0.185 150)" }}
                    className="font-semibold"
                  >
                    Bullish
                  </span>
                  <span style={{ color: "oklch(0.500 0.015 240)" }}>
                    {" "}
                    — rate &lt; 0: shorts pay longs, bearish bias = bullish
                    signal
                  </span>
                </span>
                <span className="flex items-center gap-1 text-[11px]">
                  <span
                    className="inline-block w-2 h-2 rounded-full shrink-0"
                    style={{ background: "oklch(0.550 0.015 240)" }}
                  />
                  <span
                    style={{ color: "oklch(0.600 0.015 240)" }}
                    className="font-semibold"
                  >
                    Neutral
                  </span>
                  <span style={{ color: "oklch(0.500 0.015 240)" }}>
                    {" "}
                    — rate ≈ 0: market is balanced, no directional pressure
                  </span>
                </span>
              </div>
              <p
                className="text-[10px]"
                style={{ color: "oklch(0.420 0.015 240)" }}
              >
                Settlement intervals follow exchange schedule. Funding payments
                occur between longs and shorts — not charged by the exchange.
              </p>
            </div>
          </div>
        </section>

        {/* ===== Section 4: Open Interest ===== */}
        <section data-ocid="analysis.section">
          <SectionHeader title="Open Interest" badge="Binance" />
          <div className="flex flex-col sm:flex-row gap-4">
            <OICard asset="BTC" data={data.btcOI} />
            <OICard asset="ETH" data={data.ethOI} />
          </div>
          <p
            className="mt-3 text-[11px] italic"
            style={{ color: "oklch(0.500 0.015 240)" }}
          >
            Open Interest = total value of all active futures/swap contracts.
            Rising OI with price = trend confirmation. Falling OI = position
            unwinding.
          </p>
        </section>

        {/* ===== Section 5: US 10Y Treasury Yield ===== */}
        <section data-ocid="analysis.section">
          <SectionHeader
            title="US 10Y Treasury Yield"
            subtitle="7-day trend"
            badge="US Treasury"
          />
          <Us10ySection data={data.us10y} />
        </section>

        {/* ===== Section 6: BTC Social Sentiment ===== */}
        <section data-ocid="analysis.section">
          <SectionHeader title="BTC Social Sentiment" badge="CoinGecko" />
          <div
            className="rounded-xl p-4 sm:p-5"
            style={{
              background: "oklch(0.155 0.020 240)",
              border: "1px solid oklch(1 0 0 / 0.08)",
            }}
          >
            {data.btcSocial.loading ? (
              <div className="space-y-3">
                <Skeleton
                  className="h-8 w-full rounded"
                  style={{ background: "oklch(1 0 0 / 0.06)" }}
                />
                <Skeleton
                  className="h-8 w-full rounded"
                  style={{ background: "oklch(1 0 0 / 0.06)" }}
                />
              </div>
            ) : data.btcSocial.error ? (
              <span
                className="text-sm"
                style={{ color: "oklch(0.450 0.015 240)" }}
              >
                unavailable
              </span>
            ) : (
              <div className="space-y-4">
                {/* Bullish bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span
                      style={{ color: "oklch(0.723 0.185 150)" }}
                      className="font-semibold"
                    >
                      Bullish
                    </span>
                    <span
                      className="font-mono font-bold"
                      style={{ color: "oklch(0.723 0.185 150)" }}
                    >
                      {data.btcSocial.bullishPct.toFixed(1)}%
                    </span>
                  </div>
                  <div
                    className="relative h-3 rounded-full"
                    style={{ background: "oklch(1 0 0 / 0.07)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${data.btcSocial.bullishPct}%`,
                        background: "oklch(0.723 0.185 150)",
                      }}
                    />
                  </div>
                </div>
                {/* Bearish bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span
                      style={{ color: "oklch(0.637 0.220 25)" }}
                      className="font-semibold"
                    >
                      Bearish
                    </span>
                    <span
                      className="font-mono font-bold"
                      style={{ color: "oklch(0.637 0.220 25)" }}
                    >
                      {data.btcSocial.bearishPct.toFixed(1)}%
                    </span>
                  </div>
                  <div
                    className="relative h-3 rounded-full"
                    style={{ background: "oklch(1 0 0 / 0.07)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${data.btcSocial.bearishPct}%`,
                        background: "oklch(0.637 0.220 25)",
                      }}
                    />
                  </div>
                </div>
                <p
                  className="text-[11px] italic mt-2"
                  style={{ color: "oklch(0.500 0.015 240)" }}
                >
                  Based on CoinGecko community votes. Updated every 10 minutes.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
