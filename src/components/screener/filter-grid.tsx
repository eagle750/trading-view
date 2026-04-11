"use client";

import { Card } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import {
  OPTIONS_DEBT,
  OPTIONS_FII,
  OPTIONS_GROWTH,
  OPTIONS_LAST2Q,
  OPTIONS_MARKET_CAP,
  OPTIONS_PE,
  OPTIONS_PROMOTER,
  OPTIONS_ROE,
} from "@/lib/constants/filters";
import { NSE_SECTORS } from "@/lib/seed/nse-sectors";
import { useScreenerStore } from "@/stores/screener-store";
import { Checkbox } from "@/components/ui/checkbox";
import * as Popover from "@radix-ui/react-popover";

export function FilterGrid() {
  const { filters, setFilters } = useScreenerStore();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <Card>
        <SelectField
          label="Market Cap"
          unitHint="INR crores"
          value={filters.marketCap}
          onChange={(v) => setFilters({ marketCap: v })}
          options={OPTIONS_MARKET_CAP}
          showCustom
          customValue={filters.marketCapCustom}
          onCustomChange={(marketCapCustom) => setFilters({ marketCapCustom })}
        />
      </Card>
      <Card>
        <SelectField
          label="Sales Growth 1Y / 3Y"
          value={filters.salesGrowth1y3y}
          onChange={(v) => setFilters({ salesGrowth1y3y: v })}
          options={OPTIONS_GROWTH}
          showCustom
          customValue={filters.salesGrowthCustom}
          onCustomChange={(salesGrowthCustom) => setFilters({ salesGrowthCustom })}
        />
      </Card>
      <Card>
        <SelectField
          label="Net Profit Growth 1Y / 3Y"
          value={filters.netProfitGrowth1y3y}
          onChange={(v) => setFilters({ netProfitGrowth1y3y: v })}
          options={OPTIONS_GROWTH}
          showCustom
          customValue={filters.netProfitGrowthCustom}
          onCustomChange={(netProfitGrowthCustom) =>
            setFilters({ netProfitGrowthCustom })
          }
        />
      </Card>
      <Card>
        <SelectField
          label="Debt to Equity"
          value={filters.debtToEquity}
          onChange={(v) => setFilters({ debtToEquity: v })}
          options={OPTIONS_DEBT}
          showCustom
          customValue={filters.debtToEquityCustom}
          onCustomChange={(debtToEquityCustom) =>
            setFilters({ debtToEquityCustom })
          }
        />
      </Card>
      <Card>
        <SelectField
          label="Promoter Holding"
          value={filters.promoterHolding}
          onChange={(v) => setFilters({ promoterHolding: v })}
          options={OPTIONS_PROMOTER}
          showCustom
          customValue={filters.promoterHoldingCustom}
          onCustomChange={(promoterHoldingCustom) =>
            setFilters({ promoterHoldingCustom })
          }
        />
      </Card>
      <Card>
        <SelectField
          label="FII / DII Holding"
          value={filters.fiiDiiHolding}
          onChange={(v) => setFilters({ fiiDiiHolding: v })}
          options={OPTIONS_FII}
          showCustom
          customValue={filters.fiiDiiHoldingCustom}
          onCustomChange={(fiiDiiHoldingCustom) =>
            setFilters({ fiiDiiHoldingCustom })
          }
        />
      </Card>
      <Card>
        <SelectField
          label="Avg RoE 3Y / RoCE 3Y"
          value={filters.avgRoeRoce3y}
          onChange={(v) => setFilters({ avgRoeRoce3y: v })}
          options={OPTIONS_ROE}
          showCustom
          customValue={filters.avgRoeRoceCustom}
          onCustomChange={(avgRoeRoceCustom) =>
            setFilters({ avgRoeRoceCustom })
          }
        />
      </Card>
      <Card>
        <SelectField
          label="P/E"
          hint="Relative to sector where noted"
          value={filters.pe}
          onChange={(v) => setFilters({ pe: v })}
          options={OPTIONS_PE}
          showCustom
          customValue={filters.peCustom}
          onCustomChange={(peCustom) => setFilters({ peCustom })}
        />
      </Card>
      <Card className="sm:col-span-2 xl:col-span-2">
        <div className="text-sm text-[var(--foreground)] mb-2">Sector</div>
        <div className="text-xs text-[var(--muted)] mb-2">
          Multi-select — leave empty for all sectors (same as N/A for sector filter).
        </div>
        <button
          type="button"
          className="mb-2 text-xs text-[#3b82f6] hover:underline"
          onClick={() => setFilters({ sectors: [] })}
        >
          Clear all sectors
        </button>
        <Popover.Root>
          <Popover.Trigger asChild>
            <button
              type="button"
              className="h-9 w-full max-w-md rounded-sm border border-[var(--border)] bg-[var(--background)] px-2 text-left text-sm text-[var(--foreground)]"
            >
              {filters.sectors.length
                ? `${filters.sectors.length} selected`
                : "Choose sectors"}
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className="z-[100] w-[min(100vw-2rem,22rem)] rounded-sm border border-[var(--border)] bg-[var(--surface)] p-3 shadow-none max-h-64 overflow-y-auto"
              sideOffset={4}
            >
              <div className="flex flex-col gap-2">
                {NSE_SECTORS.map((s) => {
                  const checked = filters.sectors.includes(s);
                  return (
                    <label
                      key={s}
                      className="flex items-start gap-2 text-xs text-[var(--foreground)] cursor-pointer"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          const on = v === true;
                          setFilters({
                            sectors: on
                              ? [...filters.sectors, s]
                              : filters.sectors.filter((x) => x !== s),
                          });
                        }}
                      />
                      <span>{s}</span>
                    </label>
                  );
                })}
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </Card>
      <Card>
        <SelectField
          label="Last 2 Qtr Rev / Profit Growth"
          value={filters.last2QtrRevProfit}
          onChange={(v) => setFilters({ last2QtrRevProfit: v })}
          options={OPTIONS_LAST2Q}
        />
      </Card>
    </div>
  );
}
