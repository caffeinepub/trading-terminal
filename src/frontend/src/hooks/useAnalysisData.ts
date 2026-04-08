import { createActorWithConfig } from "@caffeineai/core-infrastructure";
import { useCallback, useEffect, useRef, useState } from "react";
import { createActor } from "../backend";

// ---- Type definitions ----
export interface FearGreedState {
  value: number;
  label: string;
  timeUntilUpdate: number; // seconds
  loading: boolean;
  error: boolean;
}

export interface FundingState {
  rate: number;
  nextSettlement: number; // unix ms
  intervalHours: number; // settlement interval in hours
  loading: boolean;
  error: boolean;
}

export interface MacroAssetState {
  price: number;
  prevClose: number;
  high52w: number;
  low52w: number;
  loading: boolean;
  error: boolean;
}

export interface BtcSocialState {
  bullishPct: number;
  bearishPct: number;
  loading: boolean;
  error: boolean;
}

export interface OpenInterestState {
  oiUsd: number; // total OI in USD
  oiCcy: number; // OI in native coin (BTC or ETH)
  history: number[]; // last 48h OI USD values, oldest->newest for sparkline
  loading: boolean;
  error: boolean;
}

export interface Us10yState {
  current: number; // current yield %
  history: number[]; // last 7 trading days, oldest->newest
  dates: string[]; // corresponding date labels (e.g. "Apr 1")
  historySource: "FRED" | "Treasury" | "moneymatter" | "canister" | "none"; // where history came from
  loading: boolean;
  error: boolean;
}

export interface AnalysisData {
  fearGreed: FearGreedState;
  btcFunding: FundingState;
  ethFunding: FundingState;
  spx: MacroAssetState;
  gold: MacroAssetState;
  dxy: MacroAssetState;
  btcSocial: BtcSocialState;
  btcOI: OpenInterestState;
  ethOI: OpenInterestState;
  us10y: Us10yState;
}

// ---- Default states ----
const defaultFearGreed: FearGreedState = {
  value: 0,
  label: "",
  timeUntilUpdate: 0,
  loading: true,
  error: false,
};

const defaultFunding: FundingState = {
  rate: 0,
  nextSettlement: 0,
  intervalHours: 8,
  loading: true,
  error: false,
};

const defaultMacro: MacroAssetState = {
  price: 0,
  prevClose: 0,
  high52w: 0,
  low52w: 0,
  loading: true,
  error: false,
};

const defaultSocial: BtcSocialState = {
  bullishPct: 0,
  bearishPct: 0,
  loading: true,
  error: false,
};

const defaultOI: OpenInterestState = {
  oiUsd: 0,
  oiCcy: 0,
  history: [],
  loading: true,
  error: false,
};

const defaultUs10y: Us10yState = {
  current: 0,
  history: [],
  dates: [],
  historySource: "none",
  loading: true,
  error: false,
};

// ---- CORS proxy helpers ----
const ALLORIGINS_GET = "https://api.allorigins.win/get?url=";
const ALLORIGINS_RAW = "https://api.allorigins.win/raw?url=";

function proxiedGet(url: string): string {
  return `${ALLORIGINS_GET}${encodeURIComponent(url)}`;
}

function proxiedRaw(url: string): string {
  return `${ALLORIGINS_RAW}${encodeURIComponent(url)}`;
}

// Fetch via allorigins /get and parse the contents string as JSON
async function fetchViaProxy<T>(url: string): Promise<T> {
  const res = await fetch(proxiedGet(url));
  if (!res.ok) throw new Error(`proxy fetch failed: ${url}`);
  const wrapper = await res.json();
  if (!wrapper?.contents) throw new Error(`proxy empty contents: ${url}`);
  return JSON.parse(wrapper.contents) as T;
}

// ---- Binance base URL ----
const BINANCE_FAPI = "https://fapi.binance.com";
const BINANCE_FUTURES_DATA = "https://fapi.binance.com";

