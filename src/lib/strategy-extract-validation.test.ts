import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { validateStrategyExtract } from "./strategy-extract-validation";

describe("validateStrategyExtract", () => {
  it("rejects UTF-8 decoded random bytes as .txt", () => {
    const garbage = randomBytes(12_000).toString("utf8");
    const r = validateStrategyExtract(garbage, "noise.txt");
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected failure");
    expect(r.error.length).toBeGreaterThan(20);
  });

  it("rejects lorem ipsum (no trading vocabulary)", () => {
    const lorem = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. `.repeat(
      4,
    );
    const r = validateStrategyExtract(lorem, "readme.txt");
    expect(r.ok).toBe(false);
  });

  it("rejects generic README support / technical wording", () => {
    const readme = `
      # My Library
      Thank you for your support. For technical questions, open an issue on GitHub.
      This project provides utilities for data processing and technical documentation.
      Customer support is available via email. Entry points are documented in the wiki.
    `.repeat(6);
    const r = validateStrategyExtract(readme, "README.txt");
    expect(r.ok).toBe(false);
  });

  it("accepts a minimal real strategy write-up", () => {
    const doc = `
      NSE swing strategy: enter when RSI is oversold below 30 on the daily chart.
      Exit near resistance or when MACD crosses down. Use a stop loss of 2% below entry.
      Prefer stocks with ROE above 15% and reasonable PE ratio. Backtest on a universe of liquid scrips.
    `;
    const r = validateStrategyExtract(doc, "rules.txt");
    expect(r.ok).toBe(true);
  });

  it("accepts multiple core indicators without long prose", () => {
    const short = "Signals: RSI divergence, MACD histogram, Bollinger squeeze on NSE names.";
    const r = validateStrategyExtract(short, "signals.txt");
    expect(r.ok).toBe(true);
  });

  it("rejects random bytes as .pdf even if some letters appear", () => {
    const buf = randomBytes(24_000).toString("latin1");
    const r = validateStrategyExtract(buf, "document.pdf");
    expect(r.ok).toBe(false);
  });
});
