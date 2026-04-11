import Link from "next/link";

export default function CompareStrategiesPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 space-y-6">
      <h1 className="text-lg font-medium text-[var(--foreground)]">
        Compare Strategies
      </h1>
      <p className="text-sm text-[var(--muted)] leading-relaxed">
        Upload two or more strategy documents on{" "}
        <Link href="/" className="text-[#3b82f6] hover:underline">
          Screener Builder
        </Link>
        , enable <strong className="text-[var(--foreground)]">Use for signals</strong>{" "}
        on at least two cards, then choose <strong className="text-[var(--foreground)]">Run</strong>.
        The signals section switches to compare mode with split panes, overlap
        highlighting, intersection panel, sync scroll, and conflict flags.
      </p>
      <Link
        href="/"
        className="inline-flex text-sm rounded-sm border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] transition-app hover:opacity-90"
      >
        Go to Screener Builder
      </Link>
    </div>
  );
}
