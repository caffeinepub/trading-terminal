import { Toaster } from "@/components/ui/sonner";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { AnalysisPanel } from "./components/AnalysisPanel";
import { BtcChart } from "./components/BtcChart";
import { Footer } from "./components/Footer";
import { MarketWatch } from "./components/MarketWatch";
import { TopNav } from "./components/TopNav";
import { TradesTable } from "./components/TradesTable";
import { TradingStatsPanel } from "./components/TradingStats";
import { VolumeTable } from "./components/VolumeTable";
import { useIsMobile } from "./hooks/use-mobile";
import {
  useGetAllTrades,
  useGetTradingStats,
  useSeedSampleTrades,
} from "./hooks/useQueries";

export type AssetSymbol =
  | "BTC/USD_LEVERAGE"
  | "ETH/USD_LEVERAGE"
  | "LTC/USD_LEVERAGE"
  | "XRP/USD_LEVERAGE"
  | "BNB/USD";

function App() {
  const { data: trades = [], isLoading: tradesLoading } = useGetAllTrades();
  const { data: stats, isLoading: statsLoading } = useGetTradingStats();
  const { mutate: seedTrades } = useSeedSampleTrades();
  const seededRef = useRef(false);
  const isMobile = useIsMobile(1024);

  const [selectedSymbol, setSelectedSymbol] =
    useState<AssetSymbol>("BTC/USD_LEVERAGE");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeView, setActiveView] = useState("Dashboard");

  useEffect(() => {
    if (!tradesLoading && trades.length === 0 && !seededRef.current) {
      seededRef.current = true;
      seedTrades();
    }
  }, [tradesLoading, trades.length, seedTrades]);

  const isVolume = activeView === "Volume";
  const isAnalysis = activeView === "Analysis";
  const isStatistics = activeView === "Statistics";
  // "Markets" was removed from nav; any stale activeView value falls through to dashboard
  const showMainGrid = !isVolume && !isAnalysis && !isStatistics;

  return (
    <div className="min-h-screen flex flex-col" data-ocid="dashboard.page">
      <TopNav
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeView={activeView}
        onViewChange={setActiveView}
      />

      <main className="flex-1 px-3 sm:px-4 md:px-6 py-4 md:py-6 max-w-[1600px] mx-auto w-full">
        {showMainGrid && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="mb-4"
          >
            {isMobile ? (
              <div className="flex flex-col gap-4">
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.05, ease: "easeOut" }}
                  data-ocid="market.panel"
                >
                  <MarketWatch
                    compact
                    selectedSymbol={selectedSymbol}
                    onSelectSymbol={setSelectedSymbol}
                    searchQuery={searchQuery}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
                  data-ocid="chart.panel"
                  style={{ minHeight: "440px" }}
                >
                  <BtcChart symbol={selectedSymbol} />
                </motion.div>
              </div>
            ) : (
              <div
                className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4"
                style={{ minHeight: "540px" }}
              >
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

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
                  data-ocid="chart.panel"
                >
                  <BtcChart symbol={selectedSymbol} />
                </motion.div>
              </div>
            )}
          </motion.div>
        )}

        {isStatistics ? (
          <motion.div
            key="statistics"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            data-ocid="stats.panel"
          >
            <TradingStatsPanel stats={stats} loading={statsLoading} fullPage />
          </motion.div>
        ) : isAnalysis ? (
          <motion.div
            key="analysis"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <AnalysisPanel />
          </motion.div>
        ) : isVolume ? (
          <motion.div
            key="volume"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <VolumeTable searchQuery={searchQuery} />
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
