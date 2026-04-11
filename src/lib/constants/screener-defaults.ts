import type { ScreenerFilters } from "@/lib/schemas";

/** Defaults for new sessions and for merging partial API bodies */
export const DEFAULT_SCREENER_FILTERS: ScreenerFilters = {
  marketCap: "NA",
  salesGrowth1y3y: "NA",
  netProfitGrowth1y3y: "NA",
  debtToEquity: "NA",
  promoterHolding: "NA",
  fiiDiiHolding: "NA",
  avgRoeRoce3y: "NA",
  pe: "NA",
  sectors: [],
  last2QtrRevProfit: "NA",
};
