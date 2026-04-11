import { DEFAULT_SCREENER_FILTERS } from "@/lib/constants/screener-defaults";
import type { ScreenerFilters } from "@/lib/schemas";

const REQUIRED_STRING_KEYS = [
  "marketCap",
  "salesGrowth1y3y",
  "netProfitGrowth1y3y",
  "debtToEquity",
  "promoterHolding",
  "fiiDiiHolding",
  "avgRoeRoce3y",
  "pe",
  "last2QtrRevProfit",
] as const satisfies readonly (keyof ScreenerFilters)[];

const OPTIONAL_CUSTOM_KEYS = [
  "marketCapCustom",
  "salesGrowthCustom",
  "netProfitGrowthCustom",
  "debtToEquityCustom",
  "promoterHoldingCustom",
  "fiiDiiHoldingCustom",
  "avgRoeRoceCustom",
  "peCustom",
] as const;

/**
 * Merge client `filters` with defaults and drop null/invalid values so Zod
 * never sees null on optional strings or bad sector types.
 */
export function mergeScreenerFiltersFromRequest(partial: unknown): ScreenerFilters {
  const p =
    partial && typeof partial === "object" && partial !== null
      ? (partial as Record<string, unknown>)
      : {};

  const out: ScreenerFilters = { ...DEFAULT_SCREENER_FILTERS };

  const o = out as unknown as Record<string, string | string[]>;
  for (const key of REQUIRED_STRING_KEYS) {
    const v = p[key];
    if (typeof v === "string") {
      o[key] = v;
    }
  }

  const sec = p.sectors;
  if (Array.isArray(sec)) {
    out.sectors = sec.filter((x): x is string => typeof x === "string");
  }

  for (const key of OPTIONAL_CUSTOM_KEYS) {
    const v = p[key];
    if (typeof v === "string") {
      o[key] = v;
    }
  }

  return out as ScreenerFilters;
}

export function normalizeStrategyIds(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.filter((x): x is string => typeof x === "string");
}

export function normalizeMarket(
  raw: unknown,
): "IN" | "US" | undefined {
  if (raw === "IN" || raw === "US") return raw;
  return undefined;
}
