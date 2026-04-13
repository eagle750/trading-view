import { NextResponse } from "next/server";
import { strategySummarySchema } from "@/lib/schemas";
import { cacheGet, cacheSet } from "@/lib/cache";
import {
  buildExtractedPreview,
  extensionOf,
  validateStrategyExtract,
} from "@/lib/strategy-extract-validation";
import {
  deriveRuleModelFromText,
  ruleModelSummary,
} from "@/lib/strategy-rule-model";

export const runtime = "nodejs";

const MAX_SAMPLE_BYTES = 256 * 1024;
const MAX_FULL_HASH = 8 * 1024 * 1024;
const HEAD_LARGE = 512 * 1024;
const TAIL_LARGE = 65536;
const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "json",
  "csv",
  "tsv",
  "yaml",
  "yml",
]);

async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function fileDigestHex(blob: Blob): Promise<string> {
  if (blob.size === 0) {
    return sha256Hex(new ArrayBuffer(0));
  }
  if (blob.size <= MAX_FULL_HASH) {
    return sha256Hex(await blob.arrayBuffer());
  }
  const head = await blob.slice(0, HEAD_LARGE).arrayBuffer();
  const tailStart = Math.max(0, blob.size - TAIL_LARGE);
  const tail = await blob.slice(tailStart).arrayBuffer();
  const meta = new TextEncoder().encode(`size:${blob.size}`);
  const combined = new Uint8Array(head.byteLength + tail.byteLength + meta.length);
  combined.set(new Uint8Array(head), 0);
  combined.set(new Uint8Array(tail), head.byteLength);
  combined.set(meta, head.byteLength + tail.byteLength);
  return sha256Hex(combined.buffer);
}

function tagsFromText(text: string): string[] {
  const h = text.toLowerCase();
  const picked = new Set<string>();
  if (/\b(momentum|breakout|trend|ema)\b/.test(h)) picked.add("Momentum");
  if (/\b(mean reversion|reversion|bollinger|oversold|overbought)\b/.test(h)) {
    picked.add("Mean reversion");
  }
  if (/\b(roe|roce|quality|promoter|profit growth|sales growth)\b/.test(h)) {
    picked.add("Quality");
  }
  if (/\b(swing|position|positional)\b/.test(h)) picked.add("Swing");
  return Array.from(picked).slice(0, 3);
}

function strategyTypeFromText(text: string): string {
  const t = text.toLowerCase();
  const trend = /\b(trend|momentum|breakout|ema|moving average)\b/.test(t);
  const meanRev =
    /\b(mean reversion|reversion|contrarian|bollinger|oversold|overbought)\b/.test(t);
  if (trend && !meanRev) return "trend-following";
  if (meanRev && !trend) return "mean-reversion";
  if (trend && meanRev) return "hybrid";
  return "rule-based";
}

/**
 * Parse strategy uploads into a deterministic rule model.
 * Scores are derived from extracted document text, not filename-only heuristics.
 */
export async function POST(req: Request) {
  try {
    const ct = req.headers.get("content-type") || "";
    let filename = "strategy.txt";
    let sample = "";
    let byteLength = 0;
    let digest = "";

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
      digest = await fileDigestHex(blob);
      const ext = extensionOf(filename);
      if (TEXT_EXTENSIONS.has(ext)) {
        const slice = blob.slice(0, Math.min(MAX_SAMPLE_BYTES, blob.size));
        sample = await slice.text();
      } else {
        // Best-effort for non-plain-text files (doc/pdf/etc).
        const slice = blob.slice(0, Math.min(MAX_SAMPLE_BYTES, blob.size));
        sample = await slice.text();
      }
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
      digest = await sha256Hex(new TextEncoder().encode(sample).buffer);
    } else {
      return NextResponse.json(
        {
          error:
            'Send multipart/form-data with a field named "file", or JSON with { filename, preview }.',
        },
        { status: 415 },
      );
    }

    const extractCheck = validateStrategyExtract(sample, filename);
    if (!extractCheck.ok) {
      return NextResponse.json({ error: extractCheck.error }, { status: 422 });
    }

    const key = `parse:v3:${digest}`;
    const hit = cacheGet<unknown>(key);
    if (hit) {
      return NextResponse.json(hit);
    }

    const tags = tagsFromText(sample);
    const strategyType = strategyTypeFromText(sample);
    const ruleModel = deriveRuleModelFromText(sample);
    const extractedPreview = buildExtractedPreview(sample);

    const raw = {
      bullets: [
        `Strategy type: ${strategyType}`,
        `Rule model: ${ruleModelSummary(ruleModel)}`,
        `File digest: ${digest.slice(0, 16)}… (${byteLength.toLocaleString("en-IN")} bytes)`,
        "Rule profile derived from validated upload text.",
        "Risk and volatility bias are inferred from terms like stop, drawdown, ATR, SD.",
      ],
      tags,
      ruleModel,
      extractedPreview,
    };

    const summary = strategySummarySchema.parse(raw);
    cacheSet(key, summary, 300_000);
    return NextResponse.json(summary);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Strategy parse failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
