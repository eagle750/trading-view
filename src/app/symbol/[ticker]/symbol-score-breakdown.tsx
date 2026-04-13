"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { SignalRow } from "@/lib/schemas";
import { parseLastBracketMeta } from "@/lib/signal-row-link";
import { SEED_SIGNALS } from "@/lib/seed/signals";
import { useScreenerStore } from "@/stores/screener-store";

function pickLiveRow(
  ticker: string,
  signals: SignalRow[] | null,
  signalsByStrategy: Record<string, SignalRow[]> | null,
  lastRunStrategyIds: string[] | null,
): SignalRow | null {
  const u = ticker.toUpperCase();
  if (signals?.length) {
    const r = signals.find((s) => s.symbol.toUpperCase() === u);
    if (r) return r;
  }
  if (signalsByStrategy && lastRunStrategyIds?.length) {
    for (const id of lastRunStrategyIds) {
      const rows = signalsByStrategy[id];
      const r = rows?.find((s) => s.symbol.toUpperCase() === u);
      if (r) return r;
    }
  }
  if (signalsByStrategy) {
    for (const rows of Object.values(signalsByStrategy)) {
      const r = rows?.find((s) => s.symbol.toUpperCase() === u);
      if (r) return r;
    }
  }
  return null;
}

function readUrlBreakdown(sp: URLSearchParams, baseScore: number | null) {
  const fromScore = Number(sp.get("score"));
  const fromFit = Number(sp.get("fit"));
  const fromSignal = sp.get("signal") ?? "";
  const fromStrategy = sp.get("strategy") ?? undefined;
  let blendBasePct: number | null = null;
  let blendFitPct: number | null = null;
  const bb = sp.get("blendBase");
  const bf = sp.get("blendFit");
  if (bb != null && bb !== "") {
    const n = Math.round(Number(bb));
    if (Number.isFinite(n) && n >= 5 && n <= 95) blendBasePct = n;
  }
  if (bf != null && bf !== "") {
    const n = Math.round(Number(bf));
    if (Number.isFinite(n) && n >= 5 && n <= 95) blendFitPct = n;
  }
  if (blendBasePct != null && Number.isFinite(blendBasePct) && blendFitPct == null) {
    blendFitPct = 100 - blendBasePct;
  } else if (blendFitPct != null && Number.isFinite(blendFitPct) && blendBasePct == null) {
    blendBasePct = 100 - blendFitPct;
  }
  const blendSumOk =
    blendBasePct != null &&
    blendFitPct != null &&
    blendBasePct + blendFitPct === 100;

  const hasRowContext =
    baseScore != null &&
    Number.isFinite(fromFit) &&
    Number.isFinite(fromScore) &&
    fromSignal.length > 0;

  const hasBreakdown = hasRowContext && blendSumOk;
  const blendedRaw =
    hasBreakdown && blendBasePct != null && blendFitPct != null
      ? baseScore! * (blendBasePct / 100) + fromFit * (blendFitPct / 100)
      : null;
  const recomputedScore =
    blendedRaw != null ? Math.min(99, Math.max(1, Math.round(blendedRaw))) : null;

  return {
    source: "url" as const,
    baseScore,
    fromFit,
    fromScore,
    fromSignal,
    fromStrategy,
    blendBasePct,
    blendFitPct,
    recomputedScore,
    hasRowContext,
    hasBreakdown,
    needsBlendUpgrade: hasRowContext && !blendSumOk,
  };
}

function readLiveBreakdown(row: SignalRow, baseScore: number | null) {
  const meta = parseLastBracketMeta(row.triggeredRule);
  const fromFit = meta.fit;
  const fromStrategy = meta.strategyLabel;
  const blendBasePct = meta.blendBase ?? null;
  const blendFitPct = meta.blendFit ?? null;
  const blendSumOk =
    blendBasePct != null &&
    blendFitPct != null &&
    blendBasePct + blendFitPct === 100;

  const hasRowContext =
    baseScore != null &&
    typeof fromFit === "number" &&
    Number.isFinite(fromFit) &&
    Number.isFinite(row.score) &&
    row.signal.length > 0;

  const hasBreakdown = hasRowContext && blendSumOk;
  const blendedRaw =
    hasBreakdown && blendBasePct != null && blendFitPct != null && fromFit != null
      ? baseScore! * (blendBasePct / 100) + fromFit * (blendFitPct / 100)
      : null;
  const recomputedScore =
    blendedRaw != null ? Math.min(99, Math.max(1, Math.round(blendedRaw))) : null;

  return {
    source: "live" as const,
    baseScore,
    fromFit: fromFit ?? NaN,
    fromScore: row.score,
    fromSignal: row.signal,
    fromStrategy,
    blendBasePct,
    blendFitPct,
    recomputedScore,
    hasRowContext,
    hasBreakdown,
    needsBlendUpgrade: hasRowContext && !blendSumOk,
  };
}

