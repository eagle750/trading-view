"use client";

import { FilterGrid } from "@/components/screener/filter-grid";
import { StrategyUploadZone } from "@/components/screener/strategy-upload";
import { SignalsTable } from "@/components/screener/signals-table";
import { CompareView } from "@/components/screener/compare-view";
import { Button } from "@/components/ui/button";
import { formatScreenerApiError } from "@/lib/format-api-error";
import { useMarketStore } from "@/stores/market-store";
import { useScreenerStore } from "@/stores/screener-store";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export default function ScreenerPage() {
  const {
    strategies,
    signals,
    signalsByStrategy,
    setSignals,
    setSignalsByStrategy,
    loading,
    setLoading,
    resetFilters,
    lastRunStrategyIds,
    setLastRunStrategyIds,
  } = useScreenerStore();

  const [runError, setRunError] = useState<string | null>(null);
  const [runErrorDetail, setRunErrorDetail] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const feedbackClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showActionFeedback = useCallback(
    (kind: "success" | "error", message: string) => {
      if (feedbackClearRef.current) {
        clearTimeout(feedbackClearRef.current);
      }
      setActionFeedback({ kind, message });
      feedbackClearRef.current = setTimeout(() => {
        setActionFeedback(null);
        feedbackClearRef.current = null;
      }, 5000);
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (feedbackClearRef.current) clearTimeout(feedbackClearRef.current);
    };
  }, []);

  const run = useCallback(async () => {
    setRunError(null);
    setRunErrorDetail(null);
    setLoading(true);
    try {
      const { filters, strategies: strat } = useScreenerStore.getState();
      const { market } = useMarketStore.getState();
      const activeIds = strat
        .filter((s) => s.useForSignals)
        .map((s) => s.id);
      const res = await fetch("/api/screener/run", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filters,
          market,
          strategyIds: activeIds,
        }),
      });

      const text = await res.text();
      let json: unknown = null;
      let parseErr: string | undefined;
      if (text) {
        try {
          json = JSON.parse(text) as unknown;
        } catch {
          parseErr = "Response was not valid JSON.";
        }
      }

      if (!res.ok) {
        setRunError(
          formatScreenerApiError(json, {
            httpStatus: res.status,
            fallbackText: parseErr ?? `Empty body (HTTP ${res.status}).`,
          }),
        );
        setRunErrorDetail(text ? text.slice(0, 4000) : "(no body)");
        setSignals(null);
        setSignalsByStrategy(null);
        setLastRunStrategyIds(null);
        return;
      }

      if (parseErr || !json || typeof json !== "object") {
        setRunError(
          formatScreenerApiError(json, {
            httpStatus: res.status,
            fallbackText:
              parseErr ?? "Empty or invalid JSON from server (HTTP 200).",
          }),
        );
        setRunErrorDetail(text ? text.slice(0, 4000) : null);
        setSignals(null);
        setSignalsByStrategy(null);
        setLastRunStrategyIds(null);
        return;
      }

      const body = json as {
        mode?: string;
        data?: unknown;
      };

      if (body.mode === "compare" && body.data && typeof body.data === "object") {
        setSignals(null);
        setSignalsByStrategy(
          body.data as Record<string, import("@/lib/schemas").SignalRow[]>,
        );
        setLastRunStrategyIds(activeIds);
        return;
      }

      if (body.mode === "single" && body.data && typeof body.data === "object") {
        const d = body.data as { signals?: import("@/lib/schemas").SignalRow[] };
        setSignalsByStrategy(null);
        if (Array.isArray(d.signals)) {
          setSignals(d.signals);
          setLastRunStrategyIds(activeIds);
        } else {
          setRunError(
            "Response missing `data.signals` array. · HTTP " + String(res.status),
          );
          setRunErrorDetail(text ? text.slice(0, 4000) : null);
          setSignals(null);
          setLastRunStrategyIds(null);
        }
        return;
      }

      setRunError(
        `Unexpected response (no mode/data). · HTTP ${res.status} · ${JSON.stringify(
          Object.keys(body),
        )}`,
      );
      setRunErrorDetail(text ? text.slice(0, 4000) : null);
      setSignals(null);
      setSignalsByStrategy(null);
      setLastRunStrategyIds(null);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Network error — check your connection.";
      setRunError(`${msg} · If you opened the app as a file:// URL, use http://localhost instead.`);
      setRunErrorDetail(e instanceof Error ? e.stack ?? msg : String(e));
      setSignals(null);
      setSignalsByStrategy(null);
      setLastRunStrategyIds(null);
    } finally {
      setLoading(false);
    }
  }, [setSignals, setSignalsByStrategy, setLoading, setLastRunStrategyIds]);

  const runAfterStrategyUpload = useCallback(() => {
    void run();
  }, [run]);

  const saveScreener = useCallback(() => {
    const { filters } = useScreenerStore.getState();
    const savedAt = new Date().toISOString();
    const payload = { filters, savedAt };
    try {
      localStorage.setItem("trade-screener-preset", JSON.stringify(payload));
      const time = new Date(savedAt).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      showActionFeedback(
        "success",
        `Screener saved to this browser at ${time}.`,
      );
    } catch {
      showActionFeedback(
        "error",
        "Could not save — browser storage may be disabled, full, or blocked. Allow site data and try again.",
      );
    }
  }, [showActionFeedback]);

  const lastRunSummary = useMemo(() => {
    if (lastRunStrategyIds === null) return null;
    if (lastRunStrategyIds.length === 0) {
      return "Last run used filters only (no strategy was enabled for signals).";
    }
    const labels = lastRunStrategyIds.map((id) => {
      const c = strategies.find((x) => x.id === id);
      return c?.filename ?? id.slice(0, 40);
    });
    return `Last run applied strategy file(s): ${labels.join(" · ")}`;
  }, [lastRunStrategyIds, strategies]);

  const handleReset = useCallback(() => {
    resetFilters();
    setRunError(null);
    setRunErrorDetail(null);
    showActionFeedback(
      "success",
      "Filters reset to defaults (all criteria set to NA unless noted). Run again to refresh signals.",
    );
  }, [resetFilters, showActionFeedback]);

  const compareMode =
    signalsByStrategy !== null &&
    Object.keys(signalsByStrategy).length >= 2;

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 space-y-10">
      <div>
        <h1 className="text-lg font-medium text-[var(--foreground)] tracking-tight">
          Screener Builder
        </h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          <strong className="text-[var(--foreground)] font-medium">Run</strong>{" "}
          applies your filters to the seed universe. Turn{" "}
          <strong className="text-[var(--foreground)] font-medium">
            Use for signals
          </strong>{" "}
          on for an uploaded strategy to include it in the run (one strategy:
          signals are adjusted for that id; two or more: compare panes). Use{" "}
          <strong className="text-[var(--foreground)]">NA</strong> on any filter
          row you do not want to apply.
        </p>
      </div>

      <FilterGrid />

      <div className="border-t border-[var(--border)] pt-6 space-y-3">
        <div className="flex flex-wrap gap-2 justify-end items-center">
          <Button type="button" variant="ghost" onClick={saveScreener}>
            Save as Screener
          </Button>
          <Button type="button" variant="ghost" onClick={handleReset}>
            Reset
          </Button>
          <Button type="button" variant="primary" onClick={run} disabled={loading}>
            {loading ? "Running…" : "Run"}
          </Button>
        </div>

        {runError ? (
          <div
            role="alert"
            className="rounded-sm border border-[#ef4444]/50 bg-[#2a1515] px-4 py-3 text-sm text-[#fecaca]"
          >
            <div className="font-medium text-[#fca5a5] mb-1">Run failed</div>
            <p className="text-[#fecaca]/95 leading-relaxed whitespace-pre-wrap break-words">
              {runError}
            </p>
            {runErrorDetail ? (
              <details className="mt-3 text-xs text-[#fecaca]/80 border-t border-[#ef4444]/30 pt-2">
                <summary className="cursor-pointer text-[#fca5a5] select-none">
                  Technical details
                </summary>
                <pre className="mt-2 overflow-x-auto p-2 rounded-sm bg-[#1a0a0a] text-[#fecaca]/90 font-[family-name:var(--font-jetbrains)] text-[11px] leading-relaxed max-h-48 overflow-y-auto">
                  {runErrorDetail}
                </pre>
              </details>
            ) : null}
          </div>
        ) : null}

        {actionFeedback ? (
          <div
            role="status"
            aria-live="polite"
            className={
              actionFeedback.kind === "success"
                ? "rounded-sm border border-[#22c55e]/40 bg-[#14231a] px-4 py-2.5 text-sm text-[#bbf7d0]"
                : "rounded-sm border border-[#ef4444]/50 bg-[#2a1515] px-4 py-2.5 text-sm text-[#fecaca]"
            }
          >
            <span className="font-medium text-[var(--foreground)]">
              {actionFeedback.kind === "success" ? "Done. " : "Problem. "}
            </span>
            <span className="text-[var(--foreground)]/90">{actionFeedback.message}</span>
          </div>
        ) : null}
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-[var(--foreground)]">
          Strategy documents
        </h2>
        <StrategyUploadZone onAfterSuccessfulUpload={runAfterStrategyUpload} />
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <h2 className="text-sm font-medium text-[var(--foreground)]">
            Signals
          </h2>
          {lastRunSummary ? (
            <p className="text-xs text-[var(--muted)] max-w-2xl text-right">
              {lastRunSummary}
            </p>
          ) : null}
        </div>
        {loading ? (
          <div className="text-sm text-[var(--muted)]">Loading signals…</div>
        ) : compareMode && signalsByStrategy ? (
          <CompareView signalsByStrategy={signalsByStrategy} />
        ) : signals?.length ? (
          <SignalsTable data={signals} />
        ) : (
          <p className="text-sm text-[var(--muted)]">
            {runError
              ? "Fix the issue above, then Run again."
              : "Click Run to apply your filters and load signals (demo data, no live API)."}
          </p>
        )}
      </section>
    </div>
  );
}