// ---- Fetch helpers ----
export async function fetchFearGreed(): Promise<FearGreedState> {
  const res = await fetch("https://api.alternative.me/fng/?limit=1");
  if (!res.ok) throw new Error("fng");
  const json = await res.json();
  const item = json?.data?.[0];
  if (!item) throw new Error("fng empty");
  return {
    value: Number(item.value),
    label: item.value_classification as string,
    timeUntilUpdate: Number(item.time_until_update ?? 0),
    loading: false,
    error: false,
  };
}

// ---- Binance funding rate ----
export async function fetchBinanceFunding(
  symbol: string,
): Promise<FundingState> {
  const premiumUrl = `${BINANCE_FAPI}/fapi/v1/premiumIndex?symbol=${symbol}`;
  let res: Response;
  try {
    res = await fetch(premiumUrl);
    if (!res.ok) throw new Error();
  } catch {
    res = await fetch(proxiedRaw(premiumUrl));
    if (!res.ok) throw new Error("binance funding");
  }
  const item = await res.json();
  if (!item || !item.symbol) throw new Error("binance funding empty");

  let intervalHours = 8;
  try {
    const infoUrl = `${BINANCE_FAPI}/fapi/v1/fundingInfo`;
    let infoRes: Response;
    try {
      infoRes = await fetch(infoUrl);
      if (!infoRes.ok) throw new Error();
    } catch {
      infoRes = await fetch(proxiedRaw(infoUrl));
    }
    if (infoRes.ok) {
      const infoJson: Array<{ symbol: string; fundingIntervalHours: number }> =
        await infoRes.json();
      const entry = infoJson.find((x) => x.symbol === symbol);
      if (entry?.fundingIntervalHours)
        intervalHours = entry.fundingIntervalHours;
    }
  } catch {
    // keep default 8h
  }

  return {
    rate: Number(item.lastFundingRate),
    nextSettlement: Number(item.nextFundingTime),
    intervalHours,
    loading: false,
    error: false,
  };
}

// ---- Dzengi ticker cache ----
let dzengiTickerCache: Array<{
  symbol: string;
  lastPrice: string;
  priceChange: string;
  highPrice: string;
  lowPrice: string;
}> | null = null;
let dzengiTickerCacheTime = 0;
const DZENGI_TICKER_TTL = 60_000; // 1 min cache

async function getDzengiTicker() {
  const now = Date.now();
  if (dzengiTickerCache && now - dzengiTickerCacheTime < DZENGI_TICKER_TTL) {
    return dzengiTickerCache;
  }
  const res = await fetch("https://api-adapter.dzengi.com/api/v1/ticker/24hr");
  if (!res.ok) throw new Error("dzengi ticker");
  dzengiTickerCache = await res.json();
  dzengiTickerCacheTime = now;
  return dzengiTickerCache!;
}

export async function fetchDzengiMacro(
  symbol: string,
): Promise<MacroAssetState> {
  const tickers = await getDzengiTicker();
  const item = tickers.find((t) => t.symbol === symbol);
  if (!item) throw new Error(`dzengi macro: ${symbol} not found`);
  const price = Number(item.lastPrice);
  const change = Number(item.priceChange);
  return {
    price,
    prevClose: price - change,
    high52w: Number(item.highPrice ?? 0),
    low52w: Number(item.lowPrice ?? 0),
    loading: false,
    error: false,
  };
}

// ---- DXY from Dzengi API ----
export async function fetchDXY(): Promise<MacroAssetState> {
  return fetchDzengiMacro("DXY");
}

// ---- US 10Y Treasury Yield — live current value only ----
// (History is fetched separately via fetchUS10YHistory with multi-source fallback)

interface TreasuryODataRow {
  NEW_DATE: string;
  BC_10YEAR: string | null;
}

interface TreasuryODataResponse {
  value: TreasuryODataRow[];
}

