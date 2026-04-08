import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Trade, TradingStats } from "../types/trades";

// Backend canister has no trade methods yet — queries return empty/default data.
// When the backend is wired up, replace these stubs with real actor calls.

export function useGetAllTrades() {
  return useQuery<Trade[]>({
    queryKey: ["trades"],
    queryFn: async () => [],
    staleTime: 30_000,
  });
}

export function useGetTradingStats() {
  return useQuery<TradingStats>({
    queryKey: ["tradingStats"],
    queryFn: async (): Promise<TradingStats> => ({
      tradeCount: BigInt(0),
      avgTradePnl: 0,
      lossCount: BigInt(0),
      totalPnl: 0,
      winCount: BigInt(0),
      winRate: 0,
      netProfit: 0,
      avgMae: 0,
      avgMfe: 0,
    }),
    staleTime: 30_000,
  });
}

export function useSeedSampleTrades() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      // No-op until backend is wired
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      queryClient.invalidateQueries({ queryKey: ["tradingStats"] });
    },
  });
}
