import type { SignalRow } from "@/lib/schemas";

/** Reads the last `[…]` segment appended by the screener run (strategy tag). */
export function parseLastBracketMeta(triggeredRule: string): {
  strategyLabel?: string;
  fit?: number;
  blendBase?: number;
  blendFit?: number;
} {
  let last: string | undefined;
  for (const m of triggeredRule.matchAll(/\[([^\]]*)\]/g)) {
    last = m[1];
  }
  if (!last) return {};

  const withBlend = last.match(/^(.+?) · fit (\d+) · blend (\d+)\/(\d+)/);
  if (withBlend) {
    return {
      strategyLabel: withBlend[1],
      fit: Number(withBlend[2]),
      blendBase: Number(withBlend[3]),
      blendFit: Number(withBlend[4]),
    };
  }

  const legacy = last.match(/^(.+?) · fit (\d+)(?: · .+)?$/);
  if (legacy) {
    return {
      strategyLabel: legacy[1],
      fit: Number(legacy[2]),
    };
  }

  return {};
}

export function symbolHrefFromRow(row: SignalRow): string {
  const q = new URLSearchParams();
  q.set("score", String(row.score));
  q.set("signal", row.signal);
  const parsed = parseLastBracketMeta(row.triggeredRule);
  if (typeof parsed.fit === "number" && Number.isFinite(parsed.fit)) {
    q.set("fit", String(parsed.fit));
  }
  if (parsed.strategyLabel) {
    q.set("strategy", parsed.strategyLabel);
  }
  if (
    typeof parsed.blendBase === "number" &&
    Number.isFinite(parsed.blendBase) &&
    typeof parsed.blendFit === "number" &&
    Number.isFinite(parsed.blendFit)
  ) {
    q.set("blendBase", String(parsed.blendBase));
    q.set("blendFit", String(parsed.blendFit));
  }
  return `/symbol/${encodeURIComponent(row.symbol)}?${q.toString()}`;
}
