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

/** FNV-1a 32-bit over full string — different uploads → different fingerprints. */
function fnv1a32(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/**
 * Small bounded adjustments (±12) per bias axis from file body.
 * This is not “random noise”: identical file text → identical skew; different bytes → different profile
 * when keyword counts alone would collide (e.g. gibberish uploads).
 */
function biasSkewFromText(norm: string): [number, number, number, number, number] {
  let h = fnv1a32(norm);
  const skews: number[] = [];
  for (let k = 0; k < 5; k++) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    const u = (h & 255) / 255;
    skews.push(Math.round(u * 24 - 12));
  }
  return [skews[0]!, skews[1]!, skews[2]!, skews[3]!, skews[4]!];
}

export function defaultStrategyRuleModel(): StrategyRuleModel {
  return {
    version: "rule-v1",
    trendBias: 50,
    meanReversionBias: 50,
    qualityBias: 50,
    riskBias: 50,
    volatilityBias: 50,
    blendBasePct: 50,
  };
}

function clampBlendBasePct(v: number): number {
  return Math.min(95, Math.max(5, Math.round(v)));
}

/**
 * How much of the composite score comes from the universe "base" rank vs strategy fit.
 * Tries explicit percentage pairs in the document; otherwise infers from bias shape.
 */
export function deriveBlendBasePctFromDoc(
  text: string,
  model: Pick<
    StrategyRuleModel,
    "trendBias" | "meanReversionBias" | "qualityBias" | "riskBias" | "volatilityBias"
  >,
): number {
  const norm = (s: string) => s.replace(/\s+/g, " ").trim();
  const t = norm(text);

  const fromPair = (baseRaw: number, fitRaw: number): number | null => {
    const a = Math.round(baseRaw);
    const b = Math.round(fitRaw);
    if (!Number.isFinite(a) || !Number.isFinite(b) || a < 1 || b < 1 || a > 99 || b > 99) {
      return null;
    }
    const sum = a + b;
    if (sum < 95 || sum > 105) return null;
    return clampBlendBasePct((100 * a) / sum);
  };

  const m1 = t.match(
    /(?:base|universe|fundamental)\D{0,56}(\d{1,2}(?:\.\d)?)\s*%?\D{0,72}(?:fit|strategy(?:\s+fit)?|technical|model)\D{0,56}(\d{1,2}(?:\.\d)?)\s*%?/i,
  );
  if (m1) {
    const got = fromPair(Number(m1[1]), Number(m1[2]));
    if (got != null) return got;
  }

  const m2 = t.match(
    /(?:fit|strategy(?:\s+fit)?|technical|model)\D{0,56}(\d{1,2}(?:\.\d)?)\s*%?\D{0,72}(?:base|universe|fundamental)\D{0,56}(\d{1,2}(?:\.\d)?)\s*%?/i,
  );
  if (m2) {
    const got = fromPair(Number(m2[2]), Number(m2[1]));
    if (got != null) return got;
  }

  const m3 = t.match(
    /(?:weight|weightage|blend|ratio|score)\D{0,40}0\.(\d{2})\D{0,24}0\.(\d{2})/i,
  );
  if (m3) {
    const a = Number(`0.${m3[1]}`);
    const b = Number(`0.${m3[2]}`);
    if (Number.isFinite(a) && Number.isFinite(b) && a > 0 && b > 0 && a < 1 && b < 1) {
      const got = fromPair(a * 100, b * 100);
      if (got != null) return got;
    }
  }

  const fund = (model.qualityBias + model.riskBias) / 2;
  const tact = (model.trendBias + model.meanReversionBias + model.volatilityBias) / 3;
  const tot = fund + tact;
  if (tot <= 0) return 50;
  return clampBlendBasePct((100 * fund) / tot);
}

/** Rule profile from uploaded strategy text (deterministic heuristic, not LLM). */
export function deriveRuleModelFromText(text: string): StrategyRuleModel {
  const norm = text.replace(/\s+/g, " ").trim();
  const h = norm.toLowerCase();
  const [sT, sMr, sQ, sR, sV] = biasSkewFromText(norm);
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

  const trendBias = clamp100(50 + trendHits * 10 - meanRevHits * 4 + sT);
  const meanReversionBias = clamp100(50 + meanRevHits * 10 - trendHits * 4 + sMr);
  const qualityBias = clamp100(40 + qualityHits * 12 + sQ);
  const riskBias = clamp100(40 + riskHits * 12 + sR);
  const volatilityBias = clamp100(40 + volHits * 12 + sV);

  const blendBasePct = deriveBlendBasePctFromDoc(norm, {
    trendBias,
    meanReversionBias,
    qualityBias,
    riskBias,
    volatilityBias,
  });

  return {
    version: "rule-v1",
    trendBias,
    meanReversionBias,
    qualityBias,
    riskBias,
    volatilityBias,
    blendBasePct,
  };
}

export function ruleModelSummary(model: StrategyRuleModel): string {
  const pairs = [
    `trend:${model.trendBias}`,
    `mr:${model.meanReversionBias}`,
    `quality:${model.qualityBias}`,
    `risk:${model.riskBias}`,
    `vol:${model.volatilityBias}`,
    `blendBase:${model.blendBasePct}%`,
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
