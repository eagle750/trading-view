"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { z } from "zod";
import { SignalsTable } from "@/components/screener/signals-table";
import { readStashedSignalsForFullView } from "@/lib/signals-full-view-session";
import type { SignalRow } from "@/lib/schemas";
import { signalRowSchema } from "@/lib/schemas";

const payloadSchema = z.object({
  at: z.number(),
  signals: z.array(signalRowSchema),
});

/** Rows per page on this full-view tab (builder uses 10). */
const FULL_VIEW_PAGE_SIZE = 30;

export default function SignalsFullPage() {
  const [rows, setRows] = useState<SignalRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const raw = readStashedSignalsForFullView();
        if (!raw) {
          setErr(
            "No saved signals. On Screener Builder, click Run, then click the expand icon in the top-right of the signals table to open this page.",
          );
          return;
        }
        const parsed = payloadSchema.safeParse(JSON.parse(raw));
        if (!parsed.success) {
          setErr(
            "Saved data was invalid. Run the screener again, then click the table expand icon.",
          );
          return;
        }
        setRows(parsed.data.signals);
      } catch {
        setErr("Could not read signals. Close this tab and try Expand all again.");
      }
    });
  }, []);

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-6 space-y-4 min-h-[60vh]">
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <h1 className="text-lg font-medium text-[var(--foreground)]">
            All signals
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            Up to {FULL_VIEW_PAGE_SIZE} symbols per page — scroll the table, or use Prev / Next when
            there are more pages.
          </p>
        </div>
        <Link
          href="/"
          className="text-sm text-[#3b82f6] hover:underline transition-app"
        >
          Back to screener
        </Link>
      </div>

      {err ? (
        <div
          role="alert"
          className="rounded-sm border border-[#ef4444]/50 bg-[#2a1515] px-4 py-3 text-sm text-[#fecaca]"
        >
          {err}
        </div>
      ) : rows ? (
        <SignalsTable
          data={rows}
          paginated
          pageSize={FULL_VIEW_PAGE_SIZE}
          includeFundamentals
          showExpandFullTab={false}
          tableScrollClassName="max-h-[calc(100vh-11rem)] min-h-[200px] overflow-x-auto overflow-y-auto overscroll-contain"
        />
      ) : (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      )}
    </div>
  );
}