function formatDateLabel(dateStr: string): string {
  // dateStr looks like "2025-04-07T00:00:00" or "2025-04-07"
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

async function fetchTreasuryODataMonth(
  month: number,
  year: number,
): Promise<TreasuryODataRow[]> {
  const url = `https://data.treasury.gov/feed.svc/DailyTreasuryYieldCurveRateData?$filter=month(NEW_DATE)%20eq%20${month}%20and%20year(NEW_DATE)%20eq%20${year}&$format=json`;
  let json: TreasuryODataResponse;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    json = await res.json();
  } catch {
    // Try via proxy
    json = await fetchViaProxy<TreasuryODataResponse>(url);
  }
  return Array.isArray(json?.value) ? json.value : [];
}

// ---- SOURCE 1: US Treasury OData with 14-day date filter ----
async function fetchUS10YHistoryFromTreasury(): Promise<{
  history: number[];
  dates: string[];
} | null> {
  try {
    const now = new Date();
    const cutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    // Use date filter + select only needed fields
    const url = `https://data.treasury.gov/feed.svc/DailyTreasuryYieldCurveRateData?$filter=NEW_DATE%20ge%20datetime'${cutoffStr}T00:00:00'&$select=NEW_DATE,BC_10YEAR&$format=json`;

    let json: TreasuryODataResponse;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`status ${res.status}`);
      json = await res.json();
    } catch {
      json = await fetchViaProxy<TreasuryODataResponse>(url);
    }

    if (!Array.isArray(json?.value)) return null;

    const valid = json.value
      .filter(
        (r) =>
          r.BC_10YEAR !== null &&
          r.BC_10YEAR !== "" &&
          r.BC_10YEAR !== "." &&
          !Number.isNaN(Number(r.BC_10YEAR)) &&
          Number(r.BC_10YEAR) > 0,
      )
      .sort(
        (a, b) =>
          new Date(a.NEW_DATE).getTime() - new Date(b.NEW_DATE).getTime(),
      );

    if (valid.length < 5) return null;

    const last7 = valid.slice(-7);
    return {
      history: last7.map((r) => Number(r.BC_10YEAR)),
      dates: last7.map((r) => formatDateLabel(r.NEW_DATE)),
    };
  } catch {
    return null;
  }
}

// ---- SOURCE 2: FRED plain text (DGS10) ----
async function fetchUS10YHistoryFromFRED(): Promise<{
  history: number[];
  dates: string[];
} | null> {
  try {
    const fredUrl = "https://fred.stlouisfed.org/data/DGS10";
    const proxyUrl = `${ALLORIGINS_GET}${encodeURIComponent(fredUrl)}`;

    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`FRED proxy status ${res.status}`);
    const wrapper = await res.json();
    const text: string = wrapper?.contents;
    if (!text || typeof text !== "string") throw new Error("FRED empty");

    const now = new Date();
    const cutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Parse lines: skip header lines (starting with # or non-date chars)
    const rows: Array<{ date: Date; value: number }> = [];
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("DATE"))
        continue;
      // Lines are "YYYY-MM-DD  VALUE" (tab or multiple spaces)
      const parts = trimmed.split(/\s+/);
      if (parts.length < 2) continue;
      const dateStr = parts[0];
      const valStr = parts[1];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) continue;
      if (valStr === "." || valStr === "N/A") continue; // no data
      const value = Number(valStr);
      if (Number.isNaN(value) || value <= 0) continue;
      const date = new Date(`${dateStr}T12:00:00Z`); // noon UTC to avoid timezone edge
      if (date >= cutoff) {
        rows.push({ date, value });
      }
    }

    if (rows.length < 5) return null;

    // Sort oldest->newest, take last 7
    rows.sort((a, b) => a.date.getTime() - b.date.getTime());
    const last7 = rows.slice(-7);

    return {
      history: last7.map((r) => r.value),
      dates: last7.map((r) =>
        r.date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      ),
    };
  } catch {
    return null;
  }
}

