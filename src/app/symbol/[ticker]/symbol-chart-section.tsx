"use client";

import { useCallback, useState } from "react";
import { ChartWorkspace } from "@/components/chart/chart-workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CHART_INDEX_SELECT_OPTIONS,
  isChartIndexValue,
} from "@/config/chart-index-options";
import { cn } from "@/lib/utils";

function normalizeSymbol(s: string): string {
  return s.trim().toUpperCase().replace(/\s+/g, "");
}

export function SymbolChartSection({ primaryTicker }: { primaryTicker: string }) {
  const [inputs, setInputs] = useState([
    primaryTicker,
    "NIFTY",
    "BANKNIFTY",
    "HDFCBANK",
  ]);
  const [applied, setApplied] = useState<[string, string, string, string]>(() => [
    primaryTicker,
    "NIFTY",
    "BANKNIFTY",
    "HDFCBANK",
  ]);

  const setSlot = useCallback((i: number, v: string) => {
    setInputs((prev) => {
      const n = [...prev];
      n[i] = v;
      return n;
    });
  }, []);

  const apply = useCallback(() => {
    const t = primaryTicker;
    const next: [string, string, string, string] = [
      normalizeSymbol(inputs[0] ?? "") || t,
      normalizeSymbol(inputs[1] ?? "") || t,
      normalizeSymbol(inputs[2] ?? "") || t,
      normalizeSymbol(inputs[3] ?? "") || t,
    ];
    setApplied(next);
  }, [inputs, primaryTicker]);

  return (
    <div className="space-y-4">
      <div className="rounded-sm border border-[var(--border)] bg-[var(--surface)] px-3 py-3 space-y-2">
        <div className="text-xs font-medium text-[var(--foreground)]">
          Four-symbol chart grid (2×2)
        </div>
        <p className="text-[10px] text-[var(--muted)] leading-relaxed">
          Choose an index from the dropdown, or pick &quot;Custom symbol&quot; for any NSE stock
          ticker. Each panel uses the same timeframes, indicators, and overlay tools as the single
          chart.
        </p>
        <div className="flex flex-wrap gap-2 items-end">
          {[0, 1, 2, 3].map((i) => {
            const raw = inputs[i] ?? "";
            const useCustom = !isChartIndexValue(raw);
            return (
              <label key={i} className="flex flex-col gap-0.5 min-w-[10rem] flex-1 sm:flex-none sm:min-w-[11rem]">
                <span className="text-[10px] text-[var(--muted)]">Panel {i + 1}</span>
                <select
                  className={cn(
                    "h-8 w-full rounded-sm border border-[var(--border)] bg-[var(--background)] px-2 text-xs text-[var(--foreground)] font-[family-name:var(--font-jetbrains)]",
                    "focus:outline-none focus:ring-1 focus:ring-[#3b82f6]",
                  )}
                  value={useCustom ? "__custom__" : raw.toUpperCase()}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "__custom__") setSlot(i, "");
                    else setSlot(i, v);
                  }}
                >
                  {CHART_INDEX_SELECT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                  <option value="__custom__">Custom symbol (stock)…</option>
                </select>
                {useCustom ? (
                  <Input
                    className="h-8 text-xs font-[family-name:var(--font-jetbrains)] mt-1"
                    value={raw}
                    onChange={(e) => setSlot(i, e.target.value)}
                    placeholder="e.g. RELIANCE, HDFCBANK"
                    autoCapitalize="characters"
                  />
                ) : null}
              </label>
            );
          })}
          <Button type="button" variant="primary" className="h-8 text-xs" onClick={apply}>
            Apply
          </Button>
        </div>
      </div>

      <ChartWorkspace
        key={applied.join("|")}
        ticker={primaryTicker}
        gridSymbols={applied}
        initialGridMode
      />
    </div>
  );
}
