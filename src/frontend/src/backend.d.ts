import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface TradingStats {
    tradeCount: bigint;
    avgTradePnl: Pnl;
    lossCount: bigint;
    totalPnl: Pnl;
    winCount: bigint;
    winRate: number;
    netProfit: Pnl;
    avgMae: number;
    avgMfe: number;
}
export type Pnl = number;
export interface Trade {
    id: bigint;
    mae: number;
    mfe: number;
    pnl: Pnl;
    status: Status;
    currentPrice: number;
    asset: string;
    tradeType: TradeType;
    timestamp: bigint;
    quantity: number;
    entryPrice: number;
}
export enum Status {
    closed = "closed",
    open = "open"
}
export enum TradeType {
    long_ = "long",
    short_ = "short"
}
export interface backendInterface {
    addTrade(trade: Trade): Promise<bigint>;
    closeTrade(id: bigint, finalPrice: number): Promise<void>;
    deleteTrade(id: bigint): Promise<void>;
    getAllTrades(): Promise<Array<Trade>>;
    getTrade(id: bigint): Promise<Trade>;
    getTradingStats(): Promise<TradingStats>;
    seedSampleTrades(): Promise<void>;
    updateTrade(trade: Trade): Promise<void>;
}
