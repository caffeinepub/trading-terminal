import { Skeleton } from "@/components/ui/skeleton";
import { TrendingDown, TrendingUp, Wifi } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface MarketAsset {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  sparklineData: number[];
}

const ASSET_CONFIG = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", color: "#F7931A" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", color: "#627EEA" },
  { id: "ripple", symbol: "XRP", name: "Ripple", color: "#00AAE4" },
];

function SparklineChart({
  data,
  positive,
}: { data: number[]; positive: boolean }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 64;
  const h = 28;
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
      className="shrink-0"
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

export function MarketWatch() {
  const [assets, setAssets] = useState<MarketAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const sparklineHistoryRef = useRef<Record<string, number[]>>({});

  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,ripple&vs_currencies=usd&include_24hr_change=true",
      );
      if (!res.ok) throw new Error("CoinGecko API failed");
      const data = await res.json();
      const updated: MarketAsset[] = ASSET_CONFIG.map((cfg) => {
        const entry = data[cfg.id];
        const price = entry?.usd ?? 0;
        const hist = sparklineHistoryRef.current[cfg.id] ?? [];
        const newHist = [...hist, price].slice(-20);
        sparklineHistoryRef.current[cfg.id] = newHist;
        return {
          id: cfg.id,
          symbol: cfg.symbol,
          name: cfg.name,
          price,
          change24h: entry?.usd_24h_change ?? 0,
          sparklineData: newHist,
        };
      });
      setAssets(updated);
      setLastUpdated(new Date());
    } catch {
      // Silently fail — keep last known prices
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const id = setInterval(fetchPrices, 30_000);
    return () => clearInterval(id);
  }, [fetchPrices]);

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
            background: "oklch(0.723 0.185 150 / 0.12)",
            border: "1px solid oklch(0.723 0.185 150 / 0.3)",
          }}
        >
          <Wifi
            className="w-3 h-3"
            style={{ color: "oklch(0.723 0.185 150)" }}
          />
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "oklch(0.723 0.185 150)" }}
          >
            LIVE
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
        ) : (
          <div className="space-y-1">
            {assets.map((asset) => {
              const cfg = ASSET_CONFIG.find((c) => c.id === asset.id);
              const isPositive = asset.change24h >= 0;
              return (
                <div
                  key={asset.id}
                  data-ocid="market.item.1"
                  className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-colors hover:bg-white/[0.03]"
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
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-sm font-semibold"
                        style={{ color: "oklch(0.910 0.015 240)" }}
                      >
                        {asset.symbol}
                      </span>
                      <span
                        className="text-[11px]"
                        style={{ color: "oklch(0.500 0.015 240)" }}
                      >
                        {asset.name}
                      </span>
                    </div>
                    <div
                      className="text-sm font-mono font-semibold mt-0.5"
                      style={{ color: "oklch(0.870 0.012 240)" }}
                    >
                      $
                      {asset.price.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>

                  {/* Sparkline */}
                  <SparklineChart
                    data={asset.sparklineData}
                    positive={isPositive}
                  />

                  {/* Change */}
                  <div className="text-right shrink-0">
                    <div
                      className="flex items-center justify-end gap-0.5 text-xs font-semibold"
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
                      className="text-[10px] mt-0.5"
                      style={{ color: "oklch(0.500 0.015 240)" }}
                    >
                      24h
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Volume row */}
      <div
        className="px-5 py-3"
        style={{ borderTop: "1px solid oklch(1 0 0 / 0.07)" }}
      >
        <div className="grid grid-cols-3 gap-2">
          {["BTC", "ETH", "XRP"].map((sym) => (
            <div key={sym} className="text-center">
              <div
                className="text-[10px] uppercase tracking-wider mb-1"
                style={{ color: "oklch(0.500 0.015 240)" }}
              >
                {sym}
              </div>
              <div
                className="h-1.5 rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, oklch(0.785 0.135 200), oklch(0.620 0.170 260))",
                  opacity: sym === "BTC" ? 1 : sym === "ETH" ? 0.6 : 0.35,
                }}
              />
            </div>
          ))}
        </div>
        <p
          className="text-[10px] text-center mt-1.5"
          style={{ color: "oklch(0.450 0.012 240)" }}
        >
          Relative Volume
        </p>
      </div>
    </div>
  );
}
