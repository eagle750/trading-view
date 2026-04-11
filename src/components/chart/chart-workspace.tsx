"use client";

import { useCallback, useEffect, useState } from "react";
import { CandleChart } from "@/components/chart/candle-chart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { OhlcBar } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const TIMEFRAMES = [
  "1D",
  "1W",
  "1M",
  "3M",
  "6M",
  "1Y",
  "2Y",
  "3Y",
  "5Y",
  "ALL",
] as const;

const CHECKBOXES: { id: string; label: string }[] = [
  { id: "volume", label: "Volume" },
  { id: "fib", label: "Fibonacci Retracement" },
  { id: "channel", label: "Channel" },
  { id: "triangle", label: "Triangle" },
  { id: "sr", label: "Support & Resistance" },
  { id: "bollinger", label: "Bollinger Bands" },
  { id: "rsi", label: "RSI" },
  { id: "macd", label: "MACD" },
  { id: "ema20", label: "EMA 20" },
  { id: "ema50", label: "EMA 50" },
  { id: "ema200", label: "EMA 200" },
];

type Tf = (typeof TIMEFRAMES)[number];

function useOhlc(ticker: string, tf: Tf) {
  const [bars, setBars] = useState<OhlcBar[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [source, setSource] = useState<"yahoo" | "synthetic" | null>(null);
  const [dataWarning, setDataWarning] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    setDataWarning(null);
    try {
      const res = await fetch(
        `/api/symbol/${encodeURIComponent(ticker)}/ohlc?timeframe=${tf}`,
      );
      const j = (await res.json()) as {
        bars?: OhlcBar[];
        error?: unknown;
        source?: string;
        warning?: string;
      };
      if (!res.ok) throw new Error(String(j.error ?? "Failed"));
      setBars((j.bars as OhlcBar[]) ?? []);
      setSource(
        j.source === "yahoo" || j.source === "synthetic" ? j.source : null,
      );
      setDataWarning(typeof j.warning === "string" ? j.warning : null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
      setBars([]);
      setSource(null);
    } finally {
      setLoading(false);
    }
  }, [ticker, tf]);

  return { bars, loading, err, source, dataWarning, load };
}

