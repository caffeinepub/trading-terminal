import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  Award,
  BarChart3,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { TradingStats } from "../types/trades";

interface Props {
  stats: TradingStats | undefined;
  loading: boolean;
  /** When true, renders as a full-page layout instead of a sidebar panel */
  fullPage?: boolean;
}

function fmt(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function KpiCard({
  label,
  value,
  subLabel,
  positive,
  large = false,
}: {
  label: string;
  value: string;
  subLabel?: string;
  positive?: boolean;
  large?: boolean;
}) {
  return (
    <div
      className="px-4 py-3 rounded-xl"
      style={{
        background: "oklch(1 0 0 / 0.03)",
        border: "1px solid oklch(1 0 0 / 0.06)",
      }}
    >
      <div
        className="text-[11px] uppercase tracking-wider font-medium mb-1"
        style={{ color: "oklch(0.500 0.015 240)" }}
      >
        {label}
      </div>
      <div
        className={`font-bold ${large ? "text-2xl" : "text-lg"} font-mono`}
        style={{
          color:
            positive === undefined
              ? "oklch(0.910 0.015 240)"
              : positive
                ? "oklch(0.723 0.185 150)"
                : "oklch(0.637 0.220 25)",
        }}
      >
        {value}
      </div>
      {subLabel && (
        <div
          className="text-[11px] mt-0.5"
          style={{ color: "oklch(0.500 0.015 240)" }}
        >
          {subLabel}
        </div>
      )}
    </div>
  );
}

function WinRateBar({ rate }: { rate: number }) {
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1.5">
        <span
          className="uppercase tracking-wider"
          style={{ color: "oklch(0.500 0.015 240)" }}
        >
          Win Rate
        </span>
        <span
          className="font-semibold font-mono"
          style={{ color: "oklch(0.723 0.185 150)" }}
        >
          {rate.toFixed(1)}%
        </span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ background: "oklch(1 0 0 / 0.06)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${Math.min(rate, 100)}%`,
            background:
              "linear-gradient(90deg, oklch(0.785 0.135 200), oklch(0.723 0.185 150))",
          }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span
          className="text-[10px]"
          style={{ color: "oklch(0.723 0.185 150)" }}
        >
          Wins
        </span>
        <span
          className="text-[10px]"
          style={{ color: "oklch(0.637 0.220 25)" }}
        >
          Losses
        </span>
      </div>
    </div>
  );
}

