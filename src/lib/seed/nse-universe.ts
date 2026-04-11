import type { SignalRow } from "@/lib/schemas";
import { NSE_SECTORS } from "@/lib/seed/nse-sectors";
import nseListed from "@/lib/seed/data/nse-listed-stocks.json";

function mixHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function buildRow(
  company: string,
  symbol: string,
  index: number,
): SignalRow {
  const h = mixHash(`${symbol}\0${String(index)}`);
  const sector = NSE_SECTORS[h % NSE_SECTORS.length];
  const ltp = Math.round((20 + (h % 18_000) / 10) * 100) / 100;
  const pctChg = Math.round(((h % 500) - 250) / 10) / 10;
  const mktCapCr = 50 + (h % 2_500_000);
  const pe = Math.round((6 + (h % 380) / 10) * 10) / 10;
  const roe = Math.round((h % 380) / 10) / 10;
  const score = 28 + (h % 58);
  const signal: SignalRow["signal"] =
    score >= 62 ? "BUY" : score >= 42 ? "HOLD" : "SELL";

  return {
    symbol,
    company,
    ltp,
    pctChg,
    mktCapCr,
    pe,
    roe,
    signal,
    score,
    sector,
    triggeredRule: `Universe match · ${sector}`,
    debtToEquity: Math.round(((h % 200) / 100) * 100) / 100,
    promoterHoldingPct: h % 88,
    fiiDiiHoldingPct: 5 + (h % 55),
    salesGrowth1yPct: (h % 45) - 5,
    netProfitGrowth1yPct: (h % 40) - 5,
    last2QtrRevProfitGrowthPct: (h % 35) - 8,
  };
}

/** All NSE-listed equity names from bundled registry (~2.2k+ symbols, demo fundamentals). */
function buildNseUniverse(): SignalRow[] {
  const map = nseListed as Record<string, string>;
  const pairs = Object.entries(map).sort((a, b) =>
    a[1].localeCompare(b[1], "en"),
  );
  return pairs.map(([company, symbol], i) => buildRow(company, symbol, i));
}

export const NSE_UNIVERSE_SIGNALS: SignalRow[] = buildNseUniverse();
