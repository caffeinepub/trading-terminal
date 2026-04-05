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
  twitterFollowers: number;
  redditSubscribers: number;
  posts48h: number;
  comments48h: number;
  loading: boolean;
  error: boolean;
}

export interface OpenInterestState {
  oiUsd: number; // total OI in USD
  oiCcy: number; // OI in native coin (BTC or ETH)
  history: number[]; // last 48h OI USD values, oldest→newest for sparkline
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
  twitterFollowers: 0,
  redditSubscribers: 0,
  posts48h: 0,
  comments48h: 0,
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

// ---- CORS proxy helper ----
// Yahoo Finance blocks direct browser requests; route through corsproxy.io
const CORS_PROXY = "https://corsproxy.io/?url=";

function proxied(url: string): string {
  return `${CORS_PROXY}${encodeURIComponent(url)}`;
}

// ---- Fetch helpers (module-level) ----
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

async function fetchFunding(instId: string): Promise<FundingState> {
  // Try OKX directly first; fall back to CORS proxy if needed
  const url = `https://www.okx.com/api/v5/public/funding-rate?instId=${instId}`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    res = await fetch(proxied(url));
  }
  if (!res.ok) {
    // Retry with proxy on non-OK response
    res = await fetch(proxied(url));
    if (!res.ok) throw new Error("funding");
  }
  const json = await res.json();
  const item = json?.data?.[0];
  if (!item) throw new Error("funding empty");
  return {
    rate: Number(item.fundingRate),
    nextSettlement: Number(item.nextFundingTime),
    loading: false,
    error: false,
  };
}

async function fetchYahooFinance(symbol: string): Promise<MacroAssetState> {
  // Yahoo Finance v8 blocks direct browser CORS — use CORS proxy
  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
  const res = await fetch(proxied(yahooUrl), {
    headers: {
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error("yahoo");
  const json = await res.json();
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error("yahoo meta missing");
  return {
    price: Number(meta.regularMarketPrice ?? 0),
    prevClose: Number(meta.chartPreviousClose ?? meta.previousClose ?? 0),
    high52w: Number(meta.fiftyTwoWeekHigh ?? 0),
    low52w: Number(meta.fiftyTwoWeekLow ?? 0),
    loading: false,
    error: false,
  };
}

async function fetchBtcSocial(): Promise<BtcSocialState> {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&market_data=false&community_data=true&developer_data=false",
  );
  if (!res.ok) throw new Error("coingecko");
  const json = await res.json();
  const cd = json?.community_data;
  if (!cd) throw new Error("coingecko community");
  return {
    twitterFollowers: Number(cd.twitter_followers ?? 0),
    redditSubscribers: Number(cd.reddit_subscribers ?? 0),
    posts48h: Number(cd.reddit_average_posts_48h ?? 0),
    comments48h: Number(cd.reddit_average_comments_48h ?? 0),
    loading: false,
    error: false,
  };
}

async function fetchOpenInterest(
  instId: string,
): Promise<{ oiUsd: number; oiCcy: number }> {
  const url = `https://www.okx.com/api/v5/public/open-interest?instType=SWAP&instId=${instId}`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    res = await fetch(proxied(url));
  }
  if (!res.ok) {
    res = await fetch(proxied(url));
    if (!res.ok) throw new Error("oi");
  }
  const json = await res.json();
  const item = json?.data?.[0];
  if (!item) throw new Error("oi empty");
  return {
    oiUsd: Number(item.oiUsd),
    oiCcy: Number(item.oiCcy),
  };
}

async function fetchOIHistory(ccy: string): Promise<number[]> {
  const url = `https://www.okx.com/api/v5/rubik/stat/contracts/open-interest-volume?ccy=${ccy}&period=1H`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    res = await fetch(proxied(url));
  }
  if (!res.ok) {
    res = await fetch(proxied(url));
    if (!res.ok) throw new Error("oi-history");
  }
  const json = await res.json();
  const rows: string[][] = json?.data ?? [];
  // rows are newest-first: [timestamp, openInterestUsd, volumeUsd]
  // take last 48 entries (oldest-first for sparkline)
  const slice = rows.slice(0, 48).reverse();
  return slice.map((row) => Number(row[1]));
}

async function fetchOIFull(
  instId: string,
  ccy: string,
): Promise<OpenInterestState> {
  const [spot, history] = await Promise.all([
    fetchOpenInterest(instId),
    fetchOIHistory(ccy),
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
// Uses a mounted ref and a setter callback to safely update state.
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

  // -- Funding rates: poll every 60s --
  const loadFunding = useCallback(() => {
    safeFetch(() => fetchFunding("BTC-USDT-SWAP"), mountedRef, setBtcFunding, {
      ...defaultFunding,
      loading: false,
      error: true,
    });
    safeFetch(() => fetchFunding("ETH-USDT-SWAP"), mountedRef, setEthFunding, {
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
    safeFetch(() => fetchYahooFinance("%5EGSPC"), mountedRef, setSpx, {
      ...defaultMacro,
      loading: false,
      error: true,
    });
    safeFetch(() => fetchYahooFinance("GC%3DF"), mountedRef, setGold, {
      ...defaultMacro,
      loading: false,
      error: true,
    });
    safeFetch(() => fetchYahooFinance("%5ETNX"), mountedRef, setUs10y, {
      ...defaultMacro,
      loading: false,
      error: true,
    });
    safeFetch(() => fetchYahooFinance("DX-Y.NYB"), mountedRef, setDxy, {
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

  // -- Open Interest: poll every 60s --
  const loadOI = useCallback(() => {
    safeFetch(() => fetchOIFull("BTC-USDT-SWAP", "BTC"), mountedRef, setBtcOI, {
      ...defaultOI,
      loading: false,
      error: true,
    });
    safeFetch(() => fetchOIFull("ETH-USDT-SWAP", "ETH"), mountedRef, setEthOI, {
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
