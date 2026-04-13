import { NextResponse } from "next/server";
import { strategySummarySchema } from "@/lib/schemas";
import { cacheGet, cacheSet } from "@/lib/cache";
import {
  deriveRuleModelFromText,
  ruleModelSummary,
} from "@/lib/strategy-rule-model";

export const runtime = "nodejs";

const MAX_SAMPLE_BYTES = 8192;

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Heuristic from filename only — DOCX/PDF body is not parsed as trading rules. */
function strategyTypeFromFilename(filename: string, h: number): string {
  const f = filename.toLowerCase();
  if (/\b(mean|reversion|revert|contrarian)\b/.test(f)) return "mean-reversion";
  if (/\b(trend|momentum|breakout)\b/.test(f)) return "trend-following";
  return h % 2 === 0 ? "trend-following" : "mean-reversion";
}

/** Mock LLM: deterministic summary from filename + a small file sample (no full-file read). */
export async function POST(req: Request) {
  try {
    const ct = req.headers.get("content-type") || "";
    let filename = "strategy.txt";
    let sample = "";
    let byteLength = 0;

    if (ct.includes("multipart/form-data")) {
      let form: FormData;
      try {
        form = await req.formData();
      } catch {
        return NextResponse.json(
          { error: "Could not read form data. Try a smaller file or check the network connection." },
          { status: 400 },
        );
      }
      const entry = form.get("file");
      if (entry === null) {
        return NextResponse.json(
          { error: 'Missing file field "file".' },
          { status: 400 },
        );
      }
      if (typeof entry === "string") {
        return NextResponse.json(
          { error: "Expected a file upload, not plain text in the file field." },
          { status: 400 },
        );
      }
      const blob = entry as Blob;
      byteLength = blob.size;
      filename =
        entry instanceof File && entry.name.trim()
          ? entry.name.trim()
          : "upload.bin";
      const slice = blob.slice(0, Math.min(MAX_SAMPLE_BYTES, blob.size));
      sample = await slice.text();
    } else if (ct.includes("application/json")) {
      let j: Record<string, unknown>;
      try {
        j = (await req.json()) as Record<string, unknown>;
      } catch {
        return NextResponse.json(
          { error: "Invalid JSON body." },
          { status: 400 },
        );
      }
      filename = typeof j.filename === "string" ? j.filename : filename;
      const preview = typeof j.preview === "string" ? j.preview : "";
      sample = preview.slice(0, MAX_SAMPLE_BYTES);
      byteLength = typeof j.size === "number" ? j.size : preview.length;
    } else {
      return NextResponse.json(
        {
          error:
            'Send multipart/form-data with a field named "file", or JSON with { filename, preview }.',
        },
        { status: 415 },
      );
    }

    const key = `parse:${filename}:${byteLength}:${sample.length}`;
    const hit = cacheGet<unknown>(key);
    if (hit) {
      return NextResponse.json(hit);
    }

    const h = hash(filename + sample.slice(0, 200) + String(byteLength));
    const tagsPool = [
      "Momentum",
      "Value",
      "Breakout",
      "Swing",
      "Mean reversion",
      "Quality",
    ];
    const tags = [tagsPool[h % tagsPool.length], tagsPool[(h + 2) % tagsPool.length]];

    const strategyType = strategyTypeFromFilename(filename, h);
    const ruleModel = deriveRuleModelFromText(`${filename}\n${sample}`);

    const raw = {
      bullets: [
        `Strategy type: ${strategyType} on liquid names`,
        `Rule model: ${ruleModelSummary(ruleModel)}`,
        `Entry idea: price + volume / regime confirmation from uploaded spec`,
        `Risk lens: stop / position-size cues influence risk and volatility bias`,
        `Timeframe: ${h % 2 === 0 ? "swing (days to weeks)" : "positional (weeks)"}`,
      ],
      tags,
      ruleModel,
    };

    const summary = strategySummarySchema.parse(raw);
    cacheSet(key, summary, 300_000);
    return NextResponse.json(summary);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Strategy parse failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
