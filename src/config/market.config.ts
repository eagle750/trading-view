/**
 * Market configuration — extend with NASDAQ/US by adding entries and wiring data providers.
 */
export type MarketId = "IN" | "US";

export interface MarketDefinition {
  id: MarketId;
  label: string;
  currency: string;
  currencySymbol: string;
  exchanges: string[];
  screenerProvider: "screener.in" | "tickertape" | "trendlyne" | "mock";
  indicesCategories: readonly ("broad" | "sectoral" | "thematic")[];
  /** When false, UI shows as disabled / coming soon */
  enabled: boolean;
}

export const MARKETS: Record<MarketId, MarketDefinition> = {
  IN: {
    id: "IN",
    label: "India",
    currency: "INR",
    currencySymbol: "₹",
    exchanges: ["NSE", "BSE"],
    screenerProvider: "mock",
    indicesCategories: ["broad", "sectoral", "thematic"],
    enabled: true,
  },
  US: {
    id: "US",
    label: "NASDAQ",
    currency: "USD",
    currencySymbol: "$",
    exchanges: ["NASDAQ", "NYSE"],
    screenerProvider: "mock",
    indicesCategories: ["broad", "sectoral", "thematic"],
    enabled: false,
  },
} as const;

export const DEFAULT_MARKET: MarketId = "IN";
