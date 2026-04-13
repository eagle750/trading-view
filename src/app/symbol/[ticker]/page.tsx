import Link from "next/link";
import { fetchYahooQuote } from "@/lib/market/yahoo-nse";
import { SEED_SIGNALS, sortSignalsByScoreDesc } from "@/lib/seed/signals";
import { SymbolChartSection } from "@/app/symbol/[ticker]/symbol-chart-section";

export default async function SymbolPage({
  params,
  searchParams,
}: {
  params: Promise<{ ticker: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { ticker: raw } = await params;
  const sp = await searchParams;
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

  const readParam = (k: string): string | undefined => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const fromScore = Number(readParam("score"));
  const fromFit = Number(readParam("fit"));
  const fromSignal = readParam("signal");
  const fromStrategy = readParam("strategy");
  const hasBreakdown =
    row != null &&
    Number.isFinite(fromFit) &&
    Number.isFinite(fromScore) &&
    typeof fromSignal === "string";
  const baseScore = row?.score ?? null;
  const blendedRaw =
    hasBreakdown && baseScore != null
      ? baseScore * 0.35 + fromFit * 0.65
      : null;
  const recomputedScore =
    blendedRaw != null ? Math.min(99, Math.max(1, Math.round(blendedRaw))) : null;

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
        {hasBreakdown ? (
          <div className="mb-4 rounded-sm border border-[var(--border)] bg-[var(--surface)] p-3">
            <div className="text-xs font-medium text-[var(--foreground)] mb-1">
              Score logic from selected screener row
            </div>
            <p className="text-[11px] text-[var(--muted)] leading-relaxed">
              Base score ({baseScore}) and strategy fit ({fromFit}) combine as{" "}
              <span className="font-[family-name:var(--font-jetbrains)] text-[var(--foreground)]">
                round(0.35 × {baseScore} + 0.65 × {fromFit})
              </span>{" "}
              = <span className="text-[var(--foreground)]">{recomputedScore}</span>.
              Clicked row score:{" "}
              <span className="text-[var(--foreground)]">{fromScore}</span> ({fromSignal}).
              {fromStrategy ? (
                <>
                  {" "}
                  Strategy key:{" "}
                  <span className="font-[family-name:var(--font-jetbrains)] text-[var(--foreground)]">
                    {fromStrategy}
                  </span>
                  .
                </>
              ) : null}
            </p>
            <div className="mt-2 border-t border-[var(--border)] pt-2 text-[11px] text-[var(--muted)] leading-relaxed">
              <div className="text-[var(--foreground)] mb-1">Number origin</div>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>
                  <span className="text-[var(--foreground)]">Base score ({baseScore})</span>: from
                  this symbol&apos;s seeded universe row before strategy re-ranking.
                </li>
                <li>
                  <span className="text-[var(--foreground)]">Strategy fit ({fromFit})</span>: parsed
                  from the clicked row&apos;s `triggeredRule` tag `[... · fit N]`, generated from the
                  strategy&apos;s parsed rule model applied to symbol fundamentals and return features.
                </li>
                <li>
                  <span className="text-[var(--foreground)]">0.35 / 0.65 weights</span>: fixed demo
                  blend in the score engine (`35% base + 65% fit`).
                </li>
                <li>
                  <span className="text-[var(--foreground)]">Final score ({recomputedScore})</span>:
                  rounded blended value and clamped to range 1–99.
                </li>
                <li>
                  <span className="text-[var(--foreground)]">Clicked row score ({fromScore})</span>:
                  score sent from the signals table link for this exact row.
                </li>
              </ul>
            </div>
          </div>
        ) : null}
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
