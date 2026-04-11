import { NextResponse } from "next/server";
import { z } from "zod";
import {
  INDICES_BROAD,
  INDICES_SECTORAL,
  INDICES_THEMATIC,
} from "@/lib/seed/indices";
import { cacheGet, cacheSet } from "@/lib/cache";

const catSchema = z.enum(["broad", "sectoral", "thematic"]);

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ category: string }> },
) {
  const { category } = await ctx.params;
  const c = catSchema.safeParse(category);
  if (!c.success) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  const key = `indices:${c.data}`;
  const hit = cacheGet<unknown>(key);
  if (hit) {
    return NextResponse.json(hit);
  }

  const list =
    c.data === "broad"
      ? INDICES_BROAD
      : c.data === "sectoral"
        ? INDICES_SECTORAL
        : INDICES_THEMATIC;
  const payload = { category: c.data, indices: list };
  cacheSet(key, payload, 30_000);
  return NextResponse.json(payload);
}
