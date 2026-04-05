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
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wifi,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const DZENGI_API = "https://demo-api-adapter.dzengi.com/api/v1";
const POLL_INTERVAL_MS = 10_000;

const SKEL_ROWS = [
  "r1",
  "r2",
  "r3",
  "r4",
  "r5",
  "r6",
  "r7",
  "r8",
  "r9",
  "r10",
  "r11",
  "r12",
];

const SKEL_COLS = [
  { id: "sym", cls: "pl-5", w: "96px" },
  { id: "price", cls: "", w: "72px" },
  { id: "chg", cls: "", w: "72px" },
  { id: "vol", cls: "", w: "72px" },
  { id: "qvol", cls: "", w: "72px" },
  { id: "hi", cls: "", w: "72px" },
  { id: "lo", cls: "pr-5", w: "72px" },
];

interface TickerRow {
  symbol: string;
  cleanSymbol: string;
  lastPrice: number;
  priceChangePercent: number;
  volume: number;
  quoteVolume: number;
  highPrice: number;
  lowPrice: number;
  openPrice: number;
}

type SortKey = keyof Pick<
  TickerRow,
  | "cleanSymbol"
  | "lastPrice"
  | "priceChangePercent"
  | "volume"
  | "quoteVolume"
  | "highPrice"
  | "lowPrice"
>;

type SortDir = "asc" | "desc";

type AssetCategory =
  | "all"
  | "crypto"
  | "forex"
  | "stocks"
  | "commodities"
  | "indexes"
  | "other";

const CRYPTO_BASES = [
  "BTC",
  "ETH",
  "LTC",
  "XRP",
  "BCH",
  "ADA",
  "SOL",
  "DOT",
  "LINK",
  "BNB",
  "DOGE",
  "AVAX",
  "MATIC",
  "UNI",
  "ATOM",
  "ALGO",
  "XLM",
  "TRX",
  "EOS",
  "XMR",
  "DASH",
  "ZEC",
  "NEO",
  "VET",
  "THETA",
  "FIL",
  "AAVE",
  "COMP",
  "MKR",
  "SNX",
  "YFI",
  "SUSHI",
  "CRV",
  "BAL",
  "1INCH",
  "GRT",
  "AXS",
  "SAND",
  "MANA",
  "ENJ",
  "CHZ",
  "HOT",
  "XEM",
  "NANO",
  "ZRX",
  "BAT",
  "OMG",
  "LRC",
  "KNC",
  "REN",
  "NMR",
  "OXT",
  "BAND",
  "STORJ",
  "KAVA",
  "ANKR",
  "CELR",
  "FET",
  "OCEAN",
  "RLC",
];

const FOREX_PAIRS = [
  "EUR",
  "GBP",
  "JPY",
  "AUD",
  "CAD",
  "CHF",
  "NZD",
  "SEK",
  "NOK",
  "DKK",
  "HKD",
  "SGD",
  "MXN",
  "PLN",
  "HUF",
  "CZK",
  "TRY",
  "ZAR",
  "CNH",
  "ILS",
  "USD",
];

const COMMODITIES = [
  "XAU",
  "XAG",
  "XPT",
  "XPD",
  "OIL",
  "BRENT",
  "WTI",
  "GAS",
  "WHEAT",
  "CORN",
  "SOYA",
  "COFFEE",
  "COCOA",
  "SUGAR",
  "COTTON",
  "COPPER",
  "ALUM",
  "NICKEL",
  "ZINC",
  "LEAD",
];

const INDEX_SYMBOLS = new Set([
  "US100",
  "US500",
  "US30",
  "DE40",
  "EU50",
  "FR40",
  "IT40",
  "SP35",
  "NL25",
  "CN50",
  "UK100",
  "HK50",
  "AU200",
  "JP225",
]);

