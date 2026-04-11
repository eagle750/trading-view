import { NextResponse } from "next/server";
import { z } from "zod";
import {
  mergeScreenerFiltersFromRequest,
  normalizeMarket,
  normalizeStrategyIds,
} from "@/lib/merge-screener-filters";
import { screenerFiltersSchema } from "@/lib/schemas";
import { applyScreenerFilters } from "@/lib/seed/apply-screener-filters";
import {
  SEED_SIGNALS,
  signalsForStrategy,
  sortSignalsByScoreDesc,
} from "@/lib/seed/signals";
import { cacheGet, cacheSet } from "@/lib/cache";

const bodySchema = z.object({
  filters: screenerFiltersSchema,
  market: z.enum(["IN", "US"]).optional(),
  strategyIds: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body.", details: { formErrors: ["Could not parse JSON"] } },
      { status: 400 },
    );
  }

  const mergedFilters = mergeScreenerFiltersFromRequest(
    raw && typeof raw === "object" && raw !== null && "filters" in raw
      ? (raw as { filters?: unknown }).filters
      : undefined,
  );

  const parsed = bodySchema.safeParse({
    filters: mergedFilters,
    market: normalizeMarket(
      raw && typeof raw === "object" && raw !== null && "market" in raw
        ? (raw as { market?: unknown }).market
        : undefined,
    ),
    strategyIds: normalizeStrategyIds(
      raw && typeof raw === "object" && raw !== null && "strategyIds" in raw
        ? (raw as { strategyIds?: unknown }).strategyIds
        : undefined,
    ),
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid screener parameters.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const { filters, strategyIds = [] } = parsed.data;
    const cacheKey = `screener:${JSON.stringify(filters)}:${strategyIds.join(",")}`;
    const hit = cacheGet<{ mode: "single" | "compare"; data: unknown }>(cacheKey);
    if (hit) {
      return NextResponse.json(hit);
    }

    const filtered = applyScreenerFilters(filters, [...SEED_SIGNALS]);
    const universe = filtered.length > 0 ? filtered : [...SEED_SIGNALS];

    if (strategyIds.length >= 2) {
      const byStrategy: Record<string, typeof SEED_SIGNALS> = {};
      strategyIds.forEach((sid, idx) => {
        byStrategy[sid] = signalsForStrategy(sid + idx, universe);
      });
      const payload = { mode: "compare" as const, data: byStrategy };
      cacheSet(cacheKey, payload, 30_000);
      return NextResponse.json(payload);
    }

    if (strategyIds.length === 1) {
      const payload = {
        mode: "single" as const,
        data: { signals: signalsForStrategy(strategyIds[0], universe) },
      };
      cacheSet(cacheKey, payload, 30_000);
      return NextResponse.json(payload);
    }

    const payload = {
      mode: "single" as const,
      data: { signals: sortSignalsByScoreDesc(universe) },
    };
    cacheSet(cacheKey, payload, 30_000);
    return NextResponse.json(payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Screener run failed on the server.",
        details: { formErrors: [msg] },
      },
      { status: 500 },
    );
  }
}
