/**
 * Reject uploads where we did not get usable strategy prose.
 * Uses word/phrase-boundary matching so words like "entry" inside "reentry"
 * or "support" in "customer support" do not count as trading signals.
 */

const BINARY_FAMILY_EXT = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
]);

/**
 * Strong trading / screening vocabulary (regex, already case-insensitive where needed).
 * Count how many different patterns match at least once.
 */
const FINANCE_CORE_PATTERNS: RegExp[] = [
  /\brsi\b/i,
  /\bmacd\b/i,
  /\bvwap\b/i,
  /\bbollinger\b/i,
  /\boversold\b/i,
  /\boverbought\b/i,
  /\bcandlestick\b/i,
  /\bstop\s+loss\b/i,
  /\btake\s+profit\b/i,
  /\bmean\s+reversion\b/i,
  /\bmoving\s+average\b/i,
  /\b(?:atr|average\s+true\s+range)\b/i,
  /\b(?:p\/e|price\s+to\s+earnings|pe\s+ratio)\b/i,
  /\broe\b/i,
  /\broce\b/i,
  /\bpeg\b/i,
  /\b(?:ema|sma)\s*\(?\s*\d+/i,
  /\b(?:breakout|pullback)\b/i,
  /\b(?:support|resistance)\s+(?:level|zone|area)\b/i,
  /\b(?:buy|sell)\s+(?:signal|zone|when|if)\b/i,
  /\b(?:long|short)\s+(?:position|trade|only)\b/i,
];

/** Secondary terms — still boundary-safe; need several if core is thin. */
const FINANCE_SECONDARY_PATTERNS: RegExp[] = [
  /\bmomentum\b/i,
  /\bbreakout\b/i,
  /\bdrawdown\b/i,
  /\bbacktest\b/i,
  /\bvolatility\b/i,
  /\bportfolio\b/i,
  /\bequity\s+(?:curve|allocation|exposure)\b/i,
  /\b(?:swing|positional)\s+trading\b/i,
  /\bscalp(?:ing)?\b/i,
  /\btrading\s+strategy\b/i,
  /\bscreen(?:er|ing)\s+(?:rule|stock|universe)\b/i,
  /\b(?:profit|sales)\s+growth\b/i,
  /\bpromoter\s+holding\b/i,
  /\b(?:nse|bse)\b/i,
  /\bindicator\b/i,
  /\b(?:technical|fundamental)\s+analysis\b/i,
  /\b(?:universe|watchlist)\b/i,
  /\b(?:scrip|ticker|symbol)\b/i,
];

function countPatternHits(patterns: RegExp[], text: string): number {
  let n = 0;
  for (const p of patterns) {
    p.lastIndex = 0;
    if (p.test(text)) n += 1;
  }
  return n;
}

/** Letter-only tokens length >= 3 — junk binary produces few real words. */
function countAlphaWords(text: string): number {
  const m = text.toLowerCase().match(/\b[a-z]{3,}\b/g);
  return m ? m.length : 0;
}

/** Share of chars that are not letters, digits, common punctuation, or whitespace. */
function noisySymbolRatio(sample: string): number {
  if (sample.length === 0) return 1;
  let bad = 0;
  for (let i = 0; i < sample.length; i++) {
    const c = sample.charCodeAt(i);
    const ok =
      (c >= 32 && c <= 126) ||
      c === 9 ||
      c === 10 ||
      c === 13 ||
      (c >= 0xc0 && c !== 0xfffd);
    if (!ok) bad += 1;
  }
  return bad / sample.length;
}

export function extensionOf(filename: string): string {
  const i = filename.lastIndexOf(".");
  if (i < 0 || i === filename.length - 1) return "";
  return filename.slice(i + 1).toLowerCase();
}

function letterRatio(sample: string): number {
  if (sample.length === 0) return 0;
  let letters = 0;
  for (let i = 0; i < sample.length; i++) {
    const c = sample.charCodeAt(i);
    if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122)) letters += 1;
  }
  return letters / sample.length;
}

function replacementCharRatio(sample: string): number {
  if (sample.length === 0) return 0;
  let n = 0;
  for (let i = 0; i < sample.length; i++) {
    if (sample.charCodeAt(i) === 0xfffd) n += 1;
  }
  return n / sample.length;
}

function nullByteRatio(sample: string): number {
  if (sample.length === 0) return 0;
  let n = 0;
  for (let i = 0; i < sample.length; i++) {
    if (sample.charCodeAt(i) === 0) n += 1;
  }
  return n / sample.length;
}

