import { Skeleton } from "@/components/ui/skeleton";
import { useDzengiPriceFeed } from "@/hooks/useDzengiPriceFeed";
import { BarChart2, Lock, TrendingDown, TrendingUp, Wifi } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AssetSymbol } from "../App";

const DZENGI_MARKET_BASE = "https://api-adapter.dzengi.com/api/v1";
const ALL_TICKERS_INTERVAL_MS = 10_000;

// ── Type definitions ────────────────────────────────────────────────────────

interface MarketAsset {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  sparklineData: number[];
  dzengiKey: AssetSymbol;
  volume24h: number;
  quoteVolume24h: number;
  status?: "TRADING" | "BREAK" | "HALT";
  tradingHours?: string;
}

interface TickerRow {
  symbol: string;
  cleanSymbol: string;
  lastPrice: number;
  priceChangePercent: number;
  quoteVolume: number;
}

type AssetCategory =
  | "all"
  | "crypto"
  | "forex"
  | "stocks"
  | "commodities"
  | "indexes";

// ── Chart-switchable assets ─────────────────────────────────────────────────

const ASSET_CONFIG: {
  id: string;
  symbol: string;
  name: string;
  color: string;
  dzengiKey: AssetSymbol;
}[] = [
  {
    id: "bitcoin",
    symbol: "BTC",
    name: "Bitcoin",
    color: "#F7931A",
    dzengiKey: "BTC/USD_LEVERAGE",
  },
  {
    id: "ethereum",
    symbol: "ETH",
    name: "Ethereum",
    color: "#627EEA",
    dzengiKey: "ETH/USD_LEVERAGE",
  },
  {
    id: "litecoin",
    symbol: "LTC",
    name: "Litecoin",
    color: "#BFBBBB",
    dzengiKey: "LTC/USD_LEVERAGE",
  },
  {
    id: "xrp",
    symbol: "XRP",
    name: "XRP",
    color: "#346AA9",
    dzengiKey: "XRP/USD_LEVERAGE",
  },
  {
    id: "bnb",
    symbol: "BNB",
    name: "BNB",
    color: "#F3BA2F",
    dzengiKey: "BNB/USD",
  },
];

// Chart-switchable symbol lookup set
const CHART_SYMBOLS = new Set(ASSET_CONFIG.map((c) => c.symbol));

// ── Smart price formatter ───────────────────────────────────────────────────

