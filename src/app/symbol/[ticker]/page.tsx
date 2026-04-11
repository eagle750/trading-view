import Link from "next/link";
import { fetchYahooQuote } from "@/lib/market/yahoo-nse";
import { SEED_SIGNALS, sortSignalsByScoreDesc } from "@/lib/seed/signals";
import { SymbolChartSection } from "@/app/symbol/[ticker]/symbol-chart-section";

export default async function SymbolPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker: raw } = await params;
  const ticker = decodeURIComponent(raw);
  const row = SEED_SIGNALS.find(
    (s) => s.symbol.toUpperCase() === ticker.toUpperCase(),
  );
  const quote = await fetchYahooQuote(ticker);

  const company =
    quote?.longName ?? quote?.shortName ?? row?.company ?? "—";
  const sector = quote?.sector ?? row?.sector ?? "—";

  const ltp = quote?.regularMarketPrice ?? row?.ltp;
  const pctChg = quote?.regularMarketChangePercent ?? row?.pctChg;

  let mktCapDisplay: string;
  if (quote?.marketCap != null && quote.marketCap > 1e6) {
    const cr = quote.marketCap / 1e7;
    mktCapDisplay = `${Math.round(cr).toLocaleString("en-IN")}`;
  } else if (row) {
    mktCapDisplay = row.mktCapCr.toLocaleString("en-IN");
  } else {
    mktCapDisplay = "—";
  }

  const pctClass =
    pctChg != null && pctChg >= 0 ? "text-[#22c55e]" : "text-[#ef4444]";
  const pctStr =
    pctChg != null
      ? `${pctChg >= 0 ? "+" : ""}${pctChg.toFixed(2)}%`
      : "—";

  const instrumentChoices = sortSignalsByScoreDesc([...SEED_SIGNALS])
    .slice(0, 120)
    .map((r) => ({
      symbol: r.symbol,
      label: `${r.symbol} · ${r.sector}`,
    }));

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="text-xl font-medium font-[family-name:var(--font-jetbrains)] text-[var(--foreground)]">
              {ticker}
            </h1>
            <span className="text-sm text-[var(--muted)]">{company}</span>
          </div>
          {quote ? (
            <p className="text-[10px] text-[#22c55e]/90 mt-1">
              Live quote (Yahoo Finance) · LTP aligns with chart when data loads
            </p>
          ) : (
            <p className="text-[10px] text-[var(--muted)] mt-1">
              Demo row from bundled universe — quote API unavailable; chart may use
              synthetic fallback
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span>
              LTP{" "}
              <span className="font-[family-name:var(--font-jetbrains)] text-[var(--foreground)]">
                {ltp != null ? ltp.toFixed(2) : "—"}
              </span>
            </span>
            <span>
              % Chg <span className={pctClass}>{pctStr}</span>
            </span>
            <span>
              Mkt cap (Cr){" "}
              <span className="font-[family-name:var(--font-jetbrains)]">
                {mktCapDisplay}
              </span>
            </span>
            <span>Sector {sector}</span>
          </div>
        </div>
        <Link
          href="/"
          className="text-sm text-[#3b82f6] hover:underline transition-app"
        >
          Back to signals
        </Link>
      </div>

      <section>
        <h2 className="text-sm font-medium text-[var(--foreground)] mb-3">
          Chart workspace
        </h2>
        <SymbolChartSection
          key={ticker}
          primaryTicker={ticker}
          instrumentChoices={instrumentChoices}
        />
      </section>
    </div>
  );
}