function classifyAsset(row: TickerRow): Exclude<AssetCategory, "all"> {
  const sym = row.cleanSymbol;

  // No slash: could be index, stock, or named commodity
  if (!sym.includes("/")) {
    // Strip trailing dot to get base name
    const base = sym.endsWith(".") ? sym.slice(0, -1) : sym;
    // Index check: base (without trailing dot) is in INDEX_SYMBOLS
    if (INDEX_SYMBOLS.has(base)) return "indexes";
    // Named commodity fallback (Gold., Silver., Oil - Crude., etc.)
    if (
      sym.includes("Gold") ||
      sym.includes("Silver") ||
      sym.includes("Oil") ||
      sym.includes("Gas") ||
      sym.includes("Copper") ||
      sym.includes("Platinum") ||
      sym.includes("Palladium")
    )
      return "commodities";
    // Stock: ends with "." or contains a dot (e.g. "ADS.DE.")
    if (sym.includes(".")) return "stocks";
  }

  // Pair-based classification
  const pairBase = sym.split("/")[0];
  if (CRYPTO_BASES.includes(pairBase)) return "crypto";
  if (FOREX_PAIRS.includes(pairBase)) return "forex";
  if (COMMODITIES.includes(pairBase)) return "commodities";

  return "other";
}

function formatVolume(usd: number): string {
  if (usd >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(2)}B`;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(2)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}K`;
  return `$${usd.toFixed(0)}`;
}

