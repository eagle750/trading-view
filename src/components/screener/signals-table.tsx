"use client";

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnSizingState,
  type Row,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { useEffect, useMemo, useState, type KeyboardEvent, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SignalRow } from "@/lib/schemas";
import {
  openSignalsFullViewTab,
  stashSignalsForFullView,
} from "@/lib/signals-full-view-session";
import { buildSignalColumns } from "@/components/screener/signal-table-columns";
import { cn } from "@/lib/utils";

/** Maximize / open in new window — high-contrast icon */
function ExpandFullIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M9 3H5a2 2 0 0 0-2 2v4M21 9V5a2 2 0 0 0-2-2h-4M15 21h4a2 2 0 0 0 2-2v-4M3 15v4a2 2 0 0 0 2 2h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function fuzzyFilter(row: Row<SignalRow>, _columnId: string, filterValue: unknown) {
  const q = String(filterValue ?? "").toLowerCase().trim();
  if (!q) return true;
  const r = row.original;
  const hay = [
    r.symbol,
    r.company,
    r.sector,
    r.triggeredRule,
    r.signal,
    String(r.score),
  ]
    .join(" ")
    .toLowerCase();
  if (hay.includes(q)) return true;
  const qn = q.replace(/\s/g, "");
  if (qn.length >= 2) {
    let qi = 0;
    for (let i = 0; i < hay.length && qi < qn.length; i++) {
      if (hay[i] === qn[qi]) qi++;
    }
    return qi === qn.length;
  }
  return false;
}

function exportSignalsCsv(rows: SignalRow[], includeFundamentals: boolean) {
  const headers = includeFundamentals
    ? [
        "symbol",
        "company",
        "ltp",
        "pctChg",
        "mktCapCr",
        "pe",
        "roe",
        "signal",
        "score",
        "sector",
        "triggeredRule",
        "debtToEquity",
        "promoterHoldingPct",
        "fiiDiiHoldingPct",
        "salesGrowth1yPct",
        "netProfitGrowth1yPct",
        "last2QtrRevProfitGrowthPct",
      ]
    : [
        "symbol",
        "company",
        "ltp",
        "pctChg",
        "mktCapCr",
        "pe",
        "roe",
        "signal",
        "score",
        "sector",
        "triggeredRule",
      ];

  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const v = r[h as keyof SignalRow];
          if (v === undefined || v === null) return "";
          if (typeof v === "string") return esc(v);
          return String(v);
        })
        .join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = includeFundamentals ? "signals-full.csv" : "signals.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

export type SignalsTableProps = {
  data: SignalRow[];
  /** Paginate (default true). Set false to show all rows in one scroll (no Prev/Next). */
  paginated?: boolean;
  /** Rows per page when paginated. Default 10 (screener); use 15–25 on full /signals page. */
  pageSize?: number;
  /** Extra fundamental columns (demo fields). Default false on builder; true on full tab. */
  includeFundamentals?: boolean;
  /** Show “open full view” control (only when paginated). Default true. */
  showExpandFullTab?: boolean;
  /** Override max height / overflow for the table shell (e.g. full-page view). */
  tableScrollClassName?: string;
};