function readableCharCount(sample: string): number {
  let n = 0;
  for (let i = 0; i < sample.length; i++) {
    const c = sample.charCodeAt(i);
    if (
      (c >= 32 && c <= 126) ||
      c === 9 ||
      c === 10 ||
      c === 13 ||
      (c >= 0xa0 && c !== 0xfffd)
    ) {
      n += 1;
    }
  }
  return n;
}

export type StrategyExtractValidation =
  | { ok: true }
  | { ok: false; error: string };

/**
 * @param sample Raw string from upload slice (best-effort text for binary formats).
 */
export function validateStrategyExtract(
  sample: string,
  filename: string,
): StrategyExtractValidation {
  const ext = extensionOf(filename);
  const isBinaryFamily = BINARY_FAMILY_EXT.has(ext);
  const trimmed = sample.trim();

  if (trimmed.length === 0) {
    return {
      ok: false,
      error:
        "No readable text was found in this file. It may be empty, encrypted, or not a text-based strategy document. Try a .txt file or export your strategy as plain text.",
    };
  }

  const norm = trimmed.replace(/\s+/g, " ");
  const slice = norm.slice(0, 48_000);
  const lr = letterRatio(slice);
  const rcr = replacementCharRatio(slice);
  const nbr = nullByteRatio(slice);
  const readable = readableCharCount(slice);
  const noisy = noisySymbolRatio(slice);
  const alphaWords = countAlphaWords(slice);
  const core = countPatternHits(FINANCE_CORE_PATTERNS, slice);
  const secondary = countPatternHits(FINANCE_SECONDARY_PATTERNS, slice);
  const vocabularyHits = core + secondary;

  if (nbr > 0.015) {
    return {
      ok: false,
      error:
        "This file does not look like readable strategy text (binary content detected). Upload a strategy written in plain language — preferably .txt — or export from Word/PDF as text.",
    };
  }

  if (rcr > 0.04) {
    return {
      ok: false,
      error:
        "Could not decode this file as usable text (likely a binary or scanned document). Use a .txt strategy file, or copy the strategy text into a .txt file and upload that.",
    };
  }

  if (noisy > 0.12) {
    return {
      ok: false,
      error:
        "The extracted content is mostly symbols or non-text bytes — not a readable strategy document. Save your rules as plain .txt and upload again.",
    };
  }

  /** Need either several specific finance phrases, or strong core + prose. */
  const proseOk =
    alphaWords >= 28 &&
    lr >= 0.22 &&
    readable >= 120 &&
    noisy <= 0.08;

  const coreStrongEnough = core >= 2 || (core >= 1 && secondary >= 3);
  const coreMedium = core >= 1 && secondary >= 1 && vocabularyHits >= 4;

  if (isBinaryFamily) {
    if (lr < 0.3 || readable < 160 || alphaWords < 35) {
      return {
        ok: false,
        error:
          "Could not read enough plain-language strategy text from this PDF or Office file. Export your rules as .txt (or copy-paste into a .txt file), then upload that file.",
      };
    }
    if (!(coreStrongEnough || (coreMedium && proseOk))) {
      return {
        ok: false,
        error:
          "This file does not contain clear trading or screening rules (for example: RSI, moving average, stop loss, PE, NSE symbols). It may be the wrong attachment or not a strategy write-up.",
      };
    }
  } else {
    /** One-liner with several distinct indicators still counts as a strategy. */
    const compactIndicatorOk =
      core >= 3 &&
      readable >= 32 &&
      lr >= 0.2 &&
      noisy <= 0.1;

    if (!compactIndicatorOk && (readable < 50 || alphaWords < 18)) {
      return {
        ok: false,
        error:
          "The file is too short or does not read like normal sentences. Write your entry/exit rules and indicators in plain text and try again.",
      };
    }
    if (lr < 0.18 && core < 2) {
      return {
        ok: false,
        error:
          "This file looks like binary or encoded data, not a text strategy. Use a .txt file with written rules (RSI, trends, stops, fundamentals, etc.).",
      };
    }
    if (!(coreStrongEnough || (core >= 1 && proseOk) || (coreMedium && proseOk))) {
      return {
        ok: false,
        error:
          "No clear strategy language was detected. Describe how you screen or trade (indicators, risk, fundamentals, exchanges). Random or unrelated documents are rejected.",
      };
    }
  }

  return { ok: true };
}

const PREVIEW_MAX = 3_500;

/** Safe excerpt for JSON / UI. */
export function buildExtractedPreview(sample: string): string {
  const t = sample
    .replace(/\u0000/g, "")
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length <= PREVIEW_MAX) return t;
  return `${t.slice(0, PREVIEW_MAX)}…`;
}