// ---- SOURCE 3: moneymatter.me historical ----
async function fetchUS10YHistoryFromMoneyMatter(): Promise<{
  history: number[];
  dates: string[];
} | null> {
  try {
    const url = "https://moneymatter.me/api/treasury?maturity=10y&days=14";
    let json: unknown;
    try {
      json = await fetchViaProxy(url);
    } catch {
      const rawUrl = `${ALLORIGINS_RAW}${encodeURIComponent(url)}`;
      const res = await fetch(rawUrl, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error();
      json = await res.json();
    }

    // Try to find array of {date, value} or {date, BC_10YEAR} entries
    const arr = Array.isArray(json)
      ? json
      : Array.isArray((json as { data?: unknown[] })?.data)
        ? (json as { data: unknown[] }).data
        : null;

    if (!arr || arr.length === 0) return null;

    type MmRow = Record<string, string | number>;
    const valid = (arr as MmRow[])
      .map((row) => {
        const dateStr = String(
          row.date ?? row.Date ?? row.NEW_DATE ?? "",
        ).slice(0, 10);
        const val = Number(
          row["10y"] ?? row.BC_10YEAR ?? row.value ?? row.yield ?? 0,
        );
        if (!dateStr || Number.isNaN(val) || val <= 0) return null;
        return { date: new Date(`${dateStr}T12:00:00Z`), value: val };
      })
      .filter((r): r is { date: Date; value: number } => r !== null)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (valid.length < 5) return null;

    const last7 = valid.slice(-7);
    return {
      history: last7.map((r) => r.value),
      dates: last7.map((r) =>
        r.date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      ),
    };
  } catch {
    return null;
  }
}

// ---- Fetch US10Y history with multi-source fallback ----
async function fetchUS10YHistory(): Promise<{
  history: number[];
  dates: string[];
  source: "FRED" | "Treasury" | "moneymatter" | "none";
}> {
  // Source 1: Treasury OData with date filter
  try {
    const result = await fetchUS10YHistoryFromTreasury();
    if (result && result.history.length >= 5) {
      console.log("[US10Y History] Using source: Treasury");
      return { ...result, source: "Treasury" };
    }
  } catch {
    // fall through
  }

  // Source 2: FRED plain text
  try {
    const result = await fetchUS10YHistoryFromFRED();
    if (result && result.history.length >= 5) {
      console.log("[US10Y History] Using source: FRED");
      return { ...result, source: "FRED" };
    }
  } catch {
    // fall through
  }

  // Source 3: moneymatter.me
  try {
    const result = await fetchUS10YHistoryFromMoneyMatter();
    if (result && result.history.length >= 5) {
      console.log("[US10Y History] Using source: moneymatter");
      return { ...result, source: "moneymatter" };
    }
  } catch {
    // fall through
  }

  return { history: [], dates: [], source: "none" };
}

export async function fetchUS10Y(): Promise<Us10yState> {
  const now = new Date();
  const curMonth = now.getMonth() + 1;
  const curYear = now.getFullYear();

  // Also fetch previous month to ensure we have enough data near month boundaries
  let prevMonth = curMonth - 1;
  let prevYear = curYear;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }

  let rows: TreasuryODataRow[] = [];
  try {
    const [curRows, prevRows] = await Promise.all([
      fetchTreasuryODataMonth(curMonth, curYear),
      fetchTreasuryODataMonth(prevMonth, prevYear),
    ]);
    rows = [...prevRows, ...curRows];
  } catch {
    // Try fallback if OData completely fails
  }

  // Filter to rows with valid BC_10YEAR values, sort oldest->newest
  const valid = rows
    .filter(
      (r) =>
        r.BC_10YEAR !== null &&
        r.BC_10YEAR !== "" &&
        !Number.isNaN(Number(r.BC_10YEAR)) &&
        Number(r.BC_10YEAR) > 0,
    )
    .sort(
      (a, b) => new Date(a.NEW_DATE).getTime() - new Date(b.NEW_DATE).getTime(),
    );

  if (valid.length >= 1) {
    const last7 = valid.slice(-7);
    const history = last7.map((r) => Number(r.BC_10YEAR));
    const dates = last7.map((r) => formatDateLabel(r.NEW_DATE));
    const current = history[history.length - 1];
    return {
      current,
      history,
      dates,
      historySource: "Treasury",
      loading: false,
      error: false,
    };
  }

  // Fallback: moneymatter.me (single value, no history)
  try {
    const mmUrl =
      "https://moneymatter.me/api/treasury/interest-rates?lastDailyResult=true";
    let json: {
      success: boolean;
      data: Array<Record<string, number | string>>;
    };
    try {
      const raw = await fetch(proxiedRaw(mmUrl));
      if (!raw.ok) throw new Error();
      json = await raw.json();
    } catch {
      json = await fetchViaProxy<typeof json>(mmUrl);
    }
    const item = json?.data?.[0];
    const yield10y = Number(item?.BC_10YEAR);
    if (Number.isNaN(yield10y) || yield10y === 0) throw new Error("bad value");
    return {
      current: yield10y,
      history: [yield10y],
      dates: [formatDateLabel(new Date().toISOString())],
      historySource: "moneymatter",
      loading: false,
      error: false,
    };
  } catch {
    return { ...defaultUs10y, loading: false, error: true };
  }
}

