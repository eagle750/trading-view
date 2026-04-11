"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { MARKETS, type MarketId } from "@/config/market.config";
import { useMarketStore } from "@/stores/market-store";
import { cn } from "@/lib/utils";

const navLink =
  "text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-app px-2 py-1";

export function AppHeader() {
  const { market, setMarket } = useMarketStore();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-8 min-w-0">
          <Link href="/" className="flex items-baseline gap-2 shrink-0">
            <span className="font-[family-name:var(--font-jetbrains)] text-sm font-semibold tracking-tight text-[var(--foreground)]">
              TS
            </span>
            <span className="text-sm text-[var(--foreground)] hidden sm:inline">
              TradeScreener
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/" className={cn(navLink, "text-[var(--foreground)]")}>
              Screener Builder
            </Link>
            <span className="text-[var(--muted)]">·</span>
            <a
              href="/indices"
              target="_blank"
              rel="noopener noreferrer"
              className={navLink}
            >
              Market Indices
            </a>
            <span className="text-[var(--muted)]">·</span>
            <Link href="/compare-strategies" className={navLink}>
              Compare Strategies
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              aria-label="Market"
              className="h-9 appearance-none rounded-sm border border-[var(--border)] bg-[var(--surface)] pl-2 pr-7 text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
              value={market}
              onChange={(e) => setMarket(e.target.value as MarketId)}
            >
              {(Object.keys(MARKETS) as MarketId[]).map((id) => {
                const m = MARKETS[id];
                return (
                  <option key={id} value={id} disabled={!m.enabled}>
                    {m.label}
                    {!m.enabled ? " (coming soon)" : ""}
                  </option>
                );
              })}
            </select>
          </div>
          {mounted ? (
            <button
              type="button"
              className="h-9 rounded-sm border border-[var(--border)] bg-[var(--surface)] px-2 text-xs text-[var(--foreground)] transition-app hover:opacity-90"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? "Light" : "Dark"}
            </button>
          ) : (
            <span className="h-9 w-14 rounded-sm border border-[var(--border)] bg-[var(--surface)]" />
          )}
          <button
            type="button"
            className="h-9 rounded-sm border border-[var(--border)] bg-[var(--surface)] px-3 text-xs text-[var(--muted)]"
          >
            Profile
          </button>
        </div>
      </div>
      <div className="md:hidden border-t border-[var(--border)] px-4 py-2 flex gap-3 text-xs">
        <Link href="/" className="text-[var(--foreground)]">
          Screener
        </Link>
        <a href="/indices" target="_blank" rel="noopener noreferrer" className="text-[var(--muted)]">
          Indices
        </a>
        <Link href="/compare-strategies" className="text-[var(--muted)]">
          Compare
        </Link>
      </div>
    </header>
  );
}
