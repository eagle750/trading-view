"use client";

import { useCallback, useMemo, useState } from "react";
import { ChartWorkspace } from "@/components/chart/chart-workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SignalRow } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { useScreenerStore } from "@/stores/screener-store";

export type InstrumentChoice = { symbol: string; label: string };

function normalizeSymbol(s: string): string {
  return s.trim().toUpperCase().replace(/\s+/g, "");
}

function sortByScoreDesc(rows: SignalRow[]): SignalRow[] {
  return [...rows].sort((a, b) => b.score - a.score);
}

function rowsToChoices(rows: SignalRow[]): InstrumentChoice[] {
  return rows.slice(0, 150).map((r) => ({
    symbol: r.symbol,
    label: `${r.symbol} · ${r.sector}`,
  }));
}

const CUSTOM = "__custom__";

export function SymbolChartSection({
  primaryTicker,
  instrumentChoices,
}: {
  primaryTicker: string;
  /** Listed names from bundled universe (server-sorted). */
  instrumentChoices: InstrumentChoice[];
}) {
  const p = useMemo(
    () => normalizeSymbol(primaryTicker) || primaryTicker,
    [primaryTicker],
  );

  const storeSignals = useScreenerStore((s) => s.signals);

  const options = useMemo(() => {
    const fromRows: InstrumentChoice[] =
      storeSignals && storeSignals.length > 0
        ? rowsToChoices(sortByScoreDesc(storeSignals))
        : instrumentChoices;
    const rest = fromRows.filter((o) => o.symbol.toUpperCase() !== p.toUpperCase());
    return [{ symbol: p, label: `${p} · this page` }, ...rest];
  }, [storeSignals, instrumentChoices, p]);

  const optionSymbols = useMemo(
    () => new Set(options.map((o) => o.symbol.toUpperCase())),
    [options],
  );

  const [inputs, setInputs] = useState<[string, string, string]>(() => [p, p, p]);
  const [customSlots, setCustomSlots] = useState<[string, string, string]>(["", "", ""]);
  const [applied, setApplied] = useState<[string, string, string, string]>(() => [
    p,
    p,
    p,
    p,
  ]);

  const resolveSlot = useCallback(
    (i: 0 | 1 | 2, fallback: string): string => {
      const raw = inputs[i] ?? "";
      if (raw === CUSTOM) return normalizeSymbol(customSlots[i] ?? "") || fallback;
      return normalizeSymbol(raw) || fallback;
    },
    [inputs, customSlots],
  );

  const apply = useCallback(() => {
    setApplied([p, resolveSlot(0, p), resolveSlot(1, p), resolveSlot(2, p)]);
  }, [resolveSlot, p]);

  const setInstrumentSlot = useCallback((i: 0 | 1 | 2, v: string) => {
    setInputs((prev) => {
      const n: [string, string, string] = [...prev];
      n[i] = v;
      return n;
    });
    if (v !== CUSTOM) {
      setCustomSlots((prev) => {
        const n: [string, string, string] = [...prev];
        n[i] = "";
        return n;
      });
    }
  }, []);

  const gridKey = applied.join("|");

  return (
    <div className="space-y-4">
      <div className="rounded-sm border border-[var(--border)] bg-[var(--surface)] px-3 py-3 space-y-2">
        <div className="text-xs font-medium text-[var(--foreground)]">
          Four-symbol chart grid (2×2)
        </div>
        <p className="text-[10px] text-[var(--muted)] leading-relaxed">
          <strong className="font-medium text-[var(--foreground)]">Panel 1</strong> is always this
          page’s symbol. <strong className="font-medium text-[var(--foreground)]">Panels 2–4</strong>{" "}
          choose other <strong className="font-medium">NSE cash symbols</strong> from the list (or
          your last screener <strong className="font-medium">Run</strong> when available). Use
          Custom to type any listed ticker. Click Apply to update charts.
        </p>
        <div className="flex flex-wrap gap-2 items-end">
          <label className="flex flex-col gap-0.5 min-w-[10rem] flex-1 sm:flex-none sm:min-w-[11rem]">
            <span className="text-[10px] text-[var(--muted)]">
              Panel 1 · Page symbol (always)
            </span>
            <div
              className={cn(
                "h-8 flex items-center px-2 rounded-sm border border-[var(--border)] bg-[var(--background)]/80",
                "text-xs font-[family-name:var(--font-jetbrains)] text-[var(--foreground)]",
              )}
            >
              {p}
            </div>
          </label>

          {([0, 1, 2] as const).map((i) => {
            const raw = inputs[i] ?? "";
            const useCustom = raw === CUSTOM;
            const upper = raw.trim().toUpperCase();
            const inList = !useCustom && raw !== "" && optionSymbols.has(upper);
            const selectValue = useCustom || (!inList && raw !== "") ? CUSTOM : upper;

            return (
              <label
                key={i}
                className="flex flex-col gap-0.5 min-w-[10rem] flex-1 sm:flex-none sm:min-w-[11rem]"
              >
                <span className="text-[10px] text-[var(--muted)]">
                  Panel {i + 2} · Instrument
                </span>
                <select
                  className={cn(
                    "h-8 w-full rounded-sm border border-[var(--border)] bg-[var(--background)] px-2 text-xs text-[var(--foreground)] font-[family-name:var(--font-jetbrains)]",
                    "focus:outline-none focus:ring-1 focus:ring-[#3b82f6]",
                  )}
                  value={selectValue}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === CUSTOM) setInstrumentSlot(i, CUSTOM);
                    else setInstrumentSlot(i, v);
                  }}
                >
                  {options.map((o) => (
                    <option key={o.symbol} value={o.symbol}>
                      {o.label}
                    </option>
                  ))}
                  <option value={CUSTOM}>Custom symbol…</option>
                </select>
                {useCustom || (!inList && raw !== "") ? (
                  <Input
                    className="h-8 text-xs font-[family-name:var(--font-jetbrains)] mt-1"
                    value={useCustom ? customSlots[i] ?? "" : raw}
                    onChange={(e) => {
                      const t = e.target.value;
                      setInstrumentSlot(i, CUSTOM);
                      setCustomSlots((prev) => {
                        const n: [string, string, string] = [...prev];
                        n[i] = t;
                        return n;
                      });
                    }}
                    placeholder="e.g. HDFCBANK, RELIANCE"
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
        key={gridKey}
        ticker={primaryTicker}
        gridSymbols={applied}
        initialGridMode
      />
    </div>
  );
}