export function SignalsTable({
  data,
  paginated = true,
  pageSize: pageSizeProp = 10,
  includeFundamentals = false,
  showExpandFullTab = true,
  tableScrollClassName,
}: SignalsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "score", desc: true },
  ]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: pageSizeProp,
  });

  useEffect(() => {
    setPagination((p) => ({ ...p, pageSize: pageSizeProp, pageIndex: 0 }));
  }, [pageSizeProp]);

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
    setSorting([{ id: "score", desc: true }]);
  }, [data]);

  const columns = useMemo(
    () => buildSignalColumns(includeFundamentals),
    [includeFundamentals],
  );

  const scrollWrapClass =
    tableScrollClassName ??
    "max-h-[min(70vh,900px)] min-h-[120px] overflow-x-auto overflow-y-auto overscroll-contain";

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table API
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
      columnVisibility,
      columnSizing,
      ...(paginated ? { pagination } : {}),
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    defaultColumn: {
      minSize: 48,
      maxSize: 800,
      size: 120,
    },
    ...(paginated ? { onPaginationChange: setPagination } : {}),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(paginated
      ? {
          getPaginationRowModel: getPaginationRowModel(),
        }
      : {}),
    globalFilterFn: fuzzyFilter,
  });

  const allCols = table.getAllLeafColumns().filter((c) => c.getCanHide());

  const openFullPage = () => {
    try {
      stashSignalsForFullView(data);
      openSignalsFullViewTab();
    } catch {
      window.alert(
        "Could not save signals for the new tab. Allow site data / local storage for this site and try again.",
      );
    }
  };

  const visibleColCount = table.getVisibleLeafColumns().length;

  const pageCount = paginated ? table.getPageCount() : 1;
  const filteredTotal = table.getFilteredRowModel().rows.length;
  const size = paginated ? pagination.pageSize : pageSizeProp;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <Input
          placeholder="Search symbols, company, sector…"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-[var(--muted)]">Columns</span>
          {allCols.map((col) => (
            <label key={col.id} className="flex items-center gap-1 text-xs text-[var(--muted)]">
              <input
                type="checkbox"
                checked={col.getIsVisible()}
                onChange={col.getToggleVisibilityHandler()}
              />
              {col.id}
            </label>
          ))}
          <Button
            type="button"
            variant="ghost"
            onClick={() => exportSignalsCsv(data, includeFundamentals)}
          >
            Export CSV
          </Button>
        </div>
      </div>
      <div
        className={`rounded-sm border border-[var(--border)] ${scrollWrapClass}`}
      >
        <table
          className="text-sm text-left border-collapse"
          style={{
            width: table.getTotalSize(),
            minWidth: "100%",
            tableLayout: "fixed",
          }}
        >
          <thead className="sticky top-0 z-10 bg-[var(--surface)] border-b border-[var(--border)]">
            {paginated && showExpandFullTab ? (
              <tr className="border-b border-[var(--border)]">
                <th
                  colSpan={Math.max(visibleColCount, 1)}
                  className="px-2 py-1.5 text-right bg-[var(--surface)]"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openFullPage();
                    }}
                    className="inline-flex items-center justify-center rounded-sm border border-[var(--border)] p-1.5 text-[#93c5fd] hover:border-[#3b82f6] hover:bg-[#1e3a5f]/40 transition-app"
                    title="Open full table in new tab (all rows + extra columns)"
                    aria-label="Open full table in new tab"
                  >
                    <ExpandFullIcon className="w-[18px] h-[18px]" />
                  </button>
                </th>
              </tr>
            ) : null}
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => {
                  const sorted = h.column.getIsSorted();
                  return (
                    <th
                      key={h.id}
                      colSpan={h.colSpan}
                      style={{ width: h.getSize(), minWidth: h.getSize() }}
                      className="relative px-0 py-0 font-medium text-[var(--muted)] select-none border-r border-[var(--border)]/60 last:border-r-0"
                    >
                      <div className="flex items-stretch min-h-[2.75rem]">
                        <div
                          className={cn(
                            "flex-1 min-w-0 text-left px-3 py-3 hover:text-[var(--foreground)] transition-app outline-none",
                            h.column.getCanSort() ? "cursor-pointer" : "cursor-default",
                          )}
                          tabIndex={h.column.getCanSort() ? 0 : undefined}
                          onClick={(e) => {
                            if (
                              (e.target as HTMLElement).closest("[data-no-sort-toggle]")
                            ) {
                              return;
                            }
                            const fn = h.column.getToggleSortingHandler();
                            if (fn) fn(e);
                          }}
                          onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
                            if (!h.column.getCanSort()) return;
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              const fn = h.column.getToggleSortingHandler();
                              if (fn) fn(e as unknown as MouseEvent<HTMLDivElement>);
                            }
                          }}
                        >
                          <span className="inline-flex flex-wrap items-center gap-1 whitespace-normal break-words">
                            {flexRender(h.column.columnDef.header, h.getContext())}
                            {sorted === "asc" ? " ↑" : sorted === "desc" ? " ↓" : ""}
                          </span>
                        </div>
                        {h.column.getCanResize() ? (
                          <div
                            role="separator"
                            aria-orientation="vertical"
                            aria-label={`Resize ${h.column.id} column`}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              h.getResizeHandler()(e);
                            }}
                            onTouchStart={(e) => {
                              e.stopPropagation();
                              h.getResizeHandler()(e);
                            }}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              h.column.resetSize();
                            }}
                            className={cn(
                              "shrink-0 w-1.5 cursor-col-resize touch-none select-none",
                              "hover:bg-[#3b82f6]/35 active:bg-[#3b82f6]/55",
                              h.column.getIsResizing() && "bg-[#3b82f6]/45",
                            )}
                          />
                        ) : null}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-[var(--border)] hover:bg-[#1a1a1c] transition-app"
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    style={{ width: cell.column.getSize(), minWidth: cell.column.getSize() }}
                    className="px-3 py-3 align-top text-[var(--foreground)] border-r border-[var(--border)]/40 last:border-r-0 overflow-hidden break-words"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {paginated ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-[var(--muted)]">
          <span>
            Page {table.getState().pagination.pageIndex + 1} of {pageCount} ·
            Showing {table.getRowModel().rows.length} of {filteredTotal}{" "}
            {globalFilter.trim() ? "(after search)" : "rows"}
          </span>
          {pageCount > 1 ? (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.previousPage()}
              >
                Prev
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={!table.getCanNextPage()}
                onClick={() => table.nextPage()}
              >
                Next
              </Button>
            </div>
          ) : (
            <span className="text-[var(--foreground)]/80">
              Single page — {filteredTotal} row{filteredTotal === 1 ? "" : "s"} (≤
              {size} per page). Prev/Next when results exceed {size} or after
              search narrows to more pages.
            </span>
          )}
        </div>
      ) : (
        <p className="text-xs text-[var(--muted)]">
          {table.getFilteredRowModel().rows.length} row
          {table.getFilteredRowModel().rows.length === 1 ? "" : "s"} (all shown)
        </p>
      )}
    </div>
  );
}
