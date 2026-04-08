import { useCallback, useEffect, useRef, useState } from "react";

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

export interface AnalysisData {
  fearGreed: FearGreedState;
  btcFunding: FundingState;
  ethFunding: FundingState;
  spx: MacroAssetState;
  gold: MacroAssetState;
  us10y: MacroAssetState;
  dxy: MacroAssetState;
  btcSocial: BtcSocialState;
  btcOI: OpenInterestState;
  ethOI: OpenInterestState;
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

// ---- CORS proxy helpers ----
// /get returns JSON wrapper { contents: "...", status: { http_code: 200 } }
// /raw returns the body directly (unreliable for some hosts)
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
async function fetchFearGreed(): Promise<FearGreedState> {
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
async function fetchBinanceFunding(symbol: string): Promise<FundingState> {
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

async function fetchDzengiMacro(symbol: string): Promise<MacroAssetState> {
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
// Dzengi carries DXY as a native symbol in its ticker feed
async function fetchDXY(): Promise<MacroAssetState> {
  return fetchDzengiMacro("DXY");
}

// ---- US 10-Year Treasury yield from moneymatter.me via allorigins /get proxy ----
// Returns yield as a percentage (e.g. 3.97 means 3.97%)
async function fetchUS10Y(): Promise<MacroAssetState> {
  const url =
    "https://moneymatter.me/api/treasury/interest-rates?lastDailyResult=true";

  let json: {
    success: boolean;
    data: Array<Record<string, number | string>>;
  };

  // Try direct fetch first (works in environments without CORS restrictions)
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    json = await res.json();
  } catch {
    // Fall back to allorigins /get proxy which wraps the body in .contents
    json = await fetchViaProxy<typeof json>(url);
  }

  const item = json?.data?.[0];
  if (!item) throw new Error("us10y empty");

  const yield10y = Number(item.BC_10YEAR);
  if (Number.isNaN(yield10y) || yield10y === 0)
    throw new Error("us10y bad value");

  let prevClose = yield10y;
  if (json?.data?.length >= 2) {
    const prev = Number(json.data[1]?.BC_10YEAR);
    if (!Number.isNaN(prev) && prev > 0) prevClose = prev;
  }

  return {
    price: yield10y,
    prevClose,
    high52w: 0,
    low52w: 0,
    loading: false,
    error: false,
  };
}

async function fetchBtcSocial(): Promise<BtcSocialState> {
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
async function fetchBinanceOI(
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
async function fetchBinanceOIHistory(symbol: string): Promise<number[]> {
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

async function fetchBinanceOIFull(symbol: string): Promise<OpenInterestState> {
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
  const [us10y, setUs10y] = useState<MacroAssetState>(defaultMacro);
  const [dxy, setDxy] = useState<MacroAssetState>(defaultMacro);
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

  // -- Macro assets: poll every 5 min --
  const loadMacro = useCallback(() => {
    // Invalidate the ticker cache so we get fresh data
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
    // US 10Y yield via moneymatter.me (allorigins /get proxy fallback)
    safeFetch(fetchUS10Y, mountedRef, setUs10y, {
      ...defaultMacro,
      loading: false,
      error: true,
    });
    // DXY from Dzengi native symbol
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
    us10y,
    dxy,
    btcSocial,
    btcOI,
    ethOI,
  };
}
