import { create } from "zustand";
import type { MarketId } from "@/config/market.config";
import { DEFAULT_MARKET } from "@/config/market.config";

interface MarketState {
  market: MarketId;
  setMarket: (m: MarketId) => void;
}

export const useMarketStore = create<MarketState>((set) => ({
  market: DEFAULT_MARKET,
  setMarket: (m) => set({ market: m }),
}));
