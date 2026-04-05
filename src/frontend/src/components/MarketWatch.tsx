import { Skeleton } from "@/components/ui/skeleton";
import { useDzengiPriceFeed } from "@/hooks/useDzengiPriceFeed";
import { TrendingDown, TrendingUp, Wifi } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AssetSymbol } from "../App";

const DZENGI_MARKET_BASE = "https://demo-api-adapter.dzengi.com/api/v1";

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
}

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
];

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

interface MarketWatchProps {
  selectedSymbol: AssetSymbol;
  onSelectSymbol: (symbol: AssetSymbol) => void;
  searchQuery: string;
}

export function MarketWatch({
  selectedSymbol,
  onSelectSymbol,
  searchQuery,
}: MarketWatchProps) {
  const [assets, setAssets] = useState<MarketAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const sparklineHistoryRef = useRef<Record<string, number[]>>({});
  const isMountedRef = useRef(true);

  // Dzengi price feed
  const { prices, status: wsStatus } = useDzengiPriceFeed();

  // Initial REST fetch to seed prices
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
        };
      });
      setAssets(updated);
      setLastUpdated(new Date());
    } catch {
      // Silently fail — keep last known prices
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchPrices();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchPrices]);

  // Sync feed prices into assets state
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

  // Filter assets by search query
  const filteredAssets = searchQuery.trim()
    ? assets.filter(
        (a) =>
          a.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : assets;

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
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid oklch(1 0 0 / 0.07)" }}
      >
        <div>
          <h2
            className="text-base font-semibold"
            style={{ color: "oklch(0.910 0.015 240)" }}
          >
            Market Watch
          </h2>
          {lastUpdated && (
            <p
              className="text-[11px] mt-0.5"
              style={{ color: "oklch(0.500 0.015 240)" }}
            >
              Updated {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{
            background: badgeBg,
            border: `1px solid ${badgeBorder}`,
          }}
        >
          <Wifi className="w-3 h-3" style={{ color: badgeColor }} />
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: badgeColor }}
          >
            {badgeText}
          </span>
        </div>
      </div>

      {/* Asset list */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {loading ? (
          <div className="space-y-3 p-2">
            {["a", "b", "c"].map((k) => (
              <Skeleton
                key={k}
                className="h-16 w-full rounded-xl"
                style={{ background: "oklch(1 0 0 / 0.05)" }}
              />
            ))}
          </div>
        ) : filteredAssets.length === 0 ? (
          <div
            className="flex items-center justify-center h-24 text-sm"
            style={{ color: "oklch(0.500 0.015 240)" }}
          >
            No results for "{searchQuery}"
          </div>
        ) : (
          <div className="space-y-1">
            {filteredAssets.map((asset) => {
              const cfg = ASSET_CONFIG.find((c) => c.id === asset.id);
              const isPositive = asset.change24h >= 0;
              const isSelected = selectedSymbol === asset.dzengiKey;
              return (
                <button
                  key={asset.id}
                  type="button"
                  data-ocid="market.item.1"
                  onClick={() => onSelectSymbol(asset.dzengiKey)}
                  className="w-full flex items-center gap-2 px-2 py-2.5 rounded-xl cursor-pointer transition-colors text-left"
                  style={{
                    background: isSelected
                      ? "oklch(0.785 0.135 200 / 0.08)"
                      : "transparent",
                    border: isSelected
                      ? "1px solid oklch(0.785 0.135 200 / 0.2)"
                      : "1px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "oklch(1 0 0 / 0.03)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "transparent";
                    }
                  }}
                >
                  {/* Icon */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{
                      background: `${cfg?.color}20`,
                      border: `1px solid ${cfg?.color}40`,
                      color: cfg?.color,
                    }}
                  >
                    {asset.symbol[0]}
                  </div>

                  {/* Name + price */}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-sm font-semibold truncate"
                        style={{ color: "oklch(0.910 0.015 240)" }}
                      >
                        {asset.symbol}
                      </span>
                      <span
                        className="text-[11px] truncate"
                        style={{ color: "oklch(0.500 0.015 240)" }}
                      >
                        {asset.name}
                      </span>
                    </div>
                    <div
                      className="text-sm font-mono font-semibold mt-0.5 truncate"
                      style={{ color: "oklch(0.870 0.012 240)" }}
                    >
                      $
                      {asset.price.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>

                  {/* Right column: sparkline + change % */}
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <SparklineChart
                      data={asset.sparklineData}
                      positive={isPositive}
                    />
                    <div
                      className="flex items-center gap-0.5 text-xs font-semibold"
                      style={{
                        color: isPositive
                          ? "oklch(0.723 0.185 150)"
                          : "oklch(0.637 0.220 25)",
                      }}
                    >
                      {isPositive ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {isPositive ? "+" : ""}
                      {asset.change24h.toFixed(2)}%
                    </div>
                    <div
                      className="text-[10px]"
                      style={{ color: "oklch(0.500 0.015 240)" }}
                    >
                      24h
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