function formatAssetPrice(price: number): string {
  if (price <= 0) return "--";
  if (price < 1) return `$${price.toFixed(4)}`;
  if (price < 100) {
    return `$${price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `$${price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatCompactPrice(price: number): string {
  if (price <= 0) return "--";
  if (price < 1) {
    return `$${price.toFixed(4)}`;
  }
  if (price < 100) {
    return `$${price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `$${price.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

// ── Asset classification ────────────────────────────────────────────────────

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
  "APE",
  "BNT",
  "CAKE",
  "CELO",
  "COTI",
  "CVC",
  "DAI",
  "ETC",
  "INJ",
  "JASMY",
  "LDO",
  "MEW",
  "PAXG",
  "QNT",
  "REP",
  "RSR",
  "RVN",
  "SHIB",
  "TON",
  "TWT",
  "UMA",
  "USDC",
  "USDT",
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
  "DXY",
]);

function classifyTicker(row: TickerRow): Exclude<AssetCategory, "all"> {
  const sym = row.cleanSymbol;

  if (!sym.includes("/")) {
    const base = sym.endsWith(".") ? sym.slice(0, -1) : sym;
    if (INDEX_SYMBOLS.has(base)) return "indexes";
    if (
      sym.includes("Gold") ||
      sym.includes("Silver") ||
      sym.includes("Oil") ||
      sym.includes("Gas") ||
      sym.includes("Copper") ||
      sym.includes("Platinum") ||
      sym.includes("Palladium") ||
      sym.includes("Corn") ||
      sym.includes("Soybean") ||
      sym.includes("Lead") ||
      sym.includes("Coffee") ||
      sym.includes("Cotton") ||
      sym.includes("Wheat") ||
      sym.includes("Sugar") ||
      sym.includes("Cocoa")
    )
      return "commodities";
    if (sym.includes(".")) return "stocks";
    if (CRYPTO_BASES.includes(sym)) return "crypto";
    return "stocks";
  }

  const pairBase = sym.split("/")[0];
  if (CRYPTO_BASES.includes(pairBase)) return "crypto";
  if (FOREX_PAIRS.includes(pairBase)) return "forex";
  if (COMMODITIES.includes(pairBase)) return "commodities";
  return "stocks";
}

function cleanSymbol(sym: string): string {
  return sym.replace(/_LEVERAGE$/, "").replace(/_SPOT$/, "");
}

function parseTickerRow(item: Record<string, unknown>): TickerRow | null {
  const sym = String(item.symbol ?? "");
  if (!sym) return null;
  return {
    symbol: sym,
    cleanSymbol: cleanSymbol(sym),
    lastPrice: Number.parseFloat(String(item.lastPrice ?? "0")),
    priceChangePercent: Number.parseFloat(
      String(item.priceChangePercent ?? "0"),
    ),
    quoteVolume: Number.parseFloat(String(item.quoteVolume ?? "0")),
  };
}

function deduplicateTickers(tickers: TickerRow[]): TickerRow[] {
  const noDotSet = new Set(
    tickers.map((r) => r.symbol).filter((s) => !s.endsWith(".")),
  );
  return tickers.filter(
    (r) => !r.symbol.endsWith(".") || !noDotSet.has(r.symbol.slice(0, -1)),
  );
}

// ── Sparkline ───────────────────────────────────────────────────────────────

function SparklineChart({
  data,
  positive,
}: { data: number[]; positive: boolean }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 52;
  const h = 24;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");
  const color = positive ? "oklch(0.723 0.185 150)" : "oklch(0.637 0.220 25)";
  const fillId = `sparkfill-${positive ? "pos" : "neg"}`;
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      overflow="hidden"
      aria-hidden="true"
      role="img"
    >
      <title>Price sparkline</title>
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={`${pts} ${w},${h} 0,${h}`}
        fill={`url(#${fillId})`}
        stroke="none"
      />
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Category filter tabs ─────────────────────────────────────────────────────

const CATEGORY_TABS: { key: AssetCategory; label: string }[] = [
  { key: "all", label: "All" },
  { key: "crypto", label: "Crypto" },
  { key: "forex", label: "Forex" },
  { key: "stocks", label: "Stocks" },
  { key: "commodities", label: "Cmdty" },
  { key: "indexes", label: "Index" },
];

// ── Props ────────────────────────────────────────────────────────────────────

interface MarketWatchProps {
  selectedSymbol: AssetSymbol;
  onSelectSymbol: (symbol: AssetSymbol) => void;
  searchQuery: string;
  compact?: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────

export function MarketWatch({
  selectedSymbol,
  onSelectSymbol,
  searchQuery,
  compact = false,
}: MarketWatchProps) {
  // Chart-switchable assets with sparklines
  const [assets, setAssets] = useState<MarketAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const sparklineHistoryRef = useRef<Record<string, number[]>>({});
  const isMountedRef = useRef(true);
  const exchangeInfoRef = useRef<
    Map<string, { status: string; tradingHours: string }>
  >(new Map());

  // All tickers from API
  const [allTickers, setAllTickers] = useState<TickerRow[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<AssetCategory>("all");

  // Dzengi price feed
  const { prices, status: wsStatus } = useDzengiPriceFeed();

  // Fetch exchangeInfo once on mount
  useEffect(() => {
    fetch(`${DZENGI_MARKET_BASE}/exchangeInfo`)
      .then((r) => r.json())
      .then((data) => {
        const map = new Map<string, { status: string; tradingHours: string }>();
        for (const s of data.symbols ?? []) {
          map.set(s.symbol, {
            status: s.status ?? "TRADING",
            tradingHours: s.tradingHours ?? "",
          });
        }
        exchangeInfoRef.current = map;
        if (isMountedRef.current) {
          setAssets((prev) =>
            prev.map((asset) => {
              const info = map.get(asset.dzengiKey);
              return info
                ? {
                    ...asset,
                    status: info.status as MarketAsset["status"],
                    tradingHours: info.tradingHours,
                  }
                : asset;
            }),
          );
        }
      })
      .catch(() => {});
  }, []);

  // Initial REST fetch for chart assets — seeds sparklines
  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch(`${DZENGI_MARKET_BASE}/ticker/24hr`);
      if (!res.ok) throw new Error("Dzengi API failed");
      const data: Array<{
        symbol: string;
        lastPrice: string;
        priceChangePercent: string;
        volume: string;
        quoteVolume: string;
      }> = await res.json();

      if (!isMountedRef.current) return;

      const updated: MarketAsset[] = ASSET_CONFIG.map((cfg) => {
        const entry = data.find((item) => item.symbol === cfg.dzengiKey);
        const price = entry ? Number.parseFloat(entry.lastPrice) : 0;
        const change24h = entry
          ? Number.parseFloat(entry.priceChangePercent)
          : 0;
        const volume24h = entry ? Number.parseFloat(entry.volume ?? "0") : 0;
        const quoteVolume24h = entry
          ? Number.parseFloat(entry.quoteVolume ?? "0")
          : 0;
        const hist = sparklineHistoryRef.current[cfg.id] ?? [];
        const newHist = [...hist, price].slice(-20);
        sparklineHistoryRef.current[cfg.id] = newHist;
        const info = exchangeInfoRef.current.get(cfg.dzengiKey);
        return {
          id: cfg.id,
          symbol: cfg.symbol,
          name: cfg.name,
          price,
          change24h,
          sparklineData: newHist,
          dzengiKey: cfg.dzengiKey,
          volume24h,
          quoteVolume24h,
          ...(info
            ? {
                status: info.status as MarketAsset["status"],
                tradingHours: info.tradingHours,
              }
            : {}),
        };
      });
      setAssets(updated);
      setLastUpdated(new Date());
    } catch {
      // Silently fail
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  // Fetch ALL tickers for the full asset list
  const fetchAllTickers = useCallback(async () => {
    try {
      const res = await fetch(`${DZENGI_MARKET_BASE}/ticker/24hr`);
      if (!res.ok) return;
      const data = await res.json();
      const arr: unknown[] = Array.isArray(data) ? data : [];
      const parsed = arr
        .map((item) => parseTickerRow(item as Record<string, unknown>))
        .filter((r): r is TickerRow => r !== null);
      const deduped = deduplicateTickers(parsed);
      if (isMountedRef.current) setAllTickers(deduped);
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    // Fetch both in parallel on mount
    fetchPrices();
    fetchAllTickers();

    // All tickers refresh every 10s
    const allTickersTimer = setInterval(
      fetchAllTickers,
      ALL_TICKERS_INTERVAL_MS,
    );

    return () => {
      isMountedRef.current = false;
      clearInterval(allTickersTimer);
    };
  }, [fetchPrices, fetchAllTickers]);

  // Sync feed prices into chart assets state (sparklines)
  useEffect(() => {
    if (!Object.keys(prices).length) return;

    setAssets((prev) => {
      const base: MarketAsset[] =
        prev.length > 0
          ? prev
          : ASSET_CONFIG.map((cfg) => ({
              id: cfg.id,
              symbol: cfg.symbol,
              name: cfg.name,
              price: 0,
              change24h: 0,
              sparklineData: [],
              dzengiKey: cfg.dzengiKey,
              volume24h: 0,
              quoteVolume24h: 0,
            }));

      return base.map((asset) => {
        const cfg = ASSET_CONFIG.find((c) => c.id === asset.id);
        if (!cfg) return asset;
        const feed = prices[cfg.dzengiKey];
        if (!feed || feed.price <= 0) return asset;

        const hist = sparklineHistoryRef.current[asset.id] ?? [];
        const newHist = [...hist, feed.price].slice(-20);
        sparklineHistoryRef.current[asset.id] = newHist;

        return {
          ...asset,
          price: feed.price,
          change24h: feed.change24h,
          sparklineData: newHist,
          volume24h: feed.volume24h ?? asset.volume24h,
          quoteVolume24h: feed.quoteVolume24h ?? asset.quoteVolume24h,
        };
      });
    });

    setLastUpdated(new Date());
    if (isMountedRef.current) setLoading(false);
  }, [prices]);

  // Badge appearance based on feed status
  const badgeColor =
    wsStatus === "connected" ? "oklch(0.723 0.185 150)" : "oklch(0.85 0.18 85)";
  const badgeBg =
    wsStatus === "connected"
      ? "oklch(0.723 0.185 150 / 0.12)"
      : "oklch(0.85 0.18 85 / 0.12)";
  const badgeBorder =
    wsStatus === "connected"
      ? "oklch(0.723 0.185 150 / 0.3)"
      : "oklch(0.85 0.18 85 / 0.3)";
  const badgeText = wsStatus === "connected" ? "LIVE" : "CONNECTING";

  // Compute category counts from all tickers
  const categoryCounts = {
    all: allTickers.length,
    crypto: allTickers.filter((r) => classifyTicker(r) === "crypto").length,
    forex: allTickers.filter((r) => classifyTicker(r) === "forex").length,
    stocks: allTickers.filter((r) => classifyTicker(r) === "stocks").length,
    commodities: allTickers.filter((r) => classifyTicker(r) === "commodities")
      .length,
    indexes: allTickers.filter((r) => classifyTicker(r) === "indexes").length,
  };

  // Filter all tickers by category + search
  const afterCategory =
    categoryFilter === "all"
      ? allTickers
      : allTickers.filter((r) => classifyTicker(r) === categoryFilter);

  const searchTerm = searchQuery.trim().toUpperCase();
  const filteredTickers = searchTerm
    ? afterCategory.filter((r) =>
        r.cleanSymbol.toUpperCase().includes(searchTerm),
      )
    : afterCategory;

  // Sorted by quote volume descending (most active first)
  const sortedTickers = [...filteredTickers].sort(
    (a, b) => b.quoteVolume - a.quoteVolume,
  );

  // Chart assets filtered by search (for compact mode)
  const filteredAssets = searchQuery.trim()
    ? assets.filter(
        (a) =>
          a.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : assets;

  // ── Compact mode: horizontal strip ──────────────────────────────────────
  if (compact) {
    return (
      <div
        className="rounded-xl px-3 py-2"
        style={{
          background:
            "linear-gradient(145deg, oklch(0.155 0.020 240), oklch(0.148 0.018 240))",
          border: "1px solid oklch(1 0 0 / 0.08)",
        }}
      >
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
          {/* Live badge */}
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-full shrink-0"
            style={{ background: badgeBg, border: `1px solid ${badgeBorder}` }}
          >
            <Wifi className="w-2.5 h-2.5" style={{ color: badgeColor }} />
            <span
              className="text-[9px] font-semibold uppercase tracking-wider"
              style={{ color: badgeColor }}
            >
              {badgeText}
            </span>
          </div>

          {/* Asset pills */}
          {loading
            ? ["a", "b", "c", "d", "e", "f"].map((k) => (
                <Skeleton
                  key={k}
                  className="h-10 w-28 rounded-xl shrink-0"
                  style={{ background: "oklch(1 0 0 / 0.05)" }}
                />
              ))
            : filteredAssets.map((asset) => {
                const cfg = ASSET_CONFIG.find((c) => c.id === asset.id);
                const isPositive = asset.change24h >= 0;
                const isSelected = selectedSymbol === asset.dzengiKey;
                return (
                  <button
                    key={asset.id}
                    type="button"
                    data-ocid="market.item.1"
                    onClick={() => onSelectSymbol(asset.dzengiKey)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors shrink-0"
                    style={{
                      background: isSelected
                        ? "oklch(0.785 0.135 200 / 0.10)"
                        : "oklch(1 0 0 / 0.04)",
                      border: isSelected
                        ? "1px solid oklch(0.785 0.135 200 / 0.25)"
                        : "1px solid oklch(1 0 0 / 0.07)",
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: cfg?.color ?? "#888" }}
                    />
                    <span
                      className="text-sm font-bold font-mono"
                      style={{ color: "oklch(0.910 0.015 240)" }}
                    >
                      {asset.symbol}
                    </span>
                    <span
                      className="text-xs font-mono"
                      style={{ color: "oklch(0.780 0.015 240)" }}
                    >
                      {formatCompactPrice(asset.price)}
                    </span>
                    <span
                      className="text-[11px] font-semibold"
                      style={{
                        color: isPositive
                          ? "oklch(0.723 0.185 150)"
                          : "oklch(0.637 0.220 25)",
                      }}
                    >
                      {isPositive ? "+" : ""}
                      {asset.change24h.toFixed(2)}%
                    </span>
                  </button>
                );
              })}
        </div>
      </div>
    );
  }

  // ── Full mode: all assets panel ───────────────────────────────────────────
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
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid oklch(1 0 0 / 0.07)" }}
      >
        <div>
          <h2
            className="text-sm font-semibold"
            style={{ color: "oklch(0.910 0.015 240)" }}
          >
            Market Watch
          </h2>
          {lastUpdated && (
            <p
              className="text-[10px] mt-0.5"
              style={{ color: "oklch(0.500 0.015 240)" }}
            >
              {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-full"
          style={{ background: badgeBg, border: `1px solid ${badgeBorder}` }}
        >
          <Wifi className="w-2.5 h-2.5" style={{ color: badgeColor }} />
          <span
            className="text-[9px] font-semibold uppercase tracking-wider"
            style={{ color: badgeColor }}
          >
            {badgeText}
          </span>
        </div>
      </div>

      {/* Chart assets with sparklines — always shown at top */}
      {loading ? (
        <div
          className="px-3 py-2 space-y-1"
          style={{ borderBottom: "1px solid oklch(1 0 0 / 0.07)" }}
        >
          {["a", "b", "c", "d", "e", "f"].map((k) => (
            <Skeleton
              key={k}
              className="h-14 w-full rounded-xl"
              style={{ background: "oklch(1 0 0 / 0.05)" }}
            />
          ))}
        </div>
      ) : (
        <div
          className="px-3 pt-2 pb-1 space-y-1"
          style={{ borderBottom: "1px solid oklch(1 0 0 / 0.07)" }}
        >
          {assets.map((asset) => {
            const cfg = ASSET_CONFIG.find((c) => c.id === asset.id);
            const isPositive = asset.change24h >= 0;
            const isSelected = selectedSymbol === asset.dzengiKey;
            const isClosed =
              asset.status === "BREAK" || asset.status === "HALT";
            return (
              <button
                key={asset.id}
                type="button"
                data-ocid="market.item.1"
                onClick={() => onSelectSymbol(asset.dzengiKey)}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-xl cursor-pointer transition-colors text-left"
                style={{
                  background: isSelected
                    ? "oklch(0.785 0.135 200 / 0.08)"
                    : "transparent",
                  border: isSelected
                    ? "1px solid oklch(0.785 0.135 200 / 0.2)"
                    : "1px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected)
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "oklch(1 0 0 / 0.03)";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected)
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "transparent";
                }}
              >
                {/* Icon */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{
                    background: `${cfg?.color}20`,
                    border: `1px solid ${cfg?.color}40`,
                    color: cfg?.color,
                  }}
                >
                  {asset.symbol[0]}
                </div>

                {/* Name + price */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span
                      className="text-xs font-semibold"
                      style={{ color: "oklch(0.910 0.015 240)" }}
                    >
                      {asset.symbol}
                    </span>
                    <BarChart2
                      className="w-2.5 h-2.5 shrink-0"
                      style={{ color: "oklch(0.785 0.135 200)" }}
                    />
                    {isClosed && (
                      <span title={asset.tradingHours}>
                        <Lock
                          className="w-2.5 h-2.5 shrink-0"
                          style={{
                            color:
                              asset.status === "HALT"
                                ? "oklch(0.637 0.220 25)"
                                : "oklch(0.85 0.18 85)",
                          }}
                        />
                      </span>
                    )}
                  </div>
                  <div
                    className="text-xs font-mono font-semibold"
                    style={{ color: "oklch(0.870 0.012 240)" }}
                  >
                    {formatAssetPrice(asset.price)}
                  </div>
                </div>

                {/* Sparkline + change */}
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  <SparklineChart
                    data={asset.sparklineData}
                    positive={isPositive}
                  />
                  <div
                    className="flex items-center gap-0.5 text-[10px] font-semibold"
                    style={{
                      color: isPositive
                        ? "oklch(0.723 0.185 150)"
                        : "oklch(0.637 0.220 25)",
                    }}
                  >
                    {isPositive ? (
                      <TrendingUp className="w-2.5 h-2.5" />
                    ) : (
                      <TrendingDown className="w-2.5 h-2.5" />
                    )}
                    {isPositive ? "+" : ""}
                    {asset.change24h.toFixed(2)}%
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Category filter pills */}
      <div
        className="flex items-center gap-1 px-3 py-2 flex-wrap"
        style={{ borderBottom: "1px solid oklch(1 0 0 / 0.07)" }}
      >
        {CATEGORY_TABS.map(({ key, label }) => {
          const isActive = categoryFilter === key;
          const count = categoryCounts[key] ?? 0;
          return (
            <button
              key={key}
              type="button"
              data-ocid={`market.${key}.tab`}
              onClick={() => setCategoryFilter(key)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors"
              style={{
                background: isActive
                  ? "oklch(0.785 0.135 200 / 0.18)"
                  : "oklch(1 0 0 / 0.04)",
                border: isActive
                  ? "1px solid oklch(0.785 0.135 200 / 0.40)"
                  : "1px solid oklch(1 0 0 / 0.08)",
                color: isActive
                  ? "oklch(0.785 0.135 200)"
                  : "oklch(0.600 0.015 240)",
              }}
            >
              {label}
              {count > 0 && (
                <span
                  className="text-[9px] font-bold px-1 rounded-full"
                  style={{
                    background: isActive
                      ? "oklch(0.785 0.135 200 / 0.25)"
                      : "oklch(1 0 0 / 0.08)",
                    color: isActive
                      ? "oklch(0.900 0.080 200)"
                      : "oklch(0.500 0.015 240)",
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* All tickers scrollable list */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ maxHeight: "calc(100vh - 580px)" }}
      >
        {allTickers.length === 0 && !loading ? (
          <div
            className="flex items-center justify-center h-16 text-xs"
            style={{ color: "oklch(0.500 0.015 240)" }}
          >
            Loading market data...
          </div>
        ) : sortedTickers.length === 0 ? (
          <div
            className="flex items-center justify-center h-16 text-xs"
            data-ocid="market.empty_state"
            style={{ color: "oklch(0.500 0.015 240)" }}
          >
            {searchQuery ? `No results for "${searchQuery}"` : "No assets"}
          </div>
        ) : (
          <div className="py-1">
            {sortedTickers.map((ticker, idx) => {
              const isChartAsset = CHART_SYMBOLS.has(
                ticker.cleanSymbol.split("/")[0],
              );
              const chartCfg = isChartAsset
                ? ASSET_CONFIG.find((c) =>
                    ticker.cleanSymbol.startsWith(c.symbol),
                  )
                : null;
              const isPositive = ticker.priceChangePercent >= 0;
              const category = classifyTicker(ticker);
              const categoryLabel =
                category === "crypto"
                  ? "Crypto"
                  : category === "forex"
                    ? "Forex"
                    : category === "stocks"
                      ? "Stock"
                      : category === "commodities"
                        ? "Cmdty"
                        : category === "indexes"
                          ? "Index"
                          : "Other";

              // Format price
              let priceStr = "--";
              if (ticker.lastPrice > 0) {
                if (ticker.lastPrice >= 1000) {
                  priceStr = ticker.lastPrice.toLocaleString("en-US", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  });
                } else if (ticker.lastPrice >= 1) {
                  priceStr = ticker.lastPrice.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  });
                } else {
                  priceStr = ticker.lastPrice.toFixed(6);
                }
              }

              // Chart assets are already shown in the sparklines section above
              if (isChartAsset && chartCfg) {
                return null;
              }

              // Regular (non-chart) ticker row
              return (
                <div
                  key={ticker.symbol}
                  data-ocid={`market.item.${idx + 1}`}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.025] transition-colors"
                >
                  {/* Category dot */}
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{
                      background:
                        category === "crypto"
                          ? "oklch(0.785 0.135 200)"
                          : category === "forex"
                            ? "oklch(0.723 0.185 150)"
                            : category === "stocks"
                              ? "oklch(0.680 0.150 280)"
                              : category === "commodities"
                                ? "oklch(0.75 0.16 60)"
                                : category === "indexes"
                                  ? "oklch(0.85 0.18 85)"
                                  : "oklch(0.500 0.015 240)",
                    }}
                  />

                  {/* Symbol + category */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-[11px] font-bold font-mono truncate"
                        style={{ color: "oklch(0.870 0.015 240)" }}
                      >
                        {ticker.cleanSymbol}
                      </span>
                      <span
                        className="text-[9px] font-medium px-1 rounded shrink-0"
                        style={{
                          background: "oklch(1 0 0 / 0.05)",
                          color: "oklch(0.500 0.015 240)",
                        }}
                      >
                        {categoryLabel}
                      </span>
                    </div>
                  </div>

                  {/* Price + change */}
                  <div className="flex flex-col items-end shrink-0">
                    <span
                      className="text-[11px] font-mono"
                      style={{ color: "oklch(0.870 0.012 240)" }}
                    >
                      {ticker.lastPrice > 0 ? `$${priceStr}` : "--"}
                    </span>
                    <span
                      className="text-[10px] font-semibold"
                      style={{
                        color: isPositive
                          ? "oklch(0.723 0.185 150)"
                          : "oklch(0.637 0.220 25)",
                      }}
                    >
                      {isPositive ? "+" : ""}
                      {ticker.priceChangePercent.toFixed(2)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
