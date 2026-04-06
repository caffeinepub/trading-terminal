import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Status, TradeType } from "../backend";
import type { Trade } from "../backend.d.ts";

const SKELETON_ROWS = ["r1", "r2", "r3", "r4"];
const SKELETON_CELLS = ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9"];

interface Props {
  trades: Trade[];
  loading: boolean;
}

function fmtUsd(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPrice(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtTimestamp(ts: bigint): string {
  const ms = Number(ts) / 1_000_000; // nanoseconds to ms
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TradesTable({ trades, loading }: Props) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
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
        className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-5 py-3 sm:py-4 gap-2"
        style={{ borderBottom: "1px solid oklch(1 0 0 / 0.07)" }}
      >
        <div className="flex items-center gap-3">
          <h2
            className="text-base font-semibold"
            style={{ color: "oklch(0.910 0.015 240)" }}
          >
            Active Trades &amp; Orders
          </h2>
          {!loading && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                background: "oklch(0.785 0.135 200 / 0.15)",
                color: "oklch(0.785 0.135 200)",
              }}
            >
              {trades.length} trades
            </span>
          )}
        </div>
        <div
          className="text-[11px] px-2.5 py-1 rounded-full w-fit"
          style={{
            background: "oklch(1 0 0 / 0.05)",
            color: "oklch(0.500 0.015 240)",
          }}
        >
          Real-time updates
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto" data-ocid="trades.table">
        <Table>
          <TableHeader>
            <TableRow
              style={{
                borderBottom: "1px solid oklch(1 0 0 / 0.07)",
                background: "transparent",
              }}
            >
              {/* Type — always visible */}
              <TableHead
                className="text-[11px] uppercase tracking-wider font-medium py-3"
                style={{ color: "oklch(0.500 0.015 240)" }}
              >
                Type
              </TableHead>
              {/* Asset — always visible */}
              <TableHead
                className="text-[11px] uppercase tracking-wider font-medium py-3"
                style={{ color: "oklch(0.500 0.015 240)" }}
              >
                Asset
              </TableHead>
              {/* Quantity — hidden on mobile */}
              <TableHead
                className="hidden sm:table-cell text-[11px] uppercase tracking-wider font-medium py-3"
                style={{ color: "oklch(0.500 0.015 240)" }}
              >
                Quantity
              </TableHead>
              {/* Entry Price — hidden on small screens */}
              <TableHead
                className="hidden md:table-cell text-[11px] uppercase tracking-wider font-medium py-3"
                style={{ color: "oklch(0.500 0.015 240)" }}
              >
                Entry Price
              </TableHead>
              {/* Current Price — always visible */}
              <TableHead
                className="text-[11px] uppercase tracking-wider font-medium py-3"
                style={{ color: "oklch(0.500 0.015 240)" }}
              >
                Current Price
              </TableHead>
              {/* Opened — hidden on mobile */}
              <TableHead
                className="hidden sm:table-cell text-[11px] uppercase tracking-wider font-medium py-3"
                style={{ color: "oklch(0.500 0.015 240)" }}
              >
                Opened
              </TableHead>
              {/* MFE / MAE — hidden on small screens */}
              <TableHead
                className="hidden md:table-cell text-[11px] uppercase tracking-wider font-medium py-3"
                style={{ color: "oklch(0.500 0.015 240)" }}
              >
                MFE / MAE
              </TableHead>
              {/* Status — always visible */}
              <TableHead
                className="text-[11px] uppercase tracking-wider font-medium py-3"
                style={{ color: "oklch(0.500 0.015 240)" }}
              >
                Status
              </TableHead>
              {/* P/L — always visible */}
              <TableHead
                className="text-[11px] uppercase tracking-wider font-medium py-3"
                style={{ color: "oklch(0.500 0.015 240)" }}
              >
                P / L
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              SKELETON_ROWS.map((rowKey) => (
                <TableRow
                  key={rowKey}
                  style={{ borderBottom: "1px solid oklch(1 0 0 / 0.05)" }}
                >
                  {SKELETON_CELLS.map((cellKey) => (
                    <TableCell key={cellKey} className="py-3">
                      <Skeleton
                        className="h-4 rounded"
                        style={{ background: "oklch(1 0 0 / 0.05)" }}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : trades.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="py-12 text-center"
                  data-ocid="trades.empty_state"
                >
                  <div className="flex flex-col items-center gap-2">
                    <TrendingUp
                      className="w-8 h-8"
                      style={{ color: "oklch(0.350 0.015 240)" }}
                    />
                    <span
                      className="text-sm"
                      style={{ color: "oklch(0.450 0.012 240)" }}
                    >
                      No trades found
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              trades.map((trade, idx) => {
                const isLong = trade.tradeType === TradeType.long_;
                const isOpen = trade.status === Status.open;
                const isPnlPositive = trade.pnl >= 0;
                const ocidIdx = idx + 1;
                return (
                  <TableRow
                    key={String(trade.id)}
                    data-ocid={`trades.item.${ocidIdx}`}
                    className="transition-colors"
                    style={{
                      borderBottom: "1px solid oklch(1 0 0 / 0.05)",
                      cursor: "default",
                    }}
                    onMouseEnter={(e) => {
                      (
                        e.currentTarget as HTMLTableRowElement
                      ).style.background = "oklch(1 0 0 / 0.02)";
                    }}
                    onMouseLeave={(e) => {
                      (
                        e.currentTarget as HTMLTableRowElement
                      ).style.background = "transparent";
                    }}
                  >
                    {/* Type — always visible */}
                    <TableCell className="py-3">
                      <div
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg w-fit text-xs font-semibold"
                        style={{
                          background: isLong
                            ? "oklch(0.723 0.185 150 / 0.12)"
                            : "oklch(0.637 0.220 25 / 0.12)",
                          color: isLong
                            ? "oklch(0.723 0.185 150)"
                            : "oklch(0.637 0.220 25)",
                        }}
                      >
                        {isLong ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownLeft className="w-3 h-3" />
                        )}
                        {isLong ? "Long" : "Short"}
                      </div>
                    </TableCell>

                    {/* Asset — always visible */}
                    <TableCell className="py-3">
                      <span
                        className="text-sm font-semibold"
                        style={{ color: "oklch(0.910 0.015 240)" }}
                      >
                        {trade.asset}
                      </span>
                    </TableCell>

                    {/* Quantity — hidden on mobile */}
                    <TableCell className="hidden sm:table-cell py-3">
                      <span
                        className="text-sm font-mono"
                        style={{ color: "oklch(0.750 0.015 240)" }}
                      >
                        {trade.quantity.toFixed(4)}
                      </span>
                    </TableCell>

                    {/* Entry Price — hidden on small screens */}
                    <TableCell className="hidden md:table-cell py-3">
                      <span
                        className="text-sm font-mono"
                        style={{ color: "oklch(0.750 0.015 240)" }}
                      >
                        {fmtPrice(trade.entryPrice)}
                      </span>
                    </TableCell>

                    {/* Current Price — always visible */}
                    <TableCell className="py-3">
                      <span
                        className="text-sm font-mono font-semibold"
                        style={{ color: "oklch(0.870 0.012 240)" }}
                      >
                        {fmtPrice(trade.currentPrice)}
                      </span>
                    </TableCell>

                    {/* Opened — hidden on mobile */}
                    <TableCell className="hidden sm:table-cell py-3">
                      <span
                        className="text-xs"
                        style={{ color: "oklch(0.500 0.015 240)" }}
                      >
                        {fmtTimestamp(trade.timestamp)}
                      </span>
                    </TableCell>

                    {/* MFE / MAE — hidden on small screens */}
                    <TableCell className="hidden md:table-cell py-3">
                      <div className="text-xs font-mono">
                        <span style={{ color: "oklch(0.723 0.185 150)" }}>
                          +{trade.mfe.toFixed(2)}%
                        </span>
                        <span style={{ color: "oklch(0.450 0.012 240)" }}>
                          {" "}
                          /{" "}
                        </span>
                        <span style={{ color: "oklch(0.637 0.220 25)" }}>
                          -{Math.abs(trade.mae).toFixed(2)}%
                        </span>
                      </div>
                    </TableCell>

                    {/* Status — always visible */}
                    <TableCell className="py-3">
                      <div
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold w-fit"
                        style={{
                          background: isOpen
                            ? "oklch(0.723 0.185 150 / 0.12)"
                            : "oklch(1 0 0 / 0.05)",
                          color: isOpen
                            ? "oklch(0.723 0.185 150)"
                            : "oklch(0.450 0.012 240)",
                        }}
                      >
                        {isOpen && (
                          <span
                            className="w-1.5 h-1.5 rounded-full animate-pulse-slow"
                            style={{ background: "oklch(0.723 0.185 150)" }}
                          />
                        )}
                        {isOpen ? "Live" : "Closed"}
                      </div>
                    </TableCell>

                    {/* P/L — always visible */}
                    <TableCell className="py-3">
                      <div
                        className="flex items-center gap-1 text-sm font-bold font-mono"
                        style={{
                          color: isPnlPositive
                            ? "oklch(0.723 0.185 150)"
                            : "oklch(0.637 0.220 25)",
                        }}
                      >
                        {isPnlPositive ? (
                          <TrendingUp className="w-3.5 h-3.5" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5" />
                        )}
                        {fmtUsd(trade.pnl)}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
