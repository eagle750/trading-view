/**
 * NSE / Nifty indices available in the chart grid dropdown.
 * `yahoo` is the exact symbol passed to Yahoo Finance chart API.
 */
export const CHART_INDEX_ENTRIES = [
  { value: "NIFTY", label: "Nifty 50", yahoo: "^NSEI" },
  { value: "BANKNIFTY", label: "Nifty Bank", yahoo: "^NSEBANK" },
  { value: "NIFTYNEXT50", label: "Nifty Next 50", yahoo: "^NSMIDCP" },
  { value: "NIFTY100", label: "Nifty 100", yahoo: "^CNX100" },
  { value: "NIFTY200", label: "Nifty 200", yahoo: "^CNX200" },
  { value: "NIFTY500", label: "Nifty 500", yahoo: "^CNX500" },
  { value: "MIDCPNIFTY", label: "Nifty Midcap 50", yahoo: "^NSEMDCP50" },
  { value: "NIFTYIT", label: "Nifty IT", yahoo: "^CNXIT" },
  { value: "NIFTYPHARMA", label: "Nifty Pharma", yahoo: "^CNXPHARMA" },
  { value: "NIFTYAUTO", label: "Nifty Auto", yahoo: "^CNXAUTO" },
  { value: "NIFTYFMCG", label: "Nifty FMCG", yahoo: "^CNXFMCG" },
  { value: "NIFTYMETAL", label: "Nifty Metal", yahoo: "^CNXMETAL" },
  { value: "NIFTYENERGY", label: "Nifty Energy", yahoo: "^CNXENERGY" },
  { value: "NIFTYREALTY", label: "Nifty Realty", yahoo: "^CNXREALTY" },
  { value: "NIFTYINFRA", label: "Nifty Infra", yahoo: "^CNXINFRA" },
  { value: "NIFTYMEDIA", label: "Nifty Media", yahoo: "^CNXMEDIA" },
  { value: "NIFTYPSUBANK", label: "Nifty PSU Bank", yahoo: "^CNXPSUBANK" },
  { value: "NIFTYFINSERV", label: "Nifty Financial Services", yahoo: "^CNXFIN" },
] as const;

/** Dropdown options sorted by label */
export const CHART_INDEX_SELECT_OPTIONS = [...CHART_INDEX_ENTRIES]
  .sort((a, b) => a.label.localeCompare(b.label))
  .map(({ value, label }) => ({ value, label }));

const INDEX_VALUE_SET = new Set<string>(
  CHART_INDEX_ENTRIES.map((e) => e.value),
);

/** Resolve user ticker to Yahoo chart symbol when it matches a known index shortcut. */
export function chartIndexYahooSymbol(code: string): string | undefined {
  const u = code.trim().toUpperCase();
  if (u === "NIFTY50") return "^NSEI";
  const row = CHART_INDEX_ENTRIES.find((e) => e.value === u);
  return row?.yahoo;
}

export function isChartIndexValue(code: string): boolean {
  const u = code.trim().toUpperCase();
  if (u === "NIFTY50") return true;
  return INDEX_VALUE_SET.has(u);
}
