import { NextResponse } from "next/server";
import { z } from "zod";
import { overlayParseResponseSchema } from "@/lib/schemas";

const bodySchema = z.object({ text: z.string().min(1) });

/** Mock NL → structured overlay actions (replace with real LLM) */
export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const t = parsed.data.text.toLowerCase();
  const actions: Array<{
    type: "add_indicator" | "remove_indicator" | "compare_symbol" | "timeframe" | "drawing";
    name?: string;
    symbol?: string;
    value?: string;
    tool?: string;
  }> = [];

  if (t.includes("ema") || t.includes("50")) {
    actions.push({ type: "add_indicator", name: "EMA 50" });
  }
  if (t.includes("200")) {
    actions.push({ type: "add_indicator", name: "EMA 200" });
  }
  if (t.includes("nifty")) {
    actions.push({ type: "compare_symbol", symbol: "NIFTY 50" });
  }
  if (t.includes("rsi")) {
    actions.push({ type: "add_indicator", name: "RSI" });
  }
  if (t.includes("macd")) {
    actions.push({ type: "add_indicator", name: "MACD" });
  }
  if (t.includes("bollinger") || t.includes("bb")) {
    actions.push({ type: "add_indicator", name: "Bollinger Bands" });
  }
  if (t.includes("week") || t.includes("1w")) {
    actions.push({ type: "timeframe", value: "1W" });
  }
  if (t.includes("remove") && t.includes("ema")) {
    actions.push({ type: "remove_indicator", name: "EMA 50" });
  }
  if (t.includes("fibonacci") || t.includes("fib")) {
    actions.push({ type: "drawing", tool: "Fibonacci Retracement" });
  }
  if (t.includes("channel")) {
    actions.push({ type: "drawing", tool: "Channel" });
  }

  if (actions.length === 0) {
    actions.push({ type: "add_indicator", name: "EMA 20" });
  }

  const normalized = actions.map((a) => {
    if (a.type === "compare_symbol") {
      return { type: "compare_symbol" as const, symbol: a.symbol! };
    }
    if (a.type === "timeframe") {
      return { type: "timeframe" as const, value: a.value! };
    }
    if (a.type === "drawing") {
      return { type: "drawing" as const, tool: a.tool! };
    }
    if (a.type === "remove_indicator") {
      return { type: "remove_indicator" as const, name: a.name! };
    }
    return { type: "add_indicator" as const, name: a.name! };
  });

  const res = overlayParseResponseSchema.parse({ actions: normalized });
  return NextResponse.json(res);
}