export async function fetchBtcSocial(): Promise<BtcSocialState> {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false",
  );
  if (!res.ok) throw new Error("coingecko");
  const json = await res.json();
  return {
    bullishPct: Number(json.sentiment_votes_up_percentage ?? 0),
    bearishPct: Number(json.sentiment_votes_down_percentage ?? 0),
    loading: false,
    error: false,
  };
}

// ---- Binance Open Interest (current) ----
export async function fetchBinanceOI(
  symbol: string,
): Promise<{ oiUsd: number; oiCcy: number }> {
  const oiUrl = `${BINANCE_FAPI}/fapi/v1/openInterest?symbol=${symbol}`;
  const priceUrl = `${BINANCE_FAPI}/fapi/v1/premiumIndex?symbol=${symbol}`;

  let oiRes: Response;
  try {
    oiRes = await fetch(oiUrl);
    if (!oiRes.ok) throw new Error();
  } catch {
    oiRes = await fetch(proxiedRaw(oiUrl));
    if (!oiRes.ok) throw new Error("binance oi");
  }
  const oiJson = await oiRes.json();
  const oiCcy = Number(oiJson.openInterest);
  if (Number.isNaN(oiCcy)) throw new Error("binance oi bad");

  let markPrice = 0;
  try {
    let priceRes: Response;
    try {
      priceRes = await fetch(priceUrl);
      if (!priceRes.ok) throw new Error();
    } catch {
      priceRes = await fetch(proxiedRaw(priceUrl));
    }
    if (priceRes.ok) {
      const priceJson = await priceRes.json();
      markPrice = Number(priceJson.markPrice ?? priceJson.indexPrice ?? 0);
    }
  } catch {
    // will just show coin count without USD
  }

  return {
    oiCcy,
    oiUsd: markPrice > 0 ? oiCcy * markPrice : 0,
  };
}

// ---- Binance OI history (48 1h candles) ----
export async function fetchBinanceOIHistory(symbol: string): Promise<number[]> {
  const url = `${BINANCE_FUTURES_DATA}/futures/data/openInterestHist?symbol=${symbol}&period=1h&limit=48`;
  let res: Response;
  try {
    res = await fetch(url);
    if (!res.ok) throw new Error();
  } catch {
    res = await fetch(proxiedRaw(url));
    if (!res.ok) throw new Error("binance oi history");
  }
  const json: Array<{ sumOpenInterestValue: string; timestamp: number }> =
    await res.json();
  if (!Array.isArray(json)) throw new Error("binance oi history format");
  return json.slice(-48).map((row) => Number(row.sumOpenInterestValue));
}

