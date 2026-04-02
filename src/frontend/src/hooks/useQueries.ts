import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Trade, TradingStats } from "../backend.d.ts";
import { useActor } from "./useActor";

export function useGetAllTrades() {
  const { actor, isFetching } = useActor();
  return useQuery<Trade[]>({
    queryKey: ["trades"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllTrades();
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
  });
}

export function useGetTradingStats() {
  const { actor, isFetching } = useActor();
  return useQuery<TradingStats>({
    queryKey: ["tradingStats"],
    queryFn: async () => {
      if (!actor) {
        return {
          tradeCount: BigInt(0),
          avgTradePnl: 0,
          lossCount: BigInt(0),
          totalPnl: 0,
          winCount: BigInt(0),
          winRate: 0,
          netProfit: 0,
          avgMae: 0,
          avgMfe: 0,
        } as TradingStats;
      }
      return actor.getTradingStats();
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
  });
}

export function useSeedSampleTrades() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("No actor");
      return actor.seedSampleTrades();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      queryClient.invalidateQueries({ queryKey: ["tradingStats"] });
    },
  });
}
