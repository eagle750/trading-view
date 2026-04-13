import { z } from "zod";

export const screenerFiltersSchema = z.object({
  marketCap: z.string(),
  marketCapCustom: z.string().optional(),
  salesGrowth1y3y: z.string(),
  salesGrowthCustom: z.string().optional(),
  netProfitGrowth1y3y: z.string(),
  netProfitGrowthCustom: z.string().optional(),
  debtToEquity: z.string(),
  debtToEquityCustom: z.string().optional(),
  promoterHolding: z.string(),
  promoterHoldingCustom: z.string().optional(),
  fiiDiiHolding: z.string(),
  fiiDiiHoldingCustom: z.string().optional(),
  avgRoeRoce3y: z.string(),
  avgRoeRoceCustom: z.string().optional(),
  pe: z.string(),
  peCustom: z.string().optional(),
  sectors: z.array(z.string()),
  last2QtrRevProfit: z.string(),
});

export type ScreenerFilters = z.infer<typeof screenerFiltersSchema>;

export const signalRowSchema = z.object({
  symbol: z.string(),
  company: z.string(),
  ltp: z.number(),
  pctChg: z.number(),
  mktCapCr: z.number(),
  pe: z.number().nullable(),
  roe: z.number().nullable(),
  signal: z.enum(["BUY", "SELL", "HOLD"]),
  score: z.number(),
  sector: z.string(),
  triggeredRule: z.string(),
  /** Demo fundamentals for filter matching (optional for partial rows) */
  debtToEquity: z.number().optional(),
  promoterHoldingPct: z.number().optional(),
  fiiDiiHoldingPct: z.number().optional(),
  salesGrowth1yPct: z.number().optional(),
  netProfitGrowth1yPct: z.number().optional(),
  last2QtrRevProfitGrowthPct: z.number().optional(),
});

export type SignalRow = z.infer<typeof signalRowSchema>;

export const strategyRuleModelSchema = z.object({
  version: z.literal("rule-v1"),
  trendBias: z.number().min(0).max(100),
  meanReversionBias: z.number().min(0).max(100),
  qualityBias: z.number().min(0).max(100),
  riskBias: z.number().min(0).max(100),
  volatilityBias: z.number().min(0).max(100),
});

export type StrategyRuleModel = z.infer<typeof strategyRuleModelSchema>;

export const strategySummarySchema = z.object({
  bullets: z.array(z.string()).min(3).max(5),
  tags: z.array(z.string()),
  ruleModel: strategyRuleModelSchema,
});

export type StrategySummary = z.infer<typeof strategySummarySchema>;

export const overlayActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("add_indicator"), name: z.string() }),
  z.object({ type: z.literal("remove_indicator"), name: z.string() }),
  z.object({ type: z.literal("compare_symbol"), symbol: z.string() }),
  z.object({ type: z.literal("timeframe"), value: z.string() }),
  z.object({ type: z.literal("drawing"), tool: z.string() }),
]);

export type OverlayAction = z.infer<typeof overlayActionSchema>;

export const overlayParseResponseSchema = z.object({
  actions: z.array(overlayActionSchema),
});

export type OverlayParseResponse = z.infer<typeof overlayParseResponseSchema>;

export const indexRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  source: z.enum(["NSE", "BSE"]),
  ltp: z.number(),
  pctChg: z.number(),
  ytdPct: z.number(),
  sparkline: z.array(z.number()),
});

export type IndexRow = z.infer<typeof indexRowSchema>;

export const ohlcBarSchema = z.object({
  time: z.number(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number().optional(),
});

export type OhlcBar = z.infer<typeof ohlcBarSchema>;