export async function fetchBinanceOIFull(
  symbol: string,
): Promise<OpenInterestState> {
  const [spot, history] = await Promise.all([
    fetchBinanceOI(symbol),
    fetchBinanceOIHistory(symbol),
  ]);
  return {
    oiUsd: spot.oiUsd,
    oiCcy: spot.oiCcy,
    history,
    loading: false,
    error: false,
  };
}

// ---- Module-level safe fetch helper ----
function safeFetch<T>(
  fetcher: () => Promise<T>,
  mountedRef: React.RefObject<boolean>,
  setter: React.Dispatch<React.SetStateAction<T>>,
  fallback: T,
) {
  fetcher()
    .then((v) => {
      if (mountedRef.current) setter(v);
    })
    .catch(() => {
      if (mountedRef.current) setter(fallback);
    });
}

// ---- Main hook ----
export function useAnalysisData(): AnalysisData {
  const [fearGreed, setFearGreed] = useState<FearGreedState>(defaultFearGreed);
  const [btcFunding, setBtcFunding] = useState<FundingState>(defaultFunding);
  const [ethFunding, setEthFunding] = useState<FundingState>(defaultFunding);
  const [spx, setSpx] = useState<MacroAssetState>(defaultMacro);
  const [gold, setGold] = useState<MacroAssetState>(defaultMacro);
  const [dxy, setDxy] = useState<MacroAssetState>(defaultMacro);
  const [us10y, setUs10y] = useState<Us10yState>(defaultUs10y);
  const [btcSocial, setBtcSocial] = useState<BtcSocialState>(defaultSocial);
  const [btcOI, setBtcOI] = useState<OpenInterestState>(defaultOI);
  const [ethOI, setEthOI] = useState<OpenInterestState>(defaultOI);

  const mountedRef = useRef(true);

  // -- Fear & Greed: poll every 5 min --
  const loadFearGreed = useCallback(() => {
    safeFetch(fetchFearGreed, mountedRef, setFearGreed, {
      ...defaultFearGreed,
      loading: false,
      error: true,
    });
  }, []);

  useEffect(() => {
    loadFearGreed();
    const id = setInterval(loadFearGreed, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [loadFearGreed]);

  // -- Funding rates (Binance): poll every 60s --
  const loadFunding = useCallback(() => {
    safeFetch(() => fetchBinanceFunding("BTCUSDT"), mountedRef, setBtcFunding, {
      ...defaultFunding,
      loading: false,
      error: true,
    });
    safeFetch(() => fetchBinanceFunding("ETHUSDT"), mountedRef, setEthFunding, {
      ...defaultFunding,
      loading: false,
      error: true,
    });
  }, []);

  useEffect(() => {
    loadFunding();
    const id = setInterval(loadFunding, 60 * 1000);
    return () => clearInterval(id);
  }, [loadFunding]);

  // -- Macro assets (SPX, Gold, DXY): poll every 5 min --
  const loadMacro = useCallback(() => {
    dzengiTickerCache = null;
    safeFetch(() => fetchDzengiMacro("US500."), mountedRef, setSpx, {
      ...defaultMacro,
      loading: false,
      error: true,
    });
    safeFetch(() => fetchDzengiMacro("Gold."), mountedRef, setGold, {
      ...defaultMacro,
      loading: false,
      error: true,
    });
    safeFetch(fetchDXY, mountedRef, setDxy, {
      ...defaultMacro,
      loading: false,
      error: true,
    });
  }, []);

  useEffect(() => {
    loadMacro();
    const id = setInterval(loadMacro, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [loadMacro]);

  // -- US10Y: try external API sources for history, fall back to canister --
  const loadUs10y = useCallback(async () => {
    if (!mountedRef.current) return;

    // Step 1: Fetch live current value from external API
    let liveValue: number | null = null;
    let liveDateLabel = "";
    try {
      const liveState = await fetchUS10Y();
      liveValue = liveState.current;
      liveDateLabel = new Date().toISOString().slice(0, 10);

      // Record today's snapshot in canister (fire-and-forget, always runs regardless of history source)
      if (liveValue > 0) {
        createActorWithConfig(createActor)
          .then((actor) => actor.recordUS10YSnapshot(liveValue!, liveDateLabel))
          .catch(() => {
            // silently ignore record failure
          });
      }
    } catch {
      // live fetch failed
    }

    // Step 2: Try external API sources for 7-day history (Treasury, FRED, moneymatter)
    const apiHistory = await fetchUS10YHistory();

    if (!mountedRef.current) return;

    // Step 3: If external API returned enough data, use it
    if (apiHistory.source !== "none" && apiHistory.history.length >= 5) {
      const current =
        liveValue !== null && liveValue > 0
          ? liveValue
          : apiHistory.history[apiHistory.history.length - 1];
      setUs10y({
        current,
        history: apiHistory.history,
        dates: apiHistory.dates,
        historySource: apiHistory.source,
        loading: false,
        error: false,
      });
      return;
    }

    // Step 4: Fall back to canister history
    console.log("[US10Y History] Using source: canister");
    let canisterHistory: number[] = [];
    let canisterDates: string[] = [];
    try {
      const actor = await createActorWithConfig(createActor);
      const raw = await actor.getUS10YHistory();
      const sorted = [...raw].sort((a, b) => a[0].localeCompare(b[0]));
      const last7 = sorted.slice(-7);
      canisterHistory = last7.map((r) => Number(r[1]));
      canisterDates = last7.map((r) => formatDateLabel(r[0]));
    } catch {
      // canister unavailable
    }

    if (!mountedRef.current) return;

    if (liveValue !== null && liveValue > 0) {
      setUs10y({
        current: liveValue,
        history: canisterHistory,
        dates: canisterDates,
        historySource: canisterHistory.length > 0 ? "canister" : "none",
        loading: false,
        error: false,
      });
    } else if (canisterHistory.length > 0) {
      setUs10y({
        current: canisterHistory[canisterHistory.length - 1],
        history: canisterHistory,
        dates: canisterDates,
        historySource: "canister",
        loading: false,
        error: false,
      });
    } else {
      setUs10y({ ...defaultUs10y, loading: false, error: true });
    }
  }, []);

  useEffect(() => {
    loadUs10y();
    const id = setInterval(loadUs10y, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, [loadUs10y]);

  // -- BTC Social: poll every 10 min --
  const loadSocial = useCallback(() => {
    safeFetch(fetchBtcSocial, mountedRef, setBtcSocial, {
      ...defaultSocial,
      loading: false,
      error: true,
    });
  }, []);

  useEffect(() => {
    loadSocial();
    const id = setInterval(loadSocial, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [loadSocial]);

  // -- Open Interest (Binance): poll every 60s --
  const loadOI = useCallback(() => {
    safeFetch(() => fetchBinanceOIFull("BTCUSDT"), mountedRef, setBtcOI, {
      ...defaultOI,
      loading: false,
      error: true,
    });
    safeFetch(() => fetchBinanceOIFull("ETHUSDT"), mountedRef, setEthOI, {
      ...defaultOI,
      loading: false,
      error: true,
    });
  }, []);

  useEffect(() => {
    loadOI();
    const id = setInterval(loadOI, 60 * 1000);
    return () => clearInterval(id);
  }, [loadOI]);

  // Cleanup
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    fearGreed,
    btcFunding,
    ethFunding,
    spx,
    gold,
    dxy,
    us10y,
    btcSocial,
    btcOI,
    ethOI,
  };
}
