import type { SignalRow } from "@/lib/schemas";
import type { StrategyRuleModel } from "@/lib/schemas";
import { NSE_UNIVERSE_SIGNALS } from "@/lib/seed/nse-universe";
import {
  blendedBiasDenominator,
  defaultStrategyRuleModel,
  normalizeRatio,
} from "@/lib/strategy-rule-model";

/** Full NSE-listed cash-equity demo universe (~2.2k+ symbols, synthetic OHLC/fundamentals). */
export const SEED_SIGNALS: SignalRow[] = NSE_UNIVERSE_SIGNALS;

/** Rule-based fit score from symbol fundamentals/returns + parsed strategy model. */
function strategyFitScore(model: StrategyRuleModel, row: SignalRow): number {
  const pct = row.pctChg;
  const absPct = Math.abs(pct);
  const roe = row.roe ?? 10;
  const debt = row.debtToEquity ?? 1.5;
  const promoter = row.promoterHoldingPct ?? 35;
  const growth =
    ((row.salesGrowth1yPct ?? 0) + (row.netProfitGrowth1yPct ?? 0)) / 2;

  const trendSignal = normalizeRatio(pct, -5, 5);
  const meanRevSignal = normalizeRatio(-pct - absPct * 0.2, -5, 5);
  const qualitySignal = normalizeRatio(roe + promoter * 0.15 + growth * 0.25, -5, 40);
  const riskSignal = normalizeRatio(2.5 - debt + promoter * 0.01, -1.5, 3.5);
  const volSignal = normalizeRatio(absPct, 0, 5);

  const den = blendedBiasDenominator(model);
  const weighted =
    model.trendBias * trendSignal +
    model.meanReversionBias * meanRevSignal +
    model.qualityBias * qualitySignal +
    model.riskBias * riskSignal +
    model.volatilityBias * volSignal;
  const ratio = weighted / den;
  return 1 + Math.round(Math.min(1, Math.max(0, ratio)) * 98);
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
  // Back-compat wrapper if older callers still pass only an id.
  return signalsForStrategyWithModel(strategyId, defaultStrategyRuleModel(), base);
}

export function signalsForStrategyWithModel(
  strategyId: string,
  ruleModel: StrategyRuleModel,
  base: SignalRow[] = SEED_SIGNALS,
): SignalRow[] {
  const label =
    strategyId.length > 28 ? `${strategyId.slice(0, 25)}…` : strategyId;
  const mapped = base.map((row) => {
    const fit = strategyFitScore(ruleModel, row);
    const blended = Math.round(row.score * 0.35 + fit * 0.65);
    const score = Math.min(99, Math.max(1, blended));
    const signal = signalFromCompositeScore(score);
    return {
      ...row,
      score,
      signal,
      triggeredRule: `${row.triggeredRule} [${label} · fit ${fit} · ${ruleModel.version}]`,
    };
  });
  return sortSignalsByScoreDesc(mapped);
}
