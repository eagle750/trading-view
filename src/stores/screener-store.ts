import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_SCREENER_FILTERS } from "@/lib/constants/screener-defaults";
import type { ScreenerFilters } from "@/lib/schemas";
import type { SignalRow } from "@/lib/schemas";

export interface StrategyCard {
  id: string;
  filename: string;
  summaryBullets: string[];
  tags: string[];
  useForSignals: boolean;
}

const defaultFilters: ScreenerFilters = { ...DEFAULT_SCREENER_FILTERS };

interface ScreenerState {
  filters: ScreenerFilters;
  setFilters: (p: Partial<ScreenerFilters>) => void;
  resetFilters: () => void;
  strategies: StrategyCard[];
  addStrategy: (s: StrategyCard) => void;
  removeStrategy: (id: string) => void;
  toggleStrategySignals: (id: string) => void;
  signals: SignalRow[] | null;
  signalsByStrategy: Record<string, SignalRow[]> | null;
  setSignals: (rows: SignalRow[] | null) => void;
  setSignalsByStrategy: (m: Record<string, SignalRow[]> | null) => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
  /** Strategy ids included in the last successful Run (empty = filters-only run). */
  lastRunStrategyIds: string[] | null;
  setLastRunStrategyIds: (ids: string[] | null) => void;
}

export const useScreenerStore = create<ScreenerState>()(
  persist(
    (set) => ({
      filters: defaultFilters,
      setFilters: (p) => set((s) => ({ filters: { ...s.filters, ...p } })),
      resetFilters: () => set({ filters: defaultFilters }),
      strategies: [],
      addStrategy: (card) =>
        set((s) => ({ strategies: [...s.strategies, card] })),
      removeStrategy: (id) =>
        set((s) => ({
          strategies: s.strategies.filter((x) => x.id !== id),
        })),
      toggleStrategySignals: (id) =>
        set((s) => ({
          strategies: s.strategies.map((x) =>
            x.id === id ? { ...x, useForSignals: !x.useForSignals } : x,
          ),
        })),
      signals: null,
      signalsByStrategy: null,
      setSignals: (rows) => set({ signals: rows }),
      setSignalsByStrategy: (m) => set({ signalsByStrategy: m }),
      loading: false,
      setLoading: (v) => set({ loading: v }),
      lastRunStrategyIds: null,
      setLastRunStrategyIds: (ids) => set({ lastRunStrategyIds: ids }),
    }),
    {
      name: "trade-screener-store",
      partialize: (state) => ({ strategies: state.strategies }),
    },
  ),
);
