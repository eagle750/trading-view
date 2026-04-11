import type { SignalRow } from "@/lib/schemas";
import { NSE_UNIVERSE_SIGNALS } from "@/lib/seed/nse-universe";

/** Full NSE-listed cash-equity demo universe (~2.2k+ symbols, synthetic OHLC/fundamentals). */
export const SEED_SIGNALS: SignalRow[] = NSE_UNIVERSE_SIGNALS;

function mixHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Deterministic 1–99 “fit” for this symbol under this strategy (demo stand-in for rule engine). */
function strategyFitScore(strategyId: string, row: SignalRow): number {
  const h = mixHash(
    strategyId + "\0" + row.symbol + "\0" + row.sector + "\0" + String(row.mktCapCr),
  );
  return 1 + (h % 99);
}

function signalFromCompositeScore(s: number): SignalRow["signal"] {
  if (s >= 67) return "BUY";
  if (s >= 42) return "HOLD";
  return "SELL";
}

export function sortSignalsByScoreDesc(rows: SignalRow[]): SignalRow[] {
  return [...rows].sort((a, b) => b.score - a.score);
}

/**
 * Rank universe by strategy: blend base score with per-symbol strategy fit, assign
 * BUY/HOLD/SELL from composite score, sort highest score first.
 */
export function signalsForStrategy(
  strategyId: string,
  base: SignalRow[] = SEED_SIGNALS,
): SignalRow[] {
  const label =
    strategyId.length > 28 ? `${strategyId.slice(0, 25)}…` : strategyId;
  const mapped = base.map((row) => {
    const fit = strategyFitScore(strategyId, row);
    const blended = Math.round(row.score * 0.35 + fit * 0.65);
    const score = Math.min(99, Math.max(1, blended));
    const signal = signalFromCompositeScore(score);
    return {
      ...row,
      score,
      signal,
      triggeredRule: `${row.triggeredRule} [${label} · fit ${fit}]`,
    };
  });
  return sortSignalsByScoreDesc(mapped);
}
