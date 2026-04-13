import type { StrategyRuleModel } from "@/lib/schemas";

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function clamp100(v: number): number {
  return Math.min(100, Math.max(0, Math.round(v)));
}

function countAny(hay: string, words: string[]): number {
  let n = 0;
  for (const w of words) {
    if (hay.includes(w)) n++;
  }
  return n;
}

export function defaultStrategyRuleModel(): StrategyRuleModel {
  return {
    version: "rule-v1",
    trendBias: 50,
    meanReversionBias: 50,
    qualityBias: 50,
    riskBias: 50,
    volatilityBias: 50,
  };
}

/** Rule profile from uploaded strategy text (deterministic heuristic, not LLM). */
export function deriveRuleModelFromText(text: string): StrategyRuleModel {
  const h = text.toLowerCase();
  const trendHits = countAny(h, [
    "trend",
    "momentum",
    "breakout",
    "ema",
    "moving average",
  ]);
  const meanRevHits = countAny(h, [
    "mean reversion",
    "reversion",
    "contrarian",
    "bollinger",
    "sd trigger",
    "oversold",
    "overbought",
  ]);
  const qualityHits = countAny(h, [
    "quality",
    "roe",
    "roce",
    "promoter",
    "profit growth",
    "sales growth",
  ]);
  const riskHits = countAny(h, [
    "risk",
    "stop",
    "stop loss",
    "position size",
    "capital",
    "max drawdown",
  ]);
  const volHits = countAny(h, [
    "volatility",
    "atr",
    "sd",
    "standard deviation",
    "spike",
    "breach",
  ]);

  return {
    version: "rule-v1",
    trendBias: clamp100(50 + trendHits * 10 - meanRevHits * 4),
    meanReversionBias: clamp100(50 + meanRevHits * 10 - trendHits * 4),
    qualityBias: clamp100(40 + qualityHits * 12),
    riskBias: clamp100(40 + riskHits * 12),
    volatilityBias: clamp100(40 + volHits * 12),
  };
}

export function ruleModelSummary(model: StrategyRuleModel): string {
  const pairs = [
    `trend:${model.trendBias}`,
    `mr:${model.meanReversionBias}`,
    `quality:${model.qualityBias}`,
    `risk:${model.riskBias}`,
    `vol:${model.volatilityBias}`,
  ];
  return pairs.join(" · ");
}

export function blendedBiasDenominator(model: StrategyRuleModel): number {
  return Math.max(
    1,
    model.trendBias +
      model.meanReversionBias +
      model.qualityBias +
      model.riskBias +
      model.volatilityBias,
  );
}

export function normalizeRatio(v: number, min: number, max: number): number {
  if (max <= min) return 0.5;
  return clamp01((v - min) / (max - min));
}
