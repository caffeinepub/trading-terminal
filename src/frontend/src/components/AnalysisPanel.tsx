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
  const cx = 110;
  const cy = 100;
  const r = 80;

  function polarToXY(deg: number) {
    const rad = (deg * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  }

  const bgStart = polarToXY(180);
  const bgEnd = polarToXY(0);
  const bgPath = `M ${bgStart.x} ${bgStart.y} A ${r} ${r} 0 0 1 ${bgEnd.x} ${bgEnd.y}`;

  const valueDeg = 180 - (value / 100) * 180;
  const valEnd = polarToXY(valueDeg);
  const largeArc = value > 50 ? 1 : 0;
  const valPath = `M ${bgStart.x} ${bgStart.y} A ${r} ${r} 0 ${largeArc} 1 ${valEnd.x} ${valEnd.y}`;

  const needleEnd = polarToXY(valueDeg);
  const needleMid = {
    x: cx + (r - 24) * Math.cos((valueDeg * Math.PI) / 180),
    y: cy + (r - 24) * Math.sin((valueDeg * Math.PI) / 180),
  };

  const color = fngColor(value);

  const zones = [
    { from: 180, to: 144, color: "oklch(0.637 0.220 25 / 0.35)" },
    { from: 144, to: 115, color: "oklch(0.720 0.185 55 / 0.30)" },
    { from: 115, to: 90, color: "oklch(0.820 0.160 90 / 0.25)" },
    { from: 90, to: 65, color: "oklch(0.780 0.185 145 / 0.25)" },
    { from: 65, to: 36, color: "oklch(0.780 0.185 145 / 0.30)" },
    { from: 36, to: 0, color: "oklch(0.723 0.185 150 / 0.35)" },
  ];

  return (
    <svg
      width="220"
      height="120"
      viewBox="0 0 220 120"
      style={{ overflow: "visible" }}
      aria-hidden="true"
    >
      {zones.map((z) => {
        const zStart = polarToXY(z.from);
        const zEnd = polarToXY(z.to);
        const zSweep = z.from - z.to;
        const zLarge = zSweep > 180 ? 1 : 0;
        return (
          <path
            key={z.from}
            d={`M ${zStart.x} ${zStart.y} A ${r} ${r} 0 ${zLarge} 1 ${zEnd.x} ${zEnd.y}`}
            fill="none"
            stroke={z.color}
            strokeWidth="12"
            strokeLinecap="butt"
          />
        );
      })}

      <path
        d={bgPath}
        fill="none"
        stroke="oklch(1 0 0 / 0.06)"
        strokeWidth="12"
        strokeLinecap="round"
      />

      {!loading && value > 0 && (
        <path
          d={valPath}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      )}

      {!loading && value > 0 && (
        <>
          <line
            x1={cx}
            y1={cy}
            x2={needleMid.x}
            y2={needleMid.y}
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle
            cx={needleEnd.x}
            cy={needleEnd.y}
            r="4"
            fill={color}
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          />
          <circle cx={cx} cy={cy} r="5" fill={color} opacity="0.9" />
        </>
      )}

      {[0, 25, 50, 75, 100].map((tick) => {
        const deg = 180 - (tick / 100) * 180;
        const labelR = r + 18;
        const lp = {
          x: cx + labelR * Math.cos((deg * Math.PI) / 180),
          y: cy + labelR * Math.sin((deg * Math.PI) / 180),
        };
        return (
          <text
            key={tick}
            x={lp.x}
            y={lp.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="9"
            fill="oklch(0.500 0.015 240)"
          >
            {tick}
          </text>
        );
      })}
    </svg>
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
      className="rounded-xl p-4 flex flex-col gap-1 min-w-0"
      style={{
        background: "oklch(0.155 0.020 240)",
        border: "1px solid oklch(1 0 0 / 0.08)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: "oklch(0.785 0.135 200 / 0.12)",
              color: "oklch(0.785 0.135 200)",
            }}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <div
              className="text-xs font-semibold"
              style={{ color: "oklch(0.910 0.015 240)" }}
            >
              {label}
            </div>
            <div
              className="text-[10px] font-mono"
              style={{ color: "oklch(0.450 0.015 240)" }}
            >
              {ticker}
            </div>
          </div>
        </div>
        {data.loading ? (
          <Skeleton
            className="h-4 w-16 rounded"
            style={{ background: "oklch(1 0 0 / 0.06)" }}
          />
        ) : data.error ? (
          <span className="text-xs" style={{ color: "oklch(0.450 0.015 240)" }}>
            {"\u2013"}
          </span>
        ) : (
          <div
            className="flex items-center gap-1 text-xs font-semibold"
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
          className="h-7 w-28 rounded mt-1"
          style={{ background: "oklch(1 0 0 / 0.06)" }}
        />
      ) : data.error ? (
        <span
          className="text-lg font-mono font-bold"
          style={{ color: "oklch(0.450 0.015 240)" }}
        >
          unavailable
        </span>
      ) : (
        <div
          className="font-mono font-bold text-xl mt-0.5"
          style={{ color: "oklch(0.910 0.015 240)" }}
        >
          {prefix}
          {fmtNum(data.price, decimals)}
          {suffix}
        </div>
      )}

      {/* Range bar — only when show52wRange=true AND data has 52w values */}
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
  if (!loading && !error) {
    if (Math.abs(rate) < 0.00001) rateColor = "oklch(0.550 0.015 240)";
    else if (rate > 0) rateColor = "oklch(0.637 0.220 25)";
    else rateColor = "oklch(0.723 0.185 150)";
  }

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
              {asset}-USDT-SWAP
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
          OKX
        </span>
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
        <div
          className="font-mono font-bold text-2xl"
          style={{ color: rateColor }}
        >
          {fmtRate(rate)}
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
}

function OISparkline({ data }: SparklineProps) {
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

  const gradientId = `oi-sparkline-grad-${Math.random().toString(36).slice(2, 7)}`;

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
          <stop
            offset="0%"
            stopColor="oklch(0.785 0.135 200)"
            stopOpacity="0.25"
          />
          <stop
            offset="100%"
            stopColor="oklch(0.785 0.135 200)"
            stopOpacity="0"
          />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${gradientId})`} />
      <polyline
        points={polylinePoints}
        fill="none"
        stroke="oklch(0.785 0.135 200)"
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
              {asset}-USDT-SWAP
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
          OKX
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

// ---- Section header ----
function SectionHeader({ title, badge }: { title: string; badge?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2
        className="text-[11px] font-semibold uppercase tracking-widest"
        style={{ color: "oklch(0.612 0.020 240)" }}
      >
        {title}
      </h2>
      {badge && (
        <span
          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
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
        className="px-6 py-4"
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

      <div className="px-6 py-6 flex flex-col gap-10">
        {/* ===== Section 1: Market Sentiment ===== */}
        <section data-ocid="analysis.section">
          <SectionHeader title="Market Sentiment" badge="alternative.me" />
          <div className="flex flex-col lg:flex-row items-start gap-6">
            {/* Gauge card */}
            <div
              className="rounded-xl p-5 flex flex-col items-center"
              style={{
                background: "oklch(0.145 0.018 240)",
                border: "1px solid oklch(1 0 0 / 0.08)",
                minWidth: "260px",
              }}
            >
              {fearGreed.loading ? (
                <div className="flex flex-col items-center gap-4 py-4">
                  <Skeleton
                    className="w-[220px] h-[120px] rounded-xl"
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
                  <FearGreedGauge
                    value={fearGreed.value}
                    loading={fearGreed.loading}
                  />
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

              <div className="mt-5 w-full">
                <div
                  className="text-[10px] font-semibold uppercase tracking-wider mb-2 text-center"
                  style={{ color: "oklch(0.500 0.015 240)" }}
                >
                  Scale
                </div>
                <div className="flex justify-between gap-1">
                  {[
                    { label: "Extreme Fear", color: "oklch(0.637 0.220 25)" },
                    { label: "Fear", color: "oklch(0.720 0.185 55)" },
                    { label: "Neutral", color: "oklch(0.820 0.160 90)" },
                    { label: "Greed", color: "oklch(0.780 0.185 145)" },
                    {
                      label: "Extreme Greed",
                      color: "oklch(0.723 0.185 150)",
                    },
                  ].map((z) => (
                    <div
                      key={z.label}
                      className="flex flex-col items-center gap-1 flex-1"
                    >
                      <div
                        className="w-full h-1 rounded-full"
                        style={{ background: z.color }}
                      />
                      <span
                        className="text-[9px] text-center leading-tight"
                        style={{ color: "oklch(0.450 0.015 240)" }}
                      >
                        {z.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sentiment description */}
            <div className="flex-1 min-w-0">
              <div
                className="rounded-xl p-5 h-full"
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

        {/* ===== Section 2: Macro Markets (Dzengi) ===== */}
        <section data-ocid="analysis.section">
          <SectionHeader title="Macro Markets" badge="Dzengi" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
              label="US Bonds (TLT)"
              ticker="TLT"
              data={data.us10y}
              prefix="$"
              decimals={2}
              icon={<TrendingUp className="w-3.5 h-3.5" />}
              show52wRange={false}
            />
            <MacroCard
              label="DXY Proxy"
              ticker="USD/JPY"
              data={data.dxy}
              prefix=""
              decimals={3}
              icon={<Activity className="w-3.5 h-3.5" />}
              show52wRange={false}
            />
          </div>
        </section>

        {/* ===== Section 3: Funding Rates ===== */}
        <section data-ocid="analysis.section">
          <SectionHeader
            title={"Crypto Derivatives \u2014 Funding Rates"}
            badge="OKX"
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
          <p
            className="mt-3 text-[11px] italic"
            style={{ color: "oklch(0.500 0.015 240)" }}
          >
            Positive funding = longs pay shorts (market overheated). Negative =
            shorts pay longs (bearish bias). Settlement intervals follow
            exchange schedule.
          </p>
        </section>

        {/* ===== Section 4: Open Interest ===== */}
        <section data-ocid="analysis.section">
          <SectionHeader title="Open Interest" badge="OKX" />
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

        {/* ===== Section 5: BTC Social Sentiment ===== */}
        <section data-ocid="analysis.section">
          <SectionHeader title="BTC Social Sentiment" badge="CoinGecko" />
          <div
            className="rounded-xl p-5"
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