function Cell({
  ticker,
  initialTf,
}: {
  ticker: string;
  initialTf: Tf;
}) {
  const [tf, setTf] = useState<Tf>(initialTf);
  const { bars, loading, err, source, dataWarning, load } = useOhlc(ticker, tf);
  const [ov, setOv] = useState<Set<string>>(
    () => new Set(["ema20", "ema50"]),
  );
  const [nlChips, setNlChips] = useState<string[]>([]);
  const [nl, setNl] = useState("");

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (id: string) => {
    setOv((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const applyNl = async () => {
    if (!nl.trim()) return;
    const res = await fetch("/api/overlay/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: nl }),
    });
    const j = await res.json();
    const actions = j.actions as Array<{
      type: string;
      name?: string;
      value?: string;
      symbol?: string;
      tool?: string;
    }>;
    const chips: string[] = [];
    let nextTf: Tf | null = null;
    setOv((prev) => {
      const n = new Set(prev);
      for (const a of actions) {
        if (a.type === "add_indicator" && a.name) {
          const m = a.name.toLowerCase();
          if (m.includes("200")) n.add("ema200");
          else if (m.includes("50")) n.add("ema50");
          if (m.includes("20") && !m.includes("200")) n.add("ema20");
          if (m.includes("rsi")) n.add("rsi");
          if (m.includes("macd")) n.add("macd");
          if (m.includes("bollinger")) n.add("bollinger");
          chips.push(`+${a.name}`);
        }
        if (a.type === "remove_indicator" && a.name) {
          const m = a.name.toLowerCase();
          if (m.includes("200")) n.delete("ema200");
          else if (m.includes("50")) n.delete("ema50");
          if (m.includes("20") && !m.includes("200")) n.delete("ema20");
          if (m.includes("rsi")) n.delete("rsi");
          if (m.includes("macd")) n.delete("macd");
          if (m.includes("bollinger")) n.delete("bollinger");
          chips.push(`−${a.name}`);
        }
        if (a.type === "compare_symbol" && a.symbol) chips.push(`vs ${a.symbol}`);
        if (a.type === "timeframe" && a.value) {
          chips.push(`TF ${a.value}`);
          if (TIMEFRAMES.includes(a.value as Tf)) nextTf = a.value as Tf;
        }
        if (a.type === "drawing" && a.tool) chips.push(`draw ${a.tool}`);
      }
      return n;
    });
    if (nextTf) setTf(nextTf);
    setNlChips((c) => [...chips, ...c].slice(0, 12));
    setNl("");
  };

  return (
    <div className="flex flex-col gap-2 min-h-[320px] border border-[var(--border)] rounded-sm p-2 bg-[var(--surface)]">
      <div className="flex flex-wrap gap-1">
        {TIMEFRAMES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTf(t)}
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-sm border border-[var(--border)] transition-app",
              tf === t
                ? "bg-[#1e3a5f] border-[#3b82f6] text-[var(--foreground)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]",
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[var(--muted)] max-h-24 overflow-y-auto">
        {CHECKBOXES.map((c) => (
          <label key={c.id} className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={ov.has(c.id)}
              onChange={() => toggle(c.id)}
            />
            {c.label}
          </label>
        ))}
      </div>
      {source === "yahoo" ? (
        <p className="text-[10px] text-[#22c55e]/90 -mt-1 mb-1">
          Live OHLC (Yahoo Finance)
        </p>
      ) : source === "synthetic" && dataWarning ? (
        <p className="text-[10px] text-[#f59e0b]/95 -mt-1 mb-1 leading-snug">
          {dataWarning}
        </p>
      ) : null}
      {loading ? (
        <div className="text-xs text-[var(--muted)] py-8">Loading…</div>
      ) : err ? (
        <div className="text-xs text-[#ef4444]">{err}</div>
      ) : (
        <CandleChart bars={bars} overlays={ov} height={280} />
      )}
      {nlChips.length ? (
        <div className="flex flex-wrap gap-1">
          {nlChips.map((c, i) => (
            <button
              key={`${c}-${i}`}
              type="button"
              className="text-[10px] rounded-sm border border-[var(--border)] px-1.5 py-0.5 text-[var(--foreground)]"
              onClick={() =>
                setNlChips((prev) => prev.filter((_, j) => j !== i))
              }
            >
              {c} ×
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex gap-1 mt-auto">
        <Input
          className="text-xs h-8"
          placeholder='Type to overlay — e.g. "add 50 EMA and compare with NIFTY 50"'
          value={nl}
          onChange={(e) => setNl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applyNl()}
        />
        <Button type="button" variant="primary" className="h-8 text-xs px-2" onClick={applyNl}>
          Apply
        </Button>
      </div>
    </div>
  );
}

export function ChartWorkspace({ ticker }: { ticker: string }) {
  const [grid, setGrid] = useState(false);
  const [cells, setCells] = useState<
    { id: string; ticker: string; tf: (typeof TIMEFRAMES)[number] }[]
  >([
    { id: "1", ticker, tf: "1D" },
    { id: "2", ticker: "NIFTY", tf: "1W" },
    { id: "3", ticker, tf: "1M" },
    { id: "4", ticker: "BANKNIFTY", tf: "1D" },
  ]);

  const move = (from: number, to: number) => {
    setCells((prev) => {
      const n = [...prev];
      const [x] = n.splice(from, 1);
      n.splice(to, 0, x!);
      return n;
    });
  };

  if (!grid) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button type="button" variant="ghost" onClick={() => setGrid(true)}>
            Grid mode (2×2)
          </Button>
        </div>
        <Cell ticker={ticker} initialTf="1D" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" variant="ghost" onClick={() => setGrid(false)}>
          Single chart
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {cells.map((c, idx) => (
          <div
            key={c.id}
            className="relative"
            draggable
            onDragStart={(e) => e.dataTransfer.setData("idx", String(idx))}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const from = Number(e.dataTransfer.getData("idx"));
              if (!Number.isNaN(from)) move(from, idx);
            }}
          >
            <Cell ticker={c.ticker} initialTf={c.tf} />
          </div>
        ))}
      </div>
      <p className="text-[10px] text-[var(--muted)]">
        Drag a panel by its frame to swap order (demo). Edit tickers in code or
        extend with inputs.
      </p>
    </div>
  );
}