function formatBaseVolume(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(2)}K`;
  return v.toFixed(4);
}

function cleanSymbol(sym: string): string {
  return sym.replace(/_LEVERAGE$/, "").replace(/_SPOT$/, "");
}

function parseTickerRow(item: Record<string, unknown>): TickerRow | null {
  const sym = String(item.symbol ?? "");
  if (!sym) return null;
  const lastPrice = Number.parseFloat(String(item.lastPrice ?? "0"));
  const priceChangePercent = Number.parseFloat(
    String(item.priceChangePercent ?? "0"),
  );
  const volume = Number.parseFloat(String(item.volume ?? "0"));
  const quoteVolume = Number.parseFloat(String(item.quoteVolume ?? "0"));
  const highPrice = Number.parseFloat(String(item.highPrice ?? "0"));
  const lowPrice = Number.parseFloat(String(item.lowPrice ?? "0"));
  const openPrice = Number.parseFloat(String(item.openPrice ?? "0"));
  return {
    symbol: sym,
    cleanSymbol: cleanSymbol(sym),
    lastPrice,
    priceChangePercent,
    volume,
    quoteVolume,
    highPrice,
    lowPrice,
    openPrice,
  };
}

const FILTER_TABS: { key: AssetCategory; label: string }[] = [
  { key: "all", label: "All" },
  { key: "crypto", label: "Crypto" },
  { key: "forex", label: "Forex" },
  { key: "stocks", label: "Stocks" },
  { key: "indexes", label: "Indexes" },
  { key: "commodities", label: "Commodities" },
  { key: "other", label: "Other" },
];

export function VolumeTable() {
  const [rows, setRows] = useState<TickerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("quoteVolume");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [assetFilter, setAssetFilter] = useState<AssetCategory>("all");
  const isMountedRef = useRef(true);

  const fetchTickers = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      const res = await fetch(`${DZENGI_API}/ticker/24hr`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      const arr: unknown[] = Array.isArray(data) ? data : [];
      const parsed = arr
        .map((item) => parseTickerRow(item as Record<string, unknown>))
        .filter((r): r is TickerRow => r !== null);
      if (isMountedRef.current) {
        setRows(parsed);
        setLastUpdated(new Date());
        setLoading(false);
      }
    } catch {
      if (isMountedRef.current) setLoading(false);
    } finally {
      if (isMountedRef.current) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchTickers();
    const timer = setInterval(() => fetchTickers(true), POLL_INTERVAL_MS);
    return () => {
      isMountedRef.current = false;
      clearInterval(timer);
    };
  }, [fetchTickers]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "cleanSymbol" ? "asc" : "desc");
    }
  }

  // Compute per-category counts from the full rows array
  const categoryCounts = {
    all: rows.length,
    crypto: rows.filter((r) => classifyAsset(r) === "crypto").length,
    forex: rows.filter((r) => classifyAsset(r) === "forex").length,
    stocks: rows.filter((r) => classifyAsset(r) === "stocks").length,
    indexes: rows.filter((r) => classifyAsset(r) === "indexes").length,
    commodities: rows.filter((r) => classifyAsset(r) === "commodities").length,
    other: rows.filter((r) => classifyAsset(r) === "other").length,
  };

  // Filter first, then sort
  const filtered =
    assetFilter === "all"
      ? rows
      : rows.filter((r) => classifyAsset(r) === assetFilter);

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (typeof av === "string" && typeof bv === "string") {
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    const an = av as number;
    const bn = bv as number;
    return sortDir === "asc" ? an - bn : bn - an;
  });

  // If current filter is "other" but it now has 0 items, fall back to "all"
  // (handles the case where the user had "other" selected and it empties)
  const effectiveFilter =
    assetFilter === "other" && categoryCounts.other === 0 ? "all" : assetFilter;

  // Only show the "Other" tab if it has assets
  const visibleTabs = loading
    ? FILTER_TABS
    : FILTER_TABS.filter(
        (tab) => tab.key !== "other" || categoryCounts.other > 0,
      );

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col)
      return (
        <ArrowUpDown
          className="w-3 h-3 ml-1 inline opacity-40"
          style={{ color: "oklch(0.500 0.015 240)" }}
        />
      );
    return sortDir === "asc" ? (
      <ArrowUp
        className="w-3 h-3 ml-1 inline"
        style={{ color: "oklch(0.785 0.135 200)" }}
      />
    ) : (
      <ArrowDown
        className="w-3 h-3 ml-1 inline"
        style={{ color: "oklch(0.785 0.135 200)" }}
      />
    );
  }

  const headerBtn = (label: string, col: SortKey) => (
    <button
      type="button"
      className="flex items-center gap-0.5 cursor-pointer select-none hover:opacity-80 transition-opacity"
      onClick={() => handleSort(col)}
      style={{
        color:
          sortKey === col ? "oklch(0.785 0.135 200)" : "oklch(0.500 0.015 240)",
        fontWeight: sortKey === col ? 600 : 500,
      }}
    >
      {label}
      <SortIcon col={col} />
    </button>
  );

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background:
          "linear-gradient(145deg, oklch(0.155 0.020 240), oklch(0.148 0.018 240))",
        border: "1px solid oklch(1 0 0 / 0.08)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
      }}
      data-ocid="volume.panel"
    >
      {/* Header */}
      <div
        className="px-5 py-4"
        style={{ borderBottom: "1px solid oklch(1 0 0 / 0.07)" }}
      >
        {/* Top row: title + status badges */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              className="text-base font-semibold"
              style={{ color: "oklch(0.910 0.015 240)" }}
            >
              All Dzengi Assets
            </h2>
            {lastUpdated && (
              <p
                className="text-[11px] mt-0.5"
                style={{ color: "oklch(0.500 0.015 240)" }}
              >
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {refreshing && (
              <RefreshCw
                className="w-3.5 h-3.5 animate-spin"
                style={{ color: "oklch(0.785 0.135 200)" }}
              />
            )}
            {!loading && (
              <span
                className="text-[11px] font-mono px-2 py-0.5 rounded-full"
                style={{
                  background: "oklch(0.785 0.135 200 / 0.10)",
                  color: "oklch(0.785 0.135 200)",
                  border: "1px solid oklch(0.785 0.135 200 / 0.25)",
                }}
              >
                {effectiveFilter === "all"
                  ? `${rows.length} pairs`
                  : `${sorted.length} / ${rows.length} pairs`}
              </span>
            )}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{
                background: loading
                  ? "oklch(0.85 0.18 85 / 0.12)"
                  : "oklch(0.723 0.185 150 / 0.12)",
                border: `1px solid ${
                  loading
                    ? "oklch(0.85 0.18 85 / 0.3)"
                    : "oklch(0.723 0.185 150 / 0.3)"
                }`,
              }}
            >
              <Wifi
                className="w-3 h-3"
                style={{
                  color: loading
                    ? "oklch(0.85 0.18 85)"
                    : "oklch(0.723 0.185 150)",
                }}
              />
              <span
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{
                  color: loading
                    ? "oklch(0.85 0.18 85)"
                    : "oklch(0.723 0.185 150)",
                }}
              >
                {loading ? "LOADING" : "LIVE"}
              </span>
            </div>
          </div>
        </div>

        {/* Filter tabs row */}
        <div
          className="flex flex-wrap items-center gap-1.5 mt-3"
          data-ocid="volume.filter.tab"
        >
          {visibleTabs.map((tab) => {
            const isActive = effectiveFilter === tab.key;
            const count = categoryCounts[tab.key];
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setAssetFilter(tab.key)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-150 select-none"
                style={{
                  background: isActive
                    ? "oklch(0.785 0.135 200 / 0.15)"
                    : "oklch(1 0 0 / 0.04)",
                  border: isActive
                    ? "1px solid oklch(0.785 0.135 200 / 0.55)"
                    : "1px solid oklch(1 0 0 / 0.08)",
                  color: isActive
                    ? "oklch(0.785 0.135 200)"
                    : "oklch(0.550 0.015 240)",
                  fontWeight: isActive ? 600 : 400,
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "oklch(1 0 0 / 0.07)";
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "oklch(0.720 0.015 240)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "oklch(1 0 0 / 0.04)";
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "oklch(0.550 0.015 240)";
                  }
                }}
              >
                <span>{tab.label}</span>
                {!loading && (
                  <span
                    className="font-mono text-[10px] px-1 py-0 rounded"
                    style={{
                      background: isActive
                        ? "oklch(0.785 0.135 200 / 0.20)"
                        : "oklch(1 0 0 / 0.06)",
                      color: isActive
                        ? "oklch(0.785 0.135 200)"
                        : "oklch(0.450 0.015 240)",
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow
              style={{
                background: "oklch(0.145 0.018 240)",
                borderBottom: "1px solid oklch(1 0 0 / 0.07)",
              }}
            >
              <TableHead className="pl-5 py-3 text-xs whitespace-nowrap">
                {headerBtn("Symbol", "cleanSymbol")}
              </TableHead>
              <TableHead className="py-3 text-xs whitespace-nowrap">
                {headerBtn("Last Price", "lastPrice")}
              </TableHead>
              <TableHead className="py-3 text-xs whitespace-nowrap">
                {headerBtn("24h Change", "priceChangePercent")}
              </TableHead>
              <TableHead className="py-3 text-xs whitespace-nowrap">
                {headerBtn("Volume", "volume")}
              </TableHead>
              <TableHead className="py-3 text-xs whitespace-nowrap">
                {headerBtn("Quote Volume", "quoteVolume")}
              </TableHead>
              <TableHead className="py-3 text-xs whitespace-nowrap">
                {headerBtn("24h High", "highPrice")}
              </TableHead>
              <TableHead className="pr-5 py-3 text-xs whitespace-nowrap">
                {headerBtn("24h Low", "lowPrice")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? SKEL_ROWS.map((rowId, rowIdx) => (
                  <TableRow
                    key={rowId}
                    style={{ borderBottom: "1px solid oklch(1 0 0 / 0.04)" }}
                    data-ocid={`volume.item.${rowIdx + 1}`}
                  >
                    {SKEL_COLS.map((col) => (
                      <TableCell key={col.id} className={`py-3 ${col.cls}`}>
                        <Skeleton
                          className="h-4 rounded"
                          style={{
                            width: col.w,
                            background: "oklch(1 0 0 / 0.06)",
                          }}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : sorted.map((row, idx) => {
                  const isPositive = row.priceChangePercent >= 0;
                  return (
                    <TableRow
                      key={row.symbol}
                      data-ocid={`volume.item.${idx + 1}`}
                      className="transition-colors cursor-default"
                      style={{
                        borderBottom: "1px solid oklch(1 0 0 / 0.04)",
                      }}
                      onMouseEnter={(e) => {
                        (
                          e.currentTarget as HTMLTableRowElement
                        ).style.background = "oklch(1 0 0 / 0.025)";
                      }}
                      onMouseLeave={(e) => {
                        (
                          e.currentTarget as HTMLTableRowElement
                        ).style.background = "";
                      }}
                    >
                      {/* Symbol */}
                      <TableCell className="pl-5 py-3">
                        <div className="flex flex-col">
                          <span
                            className="text-sm font-semibold font-mono whitespace-nowrap"
                            style={{ color: "oklch(0.910 0.015 240)" }}
                          >
                            {row.cleanSymbol}
                          </span>
                          <span
                            className="text-[10px] mt-0.5"
                            style={{ color: "oklch(0.450 0.015 240)" }}
                          >
                            {row.symbol.includes("_LEVERAGE")
                              ? "Leverage"
                              : row.symbol.includes("_SPOT")
                                ? "Spot"
                                : ""}
                          </span>
                        </div>
                      </TableCell>

                      {/* Last Price */}
                      <TableCell className="py-3">
                        <span
                          className="font-mono text-sm"
                          style={{ color: "oklch(0.870 0.012 240)" }}
                        >
                          {row.lastPrice > 0
                            ? row.lastPrice.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : "\u2014"}
                        </span>
                      </TableCell>

                      {/* 24h Change */}
                      <TableCell className="py-3">
                        <div
                          className="flex items-center gap-1 text-sm font-semibold"
                          style={{
                            color: isPositive
                              ? "oklch(0.723 0.185 150)"
                              : "oklch(0.637 0.220 25)",
                          }}
                        >
                          {isPositive ? (
                            <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span className="font-mono">
                            {isPositive ? "+" : ""}
                            {row.priceChangePercent.toFixed(2)}%
                          </span>
                        </div>
                      </TableCell>

                      {/* Volume (base) */}
                      <TableCell className="py-3">
                        <span
                          className="font-mono text-sm"
                          style={{ color: "oklch(0.700 0.015 240)" }}
                        >
                          {row.volume > 0
                            ? formatBaseVolume(row.volume)
                            : "\u2014"}
                        </span>
                      </TableCell>

                      {/* Quote Volume (USD) */}
                      <TableCell className="py-3">
                        <span
                          className="font-mono text-sm font-medium"
                          style={{ color: "oklch(0.785 0.135 200)" }}
                        >
                          {row.quoteVolume > 0
                            ? formatVolume(row.quoteVolume)
                            : "\u2014"}
                        </span>
                      </TableCell>

                      {/* 24h High */}
                      <TableCell className="py-3">
                        <span
                          className="font-mono text-sm"
                          style={{ color: "oklch(0.723 0.185 150)" }}
                        >
                          {row.highPrice > 0
                            ? row.highPrice.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : "\u2014"}
                        </span>
                      </TableCell>

                      {/* 24h Low */}
                      <TableCell className="pr-5 py-3">
                        <span
                          className="font-mono text-sm"
                          style={{ color: "oklch(0.637 0.220 25)" }}
                        >
                          {row.lowPrice > 0
                            ? row.lowPrice.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : "\u2014"}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </div>

      {/* Empty state */}
      {!loading && sorted.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-16 gap-3"
          data-ocid="volume.empty_state"
        >
          <span className="text-4xl" role="img" aria-label="no data">
            📊
          </span>
          <p className="text-sm" style={{ color: "oklch(0.500 0.015 240)" }}>
            No assets found in this category
          </p>
        </div>
      )}
    </div>
  );
}
