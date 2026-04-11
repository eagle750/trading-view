"use client";

import { useCallback, useMemo, useState } from "react";
import { ChartWorkspace } from "@/components/chart/chart-workspace";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function normalizeSymbol(s: string): string {
  return s.trim().toUpperCase().replace(/\s+/g, "");
}

/** How panels 2–4 label the same underlying chart symbol. */
type PanelSlot = "plain" | "buy" | "sell";

const SLOT_ORDER: PanelSlot[] = ["plain", "buy", "sell"];

export function SymbolChartSection({ primaryTicker }: { primaryTicker: string }) {
  const p = useMemo(
    () => normalizeSymbol(primaryTicker) || primaryTicker,
    [primaryTicker],
  );

  const slotLabels = useMemo(() => {
    return {
      plain: p,
      buy: `${p} BUY`,
      sell: `${p} SELL`,
    } as const;
  }, [p]);

  const [inputs, setInputs] = useState<[PanelSlot, PanelSlot, PanelSlot]>([
    "plain",
    "plain",
    "plain",
  ]);
  const [appliedSlots, setAppliedSlots] = useState<[PanelSlot, PanelSlot, PanelSlot]>([
    "plain",
    "plain",
    "plain",
  ]);

  const panelTitles = useMemo((): [string, string, string, string] => {
    return [
      p,
      slotLabels[appliedSlots[0]],
      slotLabels[appliedSlots[1]],
      slotLabels[appliedSlots[2]],
    ];
  }, [p, appliedSlots, slotLabels]);

  const apply = useCallback(() => {
    setAppliedSlots(inputs);
  }, [inputs]);

  const setSlot = useCallback((i: 0 | 1 | 2, v: PanelSlot) => {
    setInputs((prev) => {
      const n: [PanelSlot, PanelSlot, PanelSlot] = [...prev];
      n[i] = v;
      return n;
    });
  }, []);

  const gridKey = `${p}|${appliedSlots.join("-")}`;

  return (
    <div className="space-y-4">
      <div className="rounded-sm border border-[var(--border)] bg-[var(--surface)] px-3 py-3 space-y-2">
        <div className="text-xs font-medium text-[var(--foreground)]">
          Four-symbol chart grid (2×2)
        </div>
        <p className="text-[10px] text-[var(--muted)] leading-relaxed">
          <strong className="font-medium text-[var(--foreground)]">Panel 1</strong> is this page’s
          symbol. <strong className="font-medium text-[var(--foreground)]">Panels 2–4</strong> each
          pick <strong className="font-medium">{slotLabels.plain}</strong>,{" "}
          <strong className="font-medium">{slotLabels.buy}</strong>, or{" "}
          <strong className="font-medium">{slotLabels.sell}</strong> — same OHLC chart; labels mark
          how you’re thinking about the trade. Click Apply to update the grid.
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

          {([0, 1, 2] as const).map((i) => (
            <label
              key={i}
              className="flex flex-col gap-0.5 min-w-[10rem] flex-1 sm:flex-none sm:min-w-[11rem]"
            >
              <span className="text-[10px] text-[var(--muted)]">
                Panel {i + 2} · Symbol
              </span>
              <select
                className={cn(
                  "h-8 w-full rounded-sm border border-[var(--border)] bg-[var(--background)] px-2 text-xs text-[var(--foreground)] font-[family-name:var(--font-jetbrains)]",
                  "focus:outline-none focus:ring-1 focus:ring-[#3b82f6]",
                )}
                value={inputs[i]}
                onChange={(e) => setSlot(i, e.target.value as PanelSlot)}
              >
                {SLOT_ORDER.map((slot) => (
                  <option key={slot} value={slot}>
                    {slotLabels[slot]}
                  </option>
                ))}
              </select>
            </label>
          ))}

          <Button type="button" variant="primary" className="h-8 text-xs" onClick={apply}>
            Apply
          </Button>
        </div>
      </div>

      <ChartWorkspace
        key={gridKey}
        ticker={primaryTicker}
        gridSymbols={[p, p, p, p]}
        gridPanelTitles={panelTitles}
        initialGridMode
      />
    </div>
  );
}
