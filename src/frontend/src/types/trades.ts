// Local type definitions for trades and statistics.
// These mirror the expected backend interface shape.

export const TradeType = {
  long_: "long_",
  short_: "short_",
} as const;
export type TradeType = (typeof TradeType)[keyof typeof TradeType];

export const Status = {
  open: "open",
  closed: "closed",
} as const;
export type Status = (typeof Status)[keyof typeof Status];

export interface Trade {
  id: bigint;
  asset: string;
  tradeType: TradeType;
  status: Status;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  mfe: number;
  mae: number;
  timestamp: bigint;
}

export interface TradingStats {
  tradeCount: bigint;
  winCount: bigint;
  lossCount: bigint;
  winRate: number;
  totalPnl: number;
  avgTradePnl: number;
  netProfit: number;
  avgMfe: number;
  avgMae: number;
}
