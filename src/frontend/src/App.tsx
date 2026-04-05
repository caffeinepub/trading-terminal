import { Toaster } from "@/components/ui/sonner";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { BtcChart } from "./components/BtcChart";
import { Footer } from "./components/Footer";
import { MarketWatch } from "./components/MarketWatch";
import { TopNav } from "./components/TopNav";
import { TradesTable } from "./components/TradesTable";
import { TradingStatsPanel } from "./components/TradingStats";
import { VolumeTable } from "./components/VolumeTable";
import {
  useGetAllTrades,
  useGetTradingStats,
  useSeedSampleTrades,
} from "./hooks/useQueries";

export type AssetSymbol =
  | "BTC/USD_LEVERAGE"
  | "ETH/USD_LEVERAGE"
  | "LTC/USD_LEVERAGE";

function App() {
  const { data: trades = [], isLoading: tradesLoading } = useGetAllTrades();
  const { data: stats, isLoading: statsLoading } = useGetTradingStats();
  const { mutate: seedTrades } = useSeedSampleTrades();
  const seededRef = useRef(false);

  const [selectedSymbol, setSelectedSymbol] =
    useState<AssetSymbol>("BTC/USD_LEVERAGE");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeView, setActiveView] = useState("Dashboard");

  // Seed sample trades on first load if empty
  useEffect(() => {
    if (!tradesLoading && trades.length === 0 && !seededRef.current) {
      seededRef.current = true;
      seedTrades();
    }
  }, [tradesLoading, trades.length, seedTrades]);

  const isVolume = activeView === "Volume";

  return (
    <div className="min-h-screen flex flex-col" data-ocid="dashboard.page">
      <TopNav
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeView={activeView}
        onViewChange={setActiveView}
      />

      <main className="flex-1 px-4 md:px-6 py-6 max-w-[1600px] mx-auto w-full">
        {/* 3-column grid: hidden on Volume tab */}
        {!isVolume && (
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-4 mb-4"
            style={{ minHeight: "540px" }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {/* Left: Market Watch */}
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.05, ease: "easeOut" }}
              data-ocid="market.panel"
            >
              <MarketWatch
                selectedSymbol={selectedSymbol}
                onSelectSymbol={setSelectedSymbol}
                searchQuery={searchQuery}
              />
            </motion.div>

            {/* Center: Chart */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
              data-ocid="chart.panel"
            >
              <BtcChart symbol={selectedSymbol} />
            </motion.div>

            {/* Right: Trading Stats */}
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
              data-ocid="stats.panel"
            >
              <TradingStatsPanel stats={stats} loading={statsLoading} />
            </motion.div>
          </motion.div>
        )}

        {/* Bottom: Volume Table or Trades Table */}
        {isVolume ? (
          <motion.div
            key="volume"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <VolumeTable />
          </motion.div>
        ) : (
          <motion.div
            key="trades"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            data-ocid="trades.panel"
          >
            <TradesTable trades={trades} loading={tradesLoading} />
          </motion.div>
        )}
      </main>

      <Footer />
      <Toaster
        theme="dark"
        toastOptions={{
          style: {
            background: "oklch(0.168 0.020 240)",
            border: "1px solid oklch(1 0 0 / 0.12)",
            color: "oklch(0.910 0.015 240)",
          },
        }}
      />
    </div>
  );
}

export default App;
