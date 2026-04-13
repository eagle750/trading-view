"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { SignalRow } from "@/lib/schemas";
import { symbolHrefFromRow } from "@/lib/signal-row-link";
import { ScoreColumnHeader } from "@/components/screener/score-column-header";
import { cn } from "@/lib/utils";

const sz = (size: number, min = 48, max = 640) => ({ size, minSize: min, maxSize: max });

export const signalTableBaseColumns: ColumnDef<SignalRow>[] = [
  {
    accessorKey: "symbol",
    ...sz(88, 56, 200),
    header: "Symbol",
    cell: (c) => {
      const sym = c.getValue() as string;
      const row = c.row.original;
      return (
        <Link
          href={symbolHrefFromRow(row)}
          target="_blank"
          rel="noopener noreferrer"
          className="font-[family-name:var(--font-jetbrains)] text-[#3b82f6] hover:underline"
        >
          {sym}
        </Link>
      );
    },
  },
  { accessorKey: "company", ...sz(200, 100, 480), header: "Company" },
  {
    accessorKey: "ltp",
    ...sz(88, 64, 160),
    header: "LTP",
    cell: (c) => (
      <span className="font-[family-name:var(--font-jetbrains)] tabular-nums">
        {(c.getValue() as number).toFixed(2)}
      </span>
    ),
  },
  {
    accessorKey: "pctChg",
    ...sz(92, 72, 160),
    header: "% Chg",
    cell: (c) => {
      const v = c.getValue() as number;
      return (
        <span
          className={cn(
            "font-[family-name:var(--font-jetbrains)] tabular-nums",
            v >= 0 ? "text-[#22c55e]" : "text-[#ef4444]",
          )}
        >
          {v >= 0 ? "+" : ""}
          {v.toFixed(2)}%
        </span>
      );
    },
  },
  {
    accessorKey: "mktCapCr",
    ...sz(120, 88, 220),
    header: "Mkt Cap (Cr)",
    cell: (c) => (
      <span className="font-[family-name:var(--font-jetbrains)] tabular-nums">
        {(c.getValue() as number).toLocaleString("en-IN")}
      </span>
    ),
  },
  {
    accessorKey: "pe",
    ...sz(72, 56, 140),
    header: "P/E",
    cell: (c) => {
      const v = c.getValue() as number | null;
      return (
        <span className="font-[family-name:var(--font-jetbrains)] tabular-nums">
          {v == null ? "—" : v.toFixed(1)}
        </span>
      );
    },
  },
  {
    accessorKey: "roe",
    ...sz(72, 56, 140),
    header: "RoE",
    cell: (c) => {
      const v = c.getValue() as number | null;
      return (
        <span className="font-[family-name:var(--font-jetbrains)] tabular-nums">
          {v == null ? "—" : `${v.toFixed(1)}%`}
        </span>
      );
    },
  },
  {
    accessorKey: "signal",
    ...sz(88, 64, 160),
    header: "Signal",
    cell: (c) => {
      const s = c.getValue() as string;
      return (
        <span
          className={cn(
            "font-[family-name:var(--font-jetbrains)] text-xs",
            s === "BUY" && "text-[#22c55e]",
            s === "SELL" && "text-[#ef4444]",
            s === "HOLD" && "text-[var(--muted)]",
          )}
        >
          {s}
        </span>
      );
    },
  },
  {
    accessorKey: "score",
    ...sz(88, 64, 160),
    header: () => <ScoreColumnHeader />,
    cell: (c) => (
      <span className="font-[family-name:var(--font-jetbrains)] tabular-nums">
        {c.getValue() as number}
      </span>
    ),
  },
  { accessorKey: "sector", ...sz(140, 80, 320), header: "Sector" },
  {
    accessorKey: "triggeredRule",
    ...sz(280, 120, 920),
    header: "Triggered Rule",
  },
];

function fmtOpt(n: number | undefined): string {
  if (n === undefined) return "—";
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export const signalTableFundamentalColumns: ColumnDef<SignalRow>[] = [
  {
    id: "debtToEquity",
    ...sz(100, 72, 200),
    accessorFn: (r) => r.debtToEquity,
    header: "Debt / Eq",
    cell: (c) => (
      <span className="font-[family-name:var(--font-jetbrains)] tabular-nums text-xs">
        {fmtOpt(c.row.original.debtToEquity)}
      </span>
    ),
  },
  {
    id: "promoterHoldingPct",
    ...sz(110, 80, 200),
    accessorFn: (r) => r.promoterHoldingPct,
    header: "Promoter %",
    cell: (c) => (
      <span className="font-[family-name:var(--font-jetbrains)] tabular-nums text-xs">
        {fmtOpt(c.row.original.promoterHoldingPct)}
      </span>
    ),
  },
  {
    id: "fiiDiiHoldingPct",
    ...sz(100, 72, 200),
    accessorFn: (r) => r.fiiDiiHoldingPct,
    header: "FII/DII %",
    cell: (c) => (
      <span className="font-[family-name:var(--font-jetbrains)] tabular-nums text-xs">
        {fmtOpt(c.row.original.fiiDiiHoldingPct)}
      </span>
    ),
  },
  {
    id: "salesGrowth1yPct",
    ...sz(120, 88, 220),
    accessorFn: (r) => r.salesGrowth1yPct,
    header: "Sales gr 1Y %",
    cell: (c) => (
      <span className="font-[family-name:var(--font-jetbrains)] tabular-nums text-xs">
        {fmtOpt(c.row.original.salesGrowth1yPct)}
      </span>
    ),
  },
  {
    id: "netProfitGrowth1yPct",
    ...sz(120, 88, 220),
    accessorFn: (r) => r.netProfitGrowth1yPct,
    header: "Profit gr 1Y %",
    cell: (c) => (
      <span className="font-[family-name:var(--font-jetbrains)] tabular-nums text-xs">
        {fmtOpt(c.row.original.netProfitGrowth1yPct)}
      </span>
    ),
  },
  {
    id: "last2QtrRevProfitGrowthPct",
    ...sz(110, 80, 220),
    accessorFn: (r) => r.last2QtrRevProfitGrowthPct,
    header: "Last 2Q gr %",
    cell: (c) => (
      <span className="font-[family-name:var(--font-jetbrains)] tabular-nums text-xs">
        {fmtOpt(c.row.original.last2QtrRevProfitGrowthPct)}
      </span>
    ),
  },
];

export function buildSignalColumns(includeFundamentals: boolean): ColumnDef<SignalRow>[] {
  if (!includeFundamentals) return signalTableBaseColumns;
  return [...signalTableBaseColumns, ...signalTableFundamentalColumns];
}
