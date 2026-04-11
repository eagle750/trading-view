import type { ScreenerFilters } from "@/lib/schemas";
import type { SignalRow } from "@/lib/schemas";

/** Rough sector average P/E for demo “sector-relative” rules */
const SECTOR_AVG_PE: Record<string, number> = {
  IT: 27,
  Banking: 18,
  "Oil Gas & Consumable Fuels": 22,
  Telecom: 28,
  Construction: 25,
  Pharma: 32,
};

function sectorAvgPe(sector: string): number {
  return SECTOR_AVG_PE[sector] ?? 22;
}

function firstNumber(s: string | undefined): number | null {
  if (!s?.trim()) return null;
  const m = s.match(/-?\d+(\.\d+)?/);
  return m ? Number.parseFloat(m[0]) : null;
}

function minMarketCapCr(
  option: string,
  custom?: string,
): number | null {
  if (option === "NA") return null;
  if (option === "> ₹5Cr") return 5;
  if (option === "> ₹10Cr") return 10;
  if (option === "custom") {
    const n = firstNumber(custom);
    return n != null ? n : null;
  }
  return null;
}

function minPct(
  option: string,
  presets: Record<string, number>,
  custom?: string,
): number | null {
  if (option === "NA") return null;
  if (option in presets) return presets[option]!;
  if (option === "custom") {
    const n = firstNumber(custom);
    return n != null ? n : null;
  }
  return null;
}

function maxDebt(option: string, custom?: string): number | null {
  if (option === "NA") return null;
  if (option === "<1") return 1;
  if (option === "<2") return 2;
  if (option === "custom") {
    const n = firstNumber(custom);
    return n != null ? n : null;
  }
  return null;
}

function minPromoterOrFii(
  option: string,
  presets: Record<string, number>,
  custom?: string,
): number | null {
  if (option === "NA") return null;
  if (option in presets) return presets[option]!;
  if (option === "custom") {
    const n = firstNumber(custom);
    return n != null ? n : null;
  }
  return null;
}

/**
 * Applies selected screener parameters to the universe. Rows missing optional
 * fundamentals skip that specific criterion (pass-through) so filters never
 * empty the set solely due to missing demo fields.
 */
export function applyScreenerFilters(
  filters: ScreenerFilters,
  rows: SignalRow[],
): SignalRow[] {
  const minMcap = minMarketCapCr(filters.marketCap, filters.marketCapCustom);
  const minSales = minPct(
    filters.salesGrowth1y3y,
    { ">5%": 5, ">10%": 10 },
    filters.salesGrowthCustom,
  );
  const minProfit = minPct(
    filters.netProfitGrowth1y3y,
    { ">5%": 5, ">10%": 10 },
    filters.netProfitGrowthCustom,
  );
  const maxD = maxDebt(filters.debtToEquity, filters.debtToEquityCustom);
  const minProm = minPromoterOrFii(
    filters.promoterHolding,
    { ">30%": 30, ">50%": 50 },
    filters.promoterHoldingCustom,
  );
  const minFii = minPromoterOrFii(
    filters.fiiDiiHolding,
    { ">10%": 10, ">30%": 30 },
    filters.fiiDiiHoldingCustom,
  );
  const minRoe = minPct(
    filters.avgRoeRoce3y,
    { ">5%": 5, ">10%": 10 },
    filters.avgRoeRoceCustom,
  );
  const minLast2q = minPct(
    filters.last2QtrRevProfit,
    { ">5%": 5, ">10%": 10 },
  );

  return rows.filter((r) => {
    if (filters.sectors.length > 0 && !filters.sectors.includes(r.sector)) {
      return false;
    }

    if (minMcap != null && r.mktCapCr < minMcap) return false;

    if (minSales != null) {
      const v = r.salesGrowth1yPct;
      if (v !== undefined && v < minSales) return false;
    }

    if (minProfit != null) {
      const v = r.netProfitGrowth1yPct;
      if (v !== undefined && v < minProfit) return false;
    }

    if (maxD != null) {
      const v = r.debtToEquity;
      if (v !== undefined && v > maxD) return false;
    }

    if (minProm != null) {
      const v = r.promoterHoldingPct;
      if (v !== undefined && v < minProm) return false;
    }

    if (minFii != null) {
      const v = r.fiiDiiHoldingPct;
      if (v !== undefined && v < minFii) return false;
    }

    if (minRoe != null) {
      if (r.roe == null || r.roe < minRoe) return false;
    }

    if (minLast2q != null) {
      const v = r.last2QtrRevProfitGrowthPct;
      if (v !== undefined && v < minLast2q) return false;
    }

    if (filters.pe !== "NA" && r.pe != null) {
      const avg = sectorAvgPe(r.sector);
      if (filters.pe === "< sector" && !(r.pe < avg)) return false;
      if (filters.pe === "> sector" && !(r.pe > avg)) return false;
      if (filters.pe === "sector-relative") {
        const band = avg * 0.35;
        if (Math.abs(r.pe - avg) > band) return false;
      }
    }
    if (filters.pe === "custom") {
      const n = firstNumber(filters.peCustom);
      if (n != null && r.pe != null && r.pe < n) return false;
    }

    return true;
  });
}
