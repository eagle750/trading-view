"use client";

import { useEffect, useRef, useState } from "react";

export function ScoreColumnHeader() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex items-center gap-1 whitespace-nowrap">
      <span>Score</span>
      <button
        type="button"
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border border-[var(--border)] text-[var(--muted)] hover:border-[#3b82f6] hover:text-[var(--foreground)] transition-app"
        aria-label="How score is calculated"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
        </svg>
      </button>
      {open ? (
        <div
          className="absolute left-0 top-full z-[100] mt-1 w-[min(22rem,calc(100vw-2rem))] rounded-sm border border-[var(--border)] bg-[var(--surface)] p-3 text-left text-[11px] leading-relaxed text-[var(--muted)] shadow-lg"
          role="tooltip"
        >
          <p className="font-medium text-[var(--foreground)] mb-1.5">Score (1–99)</p>
          <p className="mb-2">
            <span className="text-[var(--foreground)]">Filters only:</span> Demo rank from a
            deterministic hash of symbol, sector, and market cap in the bundled universe — not a
            live analyst rating.
          </p>
          <p>
            <span className="text-[var(--foreground)]">With strategy on:</span>{" "}
            <span className="font-[family-name:var(--font-jetbrains)] text-[10px] text-[#93c5fd]">
              round(35% × base score + 65% × strategy fit)
            </span>
            . <em>Fit</em> is 1–99 from a stable key (file name + size + content hash) plus
            symbol, sector, and market cap — same file should match across devices after
            re-upload. Signal bands: ≥67 BUY, ≥42 HOLD, otherwise SELL.
          </p>
        </div>
      ) : null}
    </div>
  );
}
