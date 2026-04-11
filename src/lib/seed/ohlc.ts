import type { OhlcBar } from "@/lib/schemas";

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Mulberry32 PRNG */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Realistic-looking synthetic OHLC (log random walk) when live data is unavailable.
 * Not real market data.
 */
export function generateOhlc(
  ticker: string,
  bars: number,
  basePrice = 1000,
): OhlcBar[] {
  const seed = hashString(ticker);
  const rand = mulberry32(seed);
  const out: OhlcBar[] = [];
  let close = basePrice + (seed % 200) - 100;
  const now = Math.floor(Date.now() / 1000);
  const daySec = 86400;

  for (let i = bars - 1; i >= 0; i--) {
    const t = now - i * daySec;
    const ret = (rand() - 0.48) * 0.035;
    const open = close;
    close = Math.max(5, open * (1 + ret));
    const noise = 0.003 + rand() * 0.012;
    const high = Math.max(open, close) * (1 + noise);
    const low = Math.min(open, close) * (1 - noise);
    const vol = 1e6 + (seed % 500000) + i * 1000 + Math.floor(rand() * 5e5);
    out.push({
      time: t as unknown as number,
      open,
      high,
      low,
      close,
      volume: vol,
    });
  }
  return out;
}
