"use client";

import { Group, Panel, Separator } from "react-resizable-panels";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { SignalRow } from "@/lib/schemas";
import { useScreenerStore } from "@/stores/screener-store";
import { cn } from "@/lib/utils";

const COMPARE_PANE_ROW_LIMIT = 200;
const INTERSECTION_DISPLAY_LIMIT = 250;

function PaneTable({
  title,
  rows,
  otherSymbols,
  mode,
  scrollRef,
  onScroll,
}: {
  title: string;
  rows: SignalRow[];
  otherSymbols: Set<string>;
  mode: "a" | "b";
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}) {
  return (
    <div className="flex flex-col min-h-0 min-w-0 border border-[var(--border)] rounded-sm bg-[var(--surface)]">
      <div className="px-3 py-2 border-b border-[var(--border)] text-sm font-medium text-[var(--foreground)]">
        <div className="truncate">{title}</div>
        {rows.length >= COMPARE_PANE_ROW_LIMIT ? (
          <div className="text-[10px] text-[var(--muted)] font-normal mt-0.5">
            Showing top {COMPARE_PANE_ROW_LIMIT} by score (full list on main signals table)
          </div>
        ) : null}
      </div>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="overflow-auto max-h-[420px]"
      >
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-[var(--surface)] z-[1] border-b border-[var(--border)]">
            <tr className="text-left text-[var(--muted)]">
              <th className="px-2 py-2">Symbol</th>
              <th className="px-2 py-2">Signal</th>
              <th className="px-2 py-2">Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const overlap = otherSymbols.has(r.symbol);
              const rowClass =
                overlap
                  ? "bg-[#3a2f15] border-l-2 border-l-[#f59e0b]"
                  : mode === "a"
                    ? "bg-[#16243a]"
                    : "bg-[#241a3a]";
              return (
                <tr
                  key={r.symbol}
                  className={cn(
                    "border-b border-[var(--border)] transition-app",
                    rowClass,
                  )}
                >
                  <td className="px-2 py-3 font-[family-name:var(--font-jetbrains)]">
                    <Link
                      href={`/symbol/${encodeURIComponent(r.symbol)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#3b82f6] hover:underline"
                    >
                      {r.symbol}
                    </Link>
                  </td>
                  <td
                    className={cn(
                      "px-2 py-3 font-[family-name:var(--font-jetbrains)]",
                      r.signal === "BUY" && "text-[#22c55e]",
                      r.signal === "SELL" && "text-[#ef4444]",
                    )}
                  >
                    {r.signal}
                  </td>
                  <td className="px-2 py-3 tabular-nums">{r.score}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CompareView({
  signalsByStrategy,
}: {
  signalsByStrategy: Record<string, SignalRow[]>;
}) {
  const { strategies } = useScreenerStore();
  const active = strategies.filter((s) => s.useForSignals);
  const ids = Object.keys(signalsByStrategy);
  const [sync, setSync] = useState(false);
  const [openIntersection, setOpenIntersection] = useState(true);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  const entries = useMemo(() => {
    return ids.map((id) => {
      const st = active.find((a) => a.id === id);
      return {
        id,
        name: st?.filename ?? id,
        rows: signalsByStrategy[id] ?? [],
      };
    });
  }, [ids, signalsByStrategy, active]);

  const a = entries[0];
  const b = entries[1];

  const { stats, intersectionRows, conflictSymbols } = useMemo(() => {
    if (!a || !b) {
      return {
        stats: { onlyA: 0, onlyB: 0, overlap: 0, conflicts: 0 },
        intersectionRows: [] as Array<{
          symbol: string;
          score: number;
          sa: string;
          sb: string;
        }>,
        conflictSymbols: new Set<string>(),
      };
    }
    const mapA = new Map(a.rows.map((r) => [r.symbol, r]));
    const mapB = new Map(b.rows.map((r) => [r.symbol, r]));
    const symA = new Set(mapA.keys());
    const symB = new Set(mapB.keys());
    let onlyA = 0;
    let onlyB = 0;
    let overlap = 0;
    let conflicts = 0;
    const conflictsSet = new Set<string>();
    for (const s of symA) {
      if (symB.has(s)) {
        overlap++;
        const ra = mapA.get(s)!;
        const rb = mapB.get(s)!;
        if (
          (ra.signal === "BUY" && rb.signal === "SELL") ||
          (ra.signal === "SELL" && rb.signal === "BUY")
        ) {
          conflicts++;
          conflictsSet.add(s);
        }
      } else onlyA++;
    }
    for (const s of symB) {
      if (!symA.has(s)) onlyB++;
    }
    const inter: Array<{
      symbol: string;
      score: number;
      sa: string;
      sb: string;
    }> = [];
    for (const s of symA) {
      if (!symB.has(s)) continue;
      const ra = mapA.get(s)!;
      const rb = mapB.get(s)!;
      inter.push({
        symbol: s,
        score: Math.round((ra.score + rb.score) / 2),
        sa: ra.signal,
        sb: rb.signal,
      });
    }
    return {
      stats: { onlyA, onlyB, overlap, conflicts },
      intersectionRows: inter,
      conflictSymbols: conflictsSet,
    };
  }, [a, b]);

  const onScrollLeft = (e: React.UIEvent<HTMLDivElement>) => {
    if (!sync || !rightRef.current) return;
    rightRef.current.scrollTop = e.currentTarget.scrollTop;
  };
  const onScrollRight = (e: React.UIEvent<HTMLDivElement>) => {
    if (!sync || !leftRef.current) return;
    leftRef.current.scrollTop = e.currentTarget.scrollTop;
  };

  if (!a || !b) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Need two active strategies with signal data for side-by-side compare.
      </p>
    );
  }

  const symA = new Set(a.rows.map((r) => r.symbol));
  const symB = new Set(b.rows.map((r) => r.symbol));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="rounded-sm border border-[var(--border)] px-2 py-1 bg-[#16243a] text-[var(--foreground)]">
          A only: {stats.onlyA}
        </span>
        <span className="rounded-sm border border-[var(--border)] px-2 py-1 bg-[#241a3a] text-[var(--foreground)]">
          B only: {stats.onlyB}
        </span>
        <span className="rounded-sm border border-[var(--border)] px-2 py-1 bg-[#3a2f15] border-l-2 border-l-[#f59e0b] text-[var(--foreground)]">
          Overlap: {stats.overlap}
        </span>
        {stats.conflicts > 0 ? (
          <span className="text-[#f59e0b]">
            Conflicts (BUY vs SELL): {stats.conflicts}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-[var(--muted)]">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block w-3 h-3 bg-[#3a2f15] border-l-2 border-[#f59e0b]" />{" "}
          Common
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block w-3 h-3 bg-[#16243a]" /> A only
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block w-3 h-3 bg-[#241a3a]" /> B only
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setOpenIntersection((o) => !o)}
        >
          {openIntersection ? "Hide" : "Show"} intersection panel
        </Button>
        <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
          Sync scroll
          <Switch checked={sync} onCheckedChange={setSync} />
        </label>
      </div>

      {openIntersection ? (
        <div className="rounded-sm border border-[var(--border)] bg-[var(--surface)] p-3">
          <div className="text-sm text-[var(--foreground)] mb-2">
            Intersection — combined score
          </div>
          <div className="overflow-x-auto max-h-40 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[var(--muted)] text-left">
                  <th className="py-1 pr-2">Symbol</th>
                  <th className="py-1 pr-2">Score</th>
                  <th className="py-1 pr-2">A</th>
                  <th className="py-1">B</th>
                </tr>
              </thead>
              <tbody>
                {intersectionRows.slice(0, INTERSECTION_DISPLAY_LIMIT).map((r) => (
                  <tr key={r.symbol} className="border-t border-[var(--border)]">
                    <td className="py-2 font-[family-name:var(--font-jetbrains)]">
                      <Link
                        href={`/symbol/${encodeURIComponent(r.symbol)}`}
                        target="_blank"
                        className="text-[#3b82f6]"
                      >
                        {r.symbol}
                      </Link>
                      {conflictSymbols.has(r.symbol) ? (
                        <span className="ml-1 text-[#f59e0b] text-[10px]">
                          [conflict]
                        </span>
                      ) : null}
                    </td>
                    <td className="tabular-nums">{r.score}</td>
                    <td>{r.sa}</td>
                    <td>{r.sb}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <Group orientation="horizontal" className="min-h-[440px] flex gap-0">
        <Panel defaultSize={50} minSize={25}>
          <PaneTable
            title={a.name}
            rows={a.rows.slice(0, COMPARE_PANE_ROW_LIMIT)}
            otherSymbols={symB}
            mode="a"
            scrollRef={leftRef}
            onScroll={onScrollLeft}
          />
        </Panel>
        <Separator className="w-2 bg-[var(--border)] hover:bg-[#3b82f6] transition-app mx-1 shrink-0" />
        <Panel defaultSize={50} minSize={25}>
          <PaneTable
            title={b.name}
            rows={b.rows.slice(0, COMPARE_PANE_ROW_LIMIT)}
            otherSymbols={symA}
            mode="b"
            scrollRef={rightRef}
            onScroll={onScrollRight}
          />
        </Panel>
      </Group>
    </div>
  );
}
