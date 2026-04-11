import type { OhlcBar } from "@/lib/schemas";
import { chartIndexYahooSymbol } from "@/config/chart-index-options";

/** Browser-like UA — Yahoo often returns 429 without it. */
const YAHOO_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "application/json,text/plain,*/*",
};

/** Map grid shortcuts / indices to Yahoo symbols */
export function toYahooSymbol(ticker: string): string {
  const u = ticker.trim().toUpperCase();
  const fromIndex = chartIndexYahooSymbol(u);
  if (fromIndex) return fromIndex;
  return `${u}.NS`;
}

export type YahooQuoteLite = {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChangePercent: number;
  marketCap?: number;
  longName?: string;
  shortName?: string;
  sector?: string;
};

/**
 * Latest quote for NSE cash / common indices (Yahoo). Returns null on failure.
 */
export async function fetchYahooQuote(
  rawTicker: string,
): Promise<YahooQuoteLite | null> {
  const sym = toYahooSymbol(rawTicker);
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(sym)}`;
  try {
    const res = await fetch(url, { headers: YAHOO_HEADERS, next: { revalidate: 120 } });
    if (!res.ok) return null;
    const j = (await res.json()) as {
      quoteResponse?: { result?: Array<Record<string, unknown>> };
    };
    const r = j.quoteResponse?.result?.[0];
    if (!r || typeof r.regularMarketPrice !== "number") return null;
    return {
      symbol: String(r.symbol ?? sym),
      regularMarketPrice: r.regularMarketPrice,
      regularMarketChangePercent: Number(r.regularMarketChangePercent ?? 0),
      marketCap: typeof r.marketCap === "number" ? r.marketCap : undefined,
      longName: typeof r.longName === "string" ? r.longName : undefined,
      shortName: typeof r.shortName === "string" ? r.shortName : undefined,
      sector: typeof r.sector === "string" ? r.sector : undefined,
    };
  } catch {
    return null;
  }
}

type ChartResult = {
  timestamp?: number[];
  meta?: { currency?: string; regularMarketPrice?: number };
  indicators?: {
    quote?: Array<{
      open?: Array<number | null>;
      high?: Array<number | null>;
      low?: Array<number | null>;
      close?: Array<number | null>;
      volume?: Array<number | null>;
    }>;
  };
};

function chartResultToBars(result: ChartResult, maxBars: number): OhlcBar[] {
  const ts = result.timestamp;
  const q = result.indicators?.quote?.[0];
  if (!ts?.length || !q) return [];

  const { open = [], high = [], low = [], close = [], volume = [] } = q;
  const out: OhlcBar[] = [];

  for (let i = 0; i < ts.length; i++) {
    const c = close[i];
    if (c == null || Number.isNaN(c)) continue;
    const o = open[i] ?? c;
    const h = high[i] ?? c;
    const l = low[i] ?? c;
    const vol = volume[i] ?? 0;
    out.push({
      time: ts[i] as number,
      open: o,
      high: Math.max(h, o, c),
      low: Math.min(l, o, c),
      close: c,
      volume: typeof vol === "number" ? vol : 0,
    });
  }

  return out.slice(-maxBars);
}

/** Yahoo interval + range per app timeframe (approximate bar counts). */
function yahooParamsForTimeframe(tf: string): { interval: string; range: string } {
  switch (tf) {
    case "1D":
      return { interval: "1d", range: "2y" };
    case "1W":
      return { interval: "1wk", range: "10y" };
    case "1M":
    case "3M":
      return { interval: "1mo", range: "max" };
    case "6M":
      return { interval: "1d", range: "5y" };
    case "1Y":
      return { interval: "1d", range: "5y" };
    case "2Y":
    case "3Y":
      return { interval: "1wk", range: "max" };
    case "5Y":
    case "ALL":
      return { interval: "1mo", range: "max" };
    default:
      return { interval: "1d", range: "2y" };
  }
}

export type YahooChartOk = {
  bars: OhlcBar[];
  source: "yahoo";
  currency?: string;
  regularMarketPrice?: number;
};

/**
 * Historical OHLC from Yahoo chart API. Returns null if request fails (caller uses synthetic).
 */
export async function fetchYahooHistorical(
  rawTicker: string,
  timeframe: string,
  barTarget: number,
): Promise<YahooChartOk | null> {
  const sym = toYahooSymbol(rawTicker);
  const { interval, range } = yahooParamsForTimeframe(timeframe);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=${interval}&range=${range}`;
  try {
    const res = await fetch(url, { headers: YAHOO_HEADERS, next: { revalidate: 300 } });
    if (!res.ok) return null;
    const j = (await res.json()) as {
      chart?: { result?: ChartResult[]; error?: { description?: string } };
    };
    const err = j.chart?.error;
    if (err) return null;
    const result = j.chart?.result?.[0];
    if (!result) return null;
    const bars = chartResultToBars(result, barTarget);
    if (bars.length === 0) return null;
    return {
      bars,
      source: "yahoo",
      currency: result.meta?.currency,
      regularMarketPrice:
        typeof result.meta?.regularMarketPrice === "number"
          ? result.meta.regularMarketPrice
          : undefined,
    };
  } catch {
    return null;
  }
}