export function SymbolScoreBreakdown({ ticker }: { ticker: string }) {
  const searchParams = useSearchParams();
  const signals = useScreenerStore((s) => s.signals);
  const signalsByStrategy = useScreenerStore((s) => s.signalsByStrategy);
  const lastRunStrategyIds = useScreenerStore((s) => s.lastRunStrategyIds);

  const seedRow = useMemo(
    () => SEED_SIGNALS.find((s) => s.symbol.toUpperCase() === ticker.toUpperCase()),
    [ticker],
  );
  const baseScore = seedRow?.score ?? null;

  const liveRow = useMemo(
    () => pickLiveRow(ticker, signals, signalsByStrategy, lastRunStrategyIds),
    [ticker, signals, signalsByStrategy, lastRunStrategyIds],
  );

  const resolved = useMemo(() => {
    if (liveRow) {
      return readLiveBreakdown(liveRow, baseScore);
    }
    return readUrlBreakdown(searchParams, baseScore);
  }, [liveRow, searchParams, baseScore]);

  if (!resolved.hasRowContext && !resolved.needsBlendUpgrade) {
    return (
      <div className="mb-4 rounded-sm border border-[var(--border)] bg-[var(--surface)] p-3 text-[11px] text-[var(--muted)] leading-relaxed">
        <span className="text-[var(--foreground)] font-medium">Score breakdown</span> appears here
        after you{" "}
        <span className="text-[var(--foreground)]">Run</span> the screener with this symbol in the
        results (or open this page from a signals row link). Changing strategy files and running
        again updates the numbers below automatically while this symbol stays in the table.
      </div>
    );
  }

  return (
    <div className="mb-4 space-y-2">
      <p className="text-[10px] text-[var(--muted)] leading-relaxed">
        {resolved.source === "live" ? (
          <>
            <span className="text-[#22c55e] font-medium">Live</span> — values follow your latest{" "}
            <span className="text-[var(--foreground)]">Run</span> in this browser. Upload a new
            strategy, click Run, and this block updates without needing a fresh link.
          </>
        ) : (
          <>
            <span className="text-[var(--foreground)] font-medium">From link</span> — no matching
            row in the current signals store. Run the screener, then either keep this tab open after
            Run (this panel will pick up live rows) or open the symbol again from the signals table.
          </>
        )}
      </p>

      {resolved.needsBlendUpgrade ? (
        <div className="rounded-sm border border-[var(--border)] bg-[var(--surface)] p-3 text-[11px] text-[var(--muted)] leading-relaxed">
          <span className="text-[var(--foreground)] font-medium">Score breakdown</span> needs
          blend weights on the row. Click <span className="text-[var(--foreground)]">Run</span> on
          the home screener so each row includes{" "}
          <span className="font-[family-name:var(--font-jetbrains)] text-[var(--foreground)]">
            blend X/Y
          </span>{" "}
          in <span className="font-[family-name:var(--font-jetbrains)]">triggeredRule</span>.
        </div>
      ) : null}

      {resolved.hasBreakdown &&
      resolved.blendBasePct != null &&
      resolved.blendFitPct != null &&
      resolved.recomputedScore != null &&
      Number.isFinite(resolved.fromFit) ? (
        <div className="rounded-sm border border-[var(--border)] bg-[var(--surface)] p-3">
          <div className="text-xs font-medium text-[var(--foreground)] mb-1">
            Score logic from selected screener row
          </div>
          <p className="text-[11px] text-[var(--muted)] leading-relaxed">
            Base score ({resolved.baseScore}) and strategy fit ({resolved.fromFit}) combine as{" "}
            <span className="font-[family-name:var(--font-jetbrains)] text-[var(--foreground)]">
              round({resolved.blendBasePct}% × {resolved.baseScore} + {resolved.blendFitPct}% ×{" "}
              {resolved.fromFit})
            </span>{" "}
            ={" "}
            <span className="text-[var(--foreground)]">{resolved.recomputedScore}</span>. Row score:{" "}
            <span className="text-[var(--foreground)]">{resolved.fromScore}</span> (
            {resolved.fromSignal}).
            {resolved.fromStrategy ? (
              <>
                {" "}
                Strategy key:{" "}
                <span className="font-[family-name:var(--font-jetbrains)] text-[var(--foreground)]">
                  {resolved.fromStrategy}
                </span>
                .
              </>
            ) : null}
          </p>
          <div className="mt-2 border-t border-[var(--border)] pt-2 text-[11px] text-[var(--muted)] leading-relaxed">
            <div className="text-[var(--foreground)] mb-1">Number origin</div>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>
                <span className="text-[var(--foreground)]">Base score ({resolved.baseScore})</span>
                : from this symbol&apos;s seeded universe row before strategy re-ranking.
              </li>
              <li>
                <span className="text-[var(--foreground)]">
                  Strategy fit ({resolved.fromFit})
                </span>
                : from the strategy tag on the signal row (parsed rule model × symbol fundamentals
                and daily change).
              </li>
              <li>
                <span className="text-[var(--foreground)]">
                  Blend ({resolved.blendBasePct}% base / {resolved.blendFitPct}% fit)
                </span>
                : from your uploaded strategy text when the file was parsed (explicit base/fit
                percentages when found; otherwise inferred). Echoed on the row as{" "}
                <span className="font-[family-name:var(--font-jetbrains)] text-[var(--foreground)]">
                  blend {resolved.blendBasePct}/{resolved.blendFitPct}
                </span>
                .
              </li>
              <li>
                <span className="text-[var(--foreground)]">
                  Final score ({resolved.recomputedScore})
                </span>
                : rounded blend, clamped to 1–99.
              </li>
              <li>
                <span className="text-[var(--foreground)]">
                  Row score ({resolved.fromScore})
                </span>
                : composite score stored on that signal row (
                {resolved.source === "live" ? "current Run" : "from the link you used"}).
              </li>
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
