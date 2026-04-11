import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchYahooHistorical } from "@/lib/market/yahoo-nse";
import { generateOhlc } from "@/lib/seed/ohlc";
import { cacheGet, cacheSet } from "@/lib/cache";

const tfSchema = z.enum([
  "1D",
  "1W",
  "1M",
  "3M",
  "6M",
  "1Y",
  "2Y",
  "3Y",
  "5Y",
  "ALL",
]);

const barsMap: Record<z.infer<typeof tfSchema>, number> = {
  "1D": 260,
  "1W": 120,
  "1M": 120,
  "3M": 90,
  "6M": 126,
  "1Y": 252,
  "2Y": 504,
  "3Y": 756,
  "5Y": 1260,
  ALL: 2000,
};

export async function GET(
  req: Request,
  ctx: { params: Promise<{ ticker: string }> },
) {
  const { ticker: rawTicker } = await ctx.params;
  const ticker = decodeURIComponent(rawTicker);
  const url = new URL(req.url);
  const tf = tfSchema.safeParse(url.searchParams.get("timeframe") || "1D");
  if (!tf.success) {
    return NextResponse.json({ error: tf.error.flatten() }, { status: 400 });
  }
  const timeframe = tf.data;
  const bars = barsMap[timeframe];
  const key = `ohlc:${ticker}:${timeframe}`;
  const hit = cacheGet<unknown>(key);
  if (hit) {
    return NextResponse.json(hit);
  }

  const yahoo = await fetchYahooHistorical(ticker, timeframe, bars);
  if (yahoo && yahoo.bars.length > 0) {
    const payload = {
      ticker,
      timeframe,
      bars: yahoo.bars,
      source: "yahoo" as const,
      currency: yahoo.currency,
    };
    cacheSet(key, payload, 300_000);
    return NextResponse.json(payload);
  }

  const synthetic = generateOhlc(ticker, bars);
  const payload = {
    ticker,
    timeframe,
    bars: synthetic,
    source: "synthetic" as const,
    warning:
      "Could not load live prices (network or rate limit). Showing synthetic OHLC for layout testing — not real market data.",
  };
  cacheSet(key, payload, 120_000);
  return NextResponse.json(payload);
}
