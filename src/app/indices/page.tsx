"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { IndexRow } from "@/lib/schemas";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Cat = "broad" | "sectoral" | "thematic";

export default function IndicesPage() {
  const [tab, setTab] = useState<Cat>("broad");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<IndexRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (cat: Cat) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/indices/${cat}`);
      const j = await res.json();
      setRows(j.indices ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      load(tab);
    });
  }, [tab, load]);

  const filtered = rows.filter(
    (r) =>
      !q.trim() ||
      r.name.toLowerCase().includes(q.toLowerCase()) ||
      r.description.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 space-y-6">
      <div>
        <h1 className="text-lg font-medium text-[var(--foreground)]">
          Market indices
        </h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          Searchable tables (demo quotes). Click an index to open its chart in a
          new tab.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-2">
        {(
          [
            ["broad", "Broad Market"],
            ["sectoral", "Sectoral"],
            ["thematic", "Thematic / Strategy"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "text-sm px-3 py-1.5 rounded-sm border transition-app",
              tab === id
                ? "border-[#3b82f6] bg-[#1e3a5f] text-[var(--foreground)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <Input
        placeholder="Search index name or description…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="max-w-md"
      />

      {loading ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface)] border-b border-[var(--border)] sticky top-0">
              <tr className="text-left text-[var(--muted)]">
                <th className="px-3 py-3 whitespace-nowrap">Index Name</th>
                <th className="px-3 py-3">Description</th>
                <th className="px-3 py-3">Source</th>
                <th className="px-3 py-3">LTP</th>
                <th className="px-3 py-3">% Chg</th>
                <th className="px-3 py-3">YTD</th>
                <th className="px-3 py-3 min-w-[120px]">Sparkline</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-[var(--border)] hover:bg-[#1a1a1c] transition-app"
                >
                  <td className="px-3 py-3">
                    <Link
                      href={`/symbol/${encodeURIComponent(r.id)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#3b82f6] hover:underline font-[family-name:var(--font-jetbrains)]"
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-[var(--muted)] max-w-xs">
                    {r.description}
                  </td>
                  <td className="px-3 py-3 font-[family-name:var(--font-jetbrains)] text-xs">
                    {r.source}
                  </td>
                  <td className="px-3 py-3 font-[family-name:var(--font-jetbrains)] tabular-nums">
                    {r.ltp.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-3 font-[family-name:var(--font-jetbrains)] tabular-nums",
                      r.pctChg >= 0 ? "text-[#22c55e]" : "text-[#ef4444]",
                    )}
                  >
                    {r.pctChg >= 0 ? "+" : ""}
                    {r.pctChg.toFixed(2)}%
                  </td>
                  <td
                    className={cn(
                      "px-3 py-3 font-[family-name:var(--font-jetbrains)] tabular-nums",
                      r.ytdPct >= 0 ? "text-[#22c55e]" : "text-[#ef4444]",
                    )}
                  >
                    {r.ytdPct >= 0 ? "+" : ""}
                    {r.ytdPct.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2">
                    <Sparkline values={r.sparkline} positive={r.pctChg >= 0} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Sparkline({
  values,
  positive,
}: {
  values: number[];
  positive: boolean;
}) {
  if (values.length < 2) return <span className="text-[var(--muted)]">—</span>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const w = 100;
  const h = 28;
  const pad = 2;
  const pts = values
    .map((v, i) => {
      const x =
        pad + (i / (values.length - 1)) * (w - 2 * pad);
      const y =
        h -
        pad -
        ((v - min) / (max - min || 1)) * (h - 2 * pad);
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} className="block">
      <polyline
        fill="none"
        stroke={positive ? "#22c55e" : "#ef4444"}
        strokeWidth="1"
        points={pts}
      />
    </svg>
  );
}
