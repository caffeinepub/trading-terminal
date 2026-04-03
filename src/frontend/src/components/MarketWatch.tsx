import { Skeleton } from "@/components/ui/skeleton";
import { TrendingDown, TrendingUp, Wifi } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const DZENGI_MARKET_BASE = "https://marketcap.dzengi.com/api/v1";

interface MarketAsset {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  sparklineData: number[];
}

const ASSET_CONFIG = [
  {
    id: "bitcoin",
    symbol: "BTC",
    name: "Bitcoin",
    color: "#F7931A",
    dzengiKey: "BTC/USD",
  },
  {
    id: "ethereum",
    symbol: "ETH",
    name: "Ethereum",
    color: "#627EEA",
    dzengiKey: "ETH/USD",
  },
  {
    id: "ripple",
    symbol: "XRP",
    name: "Ripple",
    color: "#00AAE4",
    dzengiKey: "XRP/USD",
  },
];

// Map Binance stream prefix → ASSET_CONFIG id
const STREAM_TO_ASSET_ID: Record<string, string> = {
  btcusdt: "bitcoin",
  ethusdt: "ethereum",
  xrpusdt: "ripple",
};

type WsStatus = "connecting" | "connected" | "disconnected";

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
  const [wsStatus, setWsStatus] = useState<WsStatus>("connecting");
  const sparklineHistoryRef = useRef<Record<string, number[]>>({});
  const isMountedRef = useRef(true);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial REST fetch to populate prices before WS connects
  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch(`${DZENGI_MARKET_BASE}/ticker`);
      if (!res.ok) throw new Error("Dzengi API failed");
      const data: Record<
        string,
        {
          last_price: number;
          past_24hrs_price_change: number;
        }
      > = await res.json();

      if (!isMountedRef.current) return;

      const updated: MarketAsset[] = ASSET_CONFIG.map((cfg) => {
        const entry = data[cfg.dzengiKey];
        const price = entry?.last_price ?? 0;
        const hist = sparklineHistoryRef.current[cfg.id] ?? [];
        const newHist = [...hist, price].slice(-20);
        sparklineHistoryRef.current[cfg.id] = newHist;
        return {
          id: cfg.id,
          symbol: cfg.symbol,
          name: cfg.name,
          price,
          change24h: entry?.past_24hrs_price_change ?? 0,
          sparklineData: newHist,
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

  // Initial REST load on mount
  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  // WebSocket for live ticks (runs once on mount)
  useEffect(() => {
    isMountedRef.current = true;

    function connect() {
      if (!isMountedRef.current) return;

      setWsStatus("connecting");
      const ws = new WebSocket(
        "wss://stream.binance.com/stream?streams=btcusdt@ticker/ethusdt@ticker/xrpusdt@ticker",
      );
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) return;
        setWsStatus("connected");
      };

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;
        try {
          const envelope = JSON.parse(event.data as string) as {
            stream: string;
            data: { c: string; p: string; P: string };
          };
          // stream looks like "btcusdt@ticker"
          const streamPrefix = envelope.stream.split("@")[0];
          const assetId = STREAM_TO_ASSET_ID[streamPrefix];
          if (!assetId) return;

          const price = Number.parseFloat(envelope.data.c);
          const changePct = Number.parseFloat(envelope.data.P);

          // Append to sparkline history
          const hist = sparklineHistoryRef.current[assetId] ?? [];
          const newHist = [...hist, price].slice(-20);
          sparklineHistoryRef.current[assetId] = newHist;

          setAssets((prev) => {
            const updated = prev.map((a) => {
              if (a.id !== assetId) return a;
              return {
                ...a,
                price,
                change24h: changePct,
                sparklineData: newHist,
              };
            });
            // If assets not yet populated, don't break rendering
            return updated.length ? updated : prev;
          });
          setLastUpdated(new Date());
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (!isMountedRef.current) return;
        setWsStatus("disconnected");
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

  // Badge appearance based on WS status
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
