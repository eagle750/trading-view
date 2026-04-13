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
  const biasSpread =
    Math.max(
      ruleModel.trendBias,
      ruleModel.meanReversionBias,
      ruleModel.qualityBias,
      ruleModel.riskBias,
      ruleModel.volatilityBias,
    ) -
    Math.min(
      ruleModel.trendBias,
      ruleModel.meanReversionBias,
      ruleModel.qualityBias,
      ruleModel.riskBias,
      ruleModel.volatilityBias,
    );
  // Distinct strategy profiles should separate symbols more clearly.
  const fitAmplifier = 1 + biasSpread / 90;
  const mapped: Array<SignalRow & { __fit: number }> = base.map((row) => {
    const rawFit = strategyFitScore(ruleModel, row);
    const fit = Math.min(
      99,
      Math.max(1, Math.round(50 + (rawFit - 50) * fitAmplifier)),
    );
    const basePct = ruleModel.blendBasePct;
    const fitPct = 100 - basePct;
    const wBase = basePct / 100;
    const wFit = fitPct / 100;
    const blended = Math.round(row.score * wBase + fit * wFit);
    const score = Math.min(99, Math.max(1, blended));
    const signal = signalFromCompositeScore(score);
    return {
      ...row,
      score,
      signal,
      __fit: fit,
      triggeredRule: `${row.triggeredRule} [${label} · fit ${fit} · blend ${basePct}/${fitPct} · ${ruleModel.version}]`,
    };
  });
  mapped.sort(
    (a, b) =>
      b.score - a.score ||
      b.__fit - a.__fit ||
      b.pctChg - a.pctChg ||
      a.symbol.localeCompare(b.symbol),
  );
  return mapped.map((row) => {
    const clean = { ...row };
    delete (clean as { __fit?: number }).__fit;
    return clean;
  });
}