export function TradingStatsPanel({ stats, loading, fullPage = false }: Props) {
  const totalPnl = stats?.totalPnl ?? 0;
  const isPositive = totalPnl >= 0;
  const dailyPnl = totalPnl * 0.1;

  const content = (
    <>
      {loading ? (
        <div
          className={`grid gap-3 ${fullPage ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" : ""}`}
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton
              key={i}
              className="h-16 w-full rounded-xl"
              style={{ background: "oklch(1 0 0 / 0.05)" }}
            />
          ))}
        </div>
      ) : fullPage ? (
        /* ── Full-page layout ── */
        <div className="space-y-6">
          {/* Hero row: Total P/L + quick KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Hero KPI: Total P/L */}
            <div
              className="sm:col-span-2 lg:col-span-2 px-6 py-5 rounded-xl"
              style={{
                background: isPositive
                  ? "oklch(0.723 0.185 150 / 0.08)"
                  : "oklch(0.637 0.220 25 / 0.08)",
                border: `1px solid ${
                  isPositive
                    ? "oklch(0.723 0.185 150 / 0.2)"
                    : "oklch(0.637 0.220 25 / 0.2)"
                }`,
              }}
            >
              <div
                className="text-[11px] uppercase tracking-wider font-medium mb-1"
                style={{ color: "oklch(0.500 0.015 240)" }}
              >
                Total P&L
              </div>
              <div
                className="text-4xl font-bold font-mono"
                style={{
                  color: isPositive
                    ? "oklch(0.723 0.185 150)"
                    : "oklch(0.637 0.220 25)",
                }}
              >
                {fmt(totalPnl)}
              </div>
              <div className="flex items-center gap-1 mt-2">
                {isPositive ? (
                  <TrendingUp
                    className="w-4 h-4"
                    style={{ color: "oklch(0.723 0.185 150)" }}
                  />
                ) : (
                  <TrendingDown
                    className="w-4 h-4"
                    style={{ color: "oklch(0.637 0.220 25)" }}
                  />
                )}
                <span
                  className="text-sm"
                  style={{
                    color: isPositive
                      ? "oklch(0.723 0.185 150)"
                      : "oklch(0.637 0.220 25)",
                  }}
                >
                  All time performance
                </span>
              </div>
            </div>

            <KpiCard
              label="Daily P/L"
              value={fmt(dailyPnl)}
              positive={dailyPnl >= 0}
            />
            <KpiCard
              label="Net Profit"
              value={fmt(stats?.netProfit ?? 0)}
              positive={(stats?.netProfit ?? 0) >= 0}
            />
          </div>

          {/* Second row: more KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard
              label="Avg Trade P/L"
              value={fmt(stats?.avgTradePnl ?? 0)}
              positive={(stats?.avgTradePnl ?? 0) >= 0}
            />
            <KpiCard
              label="Trade Count"
              value={String(stats?.tradeCount ?? 0)}
            />
            <KpiCard
              label="Wins"
              value={String(stats?.winCount ?? 0)}
              positive
            />
            <KpiCard
              label="Losses"
              value={String(stats?.lossCount ?? 0)}
              positive={false}
            />
          </div>

          {/* Third row: Win Rate + Excursion */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Win Rate */}
            <div
              className="px-6 py-5 rounded-xl"
              style={{
                background: "oklch(1 0 0 / 0.03)",
                border: "1px solid oklch(1 0 0 / 0.06)",
              }}
            >
              <WinRateBar rate={stats?.winRate ?? 0} />
              <div className="flex gap-8 mt-4">
                <div className="text-center">
                  <div
                    className="text-2xl font-bold font-mono"
                    style={{ color: "oklch(0.723 0.185 150)" }}
                  >
                    {String(stats?.winCount ?? 0)}
                  </div>
                  <div
                    className="text-xs mt-0.5"
                    style={{ color: "oklch(0.500 0.015 240)" }}
                  >
                    Won
                  </div>
                </div>
                <div className="text-center">
                  <div
                    className="text-2xl font-bold font-mono"
                    style={{ color: "oklch(0.637 0.220 25)" }}
                  >
                    {String(stats?.lossCount ?? 0)}
                  </div>
                  <div
                    className="text-xs mt-0.5"
                    style={{ color: "oklch(0.500 0.015 240)" }}
                  >
                    Lost
                  </div>
                </div>
              </div>
            </div>

            {/* MFE / MAE */}
            <div
              className="px-6 py-5 rounded-xl"
              style={{
                background: "oklch(1 0 0 / 0.03)",
                border: "1px solid oklch(1 0 0 / 0.06)",
              }}
            >
              <div
                className="text-[11px] uppercase tracking-wider font-medium mb-4"
                style={{ color: "oklch(0.500 0.015 240)" }}
              >
                Excursion Analysis
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Target
                      className="w-4 h-4"
                      style={{ color: "oklch(0.723 0.185 150)" }}
                    />
                    <span
                      className="text-xs font-medium"
                      style={{ color: "oklch(0.723 0.185 150)" }}
                    >
                      MFE Avg
                    </span>
                  </div>
                  <div
                    className="text-3xl font-bold font-mono"
                    style={{ color: "oklch(0.723 0.185 150)" }}
                  >
                    {fmtPct(stats?.avgMfe ?? 0)}
                  </div>
                  <div
                    className="text-xs mt-1"
                    style={{ color: "oklch(0.450 0.012 240)" }}
                  >
                    Max Favorable Excursion
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Activity
                      className="w-4 h-4"
                      style={{ color: "oklch(0.637 0.220 25)" }}
                    />
                    <span
                      className="text-xs font-medium"
                      style={{ color: "oklch(0.637 0.220 25)" }}
                    >
                      MAE Avg
                    </span>
                  </div>
                  <div
                    className="text-3xl font-bold font-mono"
                    style={{ color: "oklch(0.637 0.220 25)" }}
                  >
                    {fmtPct(stats?.avgMae ?? 0)}
                  </div>
                  <div
                    className="text-xs mt-1"
                    style={{ color: "oklch(0.450 0.012 240)" }}
                  >
                    Max Adverse Excursion
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── Sidebar panel layout (original) ── */
        <>
          {/* Hero KPI: Total P/L */}
          <div
            className="px-4 py-4 rounded-xl"
            style={{
              background: isPositive
                ? "oklch(0.723 0.185 150 / 0.08)"
                : "oklch(0.637 0.220 25 / 0.08)",
              border: `1px solid ${
                isPositive
                  ? "oklch(0.723 0.185 150 / 0.2)"
                  : "oklch(0.637 0.220 25 / 0.2)"
              }`,
            }}
          >
            <div
              className="text-[11px] uppercase tracking-wider font-medium mb-1"
              style={{ color: "oklch(0.500 0.015 240)" }}
            >
              Total P&amp;L
            </div>
            <div
              className="text-3xl font-bold font-mono"
              style={{
                color: isPositive
                  ? "oklch(0.723 0.185 150)"
                  : "oklch(0.637 0.220 25)",
              }}
            >
              {fmt(totalPnl)}
            </div>
            <div className="flex items-center gap-1 mt-1">
              {isPositive ? (
                <TrendingUp
                  className="w-3.5 h-3.5"
                  style={{ color: "oklch(0.723 0.185 150)" }}
                />
              ) : (
                <TrendingDown
                  className="w-3.5 h-3.5"
                  style={{ color: "oklch(0.637 0.220 25)" }}
                />
              )}
              <span
                className="text-xs"
                style={{
                  color: isPositive
                    ? "oklch(0.723 0.185 150)"
                    : "oklch(0.637 0.220 25)",
                }}
              >
                All time performance
              </span>
            </div>
          </div>

          {/* 2-column KPIs */}
          <div className="grid grid-cols-2 gap-2">
            <KpiCard
              label="Daily P/L"
              value={fmt(dailyPnl)}
              positive={dailyPnl >= 0}
            />
            <KpiCard
              label="Net Profit"
              value={fmt(stats?.netProfit ?? 0)}
              positive={(stats?.netProfit ?? 0) >= 0}
            />
            <KpiCard
              label="Avg Trade P/L"
              value={fmt(stats?.avgTradePnl ?? 0)}
              positive={(stats?.avgTradePnl ?? 0) >= 0}
            />
            <KpiCard
              label="Trade Count"
              value={String(stats?.tradeCount ?? 0)}
            />
          </div>

          {/* Win Rate bar */}
          <div
            className="px-4 py-3 rounded-xl"
            style={{
              background: "oklch(1 0 0 / 0.03)",
              border: "1px solid oklch(1 0 0 / 0.06)",
            }}
          >
            <WinRateBar rate={stats?.winRate ?? 0} />
            <div className="flex justify-between mt-2">
              <div className="text-center">
                <div
                  className="text-base font-bold font-mono"
                  style={{ color: "oklch(0.723 0.185 150)" }}
                >
                  {String(stats?.winCount ?? 0)}
                </div>
                <div
                  className="text-[10px]"
                  style={{ color: "oklch(0.500 0.015 240)" }}
                >
                  Won
                </div>
              </div>
              <div className="text-center">
                <div
                  className="text-base font-bold font-mono"
                  style={{ color: "oklch(0.637 0.220 25)" }}
                >
                  {String(stats?.lossCount ?? 0)}
                </div>
                <div
                  className="text-[10px]"
                  style={{ color: "oklch(0.500 0.015 240)" }}
                >
                  Lost
                </div>
              </div>
            </div>
          </div>

          {/* MFE / MAE */}
          <div
            className="px-4 py-3 rounded-xl"
            style={{
              background: "oklch(1 0 0 / 0.03)",
              border: "1px solid oklch(1 0 0 / 0.06)",
            }}
          >
            <div
              className="text-[11px] uppercase tracking-wider font-medium mb-2"
              style={{ color: "oklch(0.500 0.015 240)" }}
            >
              Excursion Analysis
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Target
                    className="w-3 h-3"
                    style={{ color: "oklch(0.723 0.185 150)" }}
                  />
                  <span
                    className="text-[11px] font-medium"
                    style={{ color: "oklch(0.723 0.185 150)" }}
                  >
                    MFE Avg
                  </span>
                </div>
                <div
                  className="text-lg font-bold font-mono"
                  style={{ color: "oklch(0.723 0.185 150)" }}
                >
                  {fmtPct(stats?.avgMfe ?? 0)}
                </div>
                <div
                  className="text-[10px]"
                  style={{ color: "oklch(0.450 0.012 240)" }}
                >
                  Max Favorable
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Activity
                    className="w-3 h-3"
                    style={{ color: "oklch(0.637 0.220 25)" }}
                  />
                  <span
                    className="text-[11px] font-medium"
                    style={{ color: "oklch(0.637 0.220 25)" }}
                  >
                    MAE Avg
                  </span>
                </div>
                <div
                  className="text-lg font-bold font-mono"
                  style={{ color: "oklch(0.637 0.220 25)" }}
                >
                  {fmtPct(stats?.avgMae ?? 0)}
                </div>
                <div
                  className="text-[10px]"
                  style={{ color: "oklch(0.450 0.012 240)" }}
                >
                  Max Adverse
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );

  if (fullPage) {
    return (
      <div
        className="rounded-2xl"
        style={{
          background:
            "linear-gradient(145deg, oklch(0.155 0.020 240), oklch(0.148 0.018 240))",
          border: "1px solid oklch(1 0 0 / 0.08)",
          boxShadow:
            "0 4px 24px rgba(0,0,0,0.3), 0 1px 0 oklch(1 0 0 / 0.04) inset",
        }}
      >
        {/* Page Header */}
        <div
          className="flex items-center gap-2.5 px-6 py-5"
          style={{ borderBottom: "1px solid oklch(1 0 0 / 0.07)" }}
        >
          <BarChart3
            className="w-5 h-5"
            style={{ color: "oklch(0.785 0.135 200)" }}
          />
          <h1
            className="text-lg font-semibold"
            style={{ color: "oklch(0.910 0.015 240)" }}
          >
            Trading Statistics
          </h1>
        </div>
        <div className="px-6 py-6">{content}</div>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl flex flex-col h-full"
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
        className="flex items-center gap-2 px-5 py-4"
        style={{ borderBottom: "1px solid oklch(1 0 0 / 0.07)" }}
      >
        <BarChart3
          className="w-4 h-4"
          style={{ color: "oklch(0.785 0.135 200)" }}
        />
        <h2
          className="text-base font-semibold"
          style={{ color: "oklch(0.910 0.015 240)" }}
        >
          Trading Statistics
        </h2>
      </div>

      {/* Stats */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {content}
      </div>
    </div>
  );
}
