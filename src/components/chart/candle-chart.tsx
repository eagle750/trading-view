"use client";

import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  createSeriesMarkers,
  createChart,
  HistogramSeries,
  LineSeries,
  LineStyle,
} from "lightweight-charts";
import type { OhlcBar } from "@/lib/schemas";

export type ChartOverlayKey =
  | "volume"
  | "ema20"
  | "ema50"
  | "ema200"
  | "bollinger"
  | "rsi"
  | "macd";

/** Colors used on the chart — keep in sync with series below */
export const CHART_OVERLAY_STYLES: Record<
  string,
  { label: string; swatch: string; detail: string }
> = {
  candleUp: {
    label: "Candles (up)",
    swatch: "#22c55e",
    detail: "Green bodies / wicks",
  },
  candleDown: {
    label: "Candles (down)",
    swatch: "#ef4444",
    detail: "Red bodies / wicks",
  },
  ema20: {
    label: "EMA 20",
    swatch: "#3b82f6",
    detail: "Blue line on price pane",
  },
  ema50: {
    label: "EMA 50",
    swatch: "#f59e0b",
    detail: "Orange line on price pane",
  },
  ema200: {
    label: "EMA 200",
    swatch: "#8b5cf6",
    detail: "Purple line on price pane",
  },
  bollinger: {
    label: "Bollinger Bands",
    swatch: "#6b7280",
    detail: "Mid solid; upper/lower dashed (#8a8a92)",
  },
  macd: {
    label: "MACD",
    swatch: "#22d3ee",
    detail: "Cyan line in lower pane",
  },
  rsi: {
    label: "RSI (14)",
    swatch: "#a78bfa",
    detail: "Purple line in lower pane",
  },
  volume: {
    label: "Volume",
    swatch: "linear-gradient(90deg,#22c55e55,#ef444455)",
    detail: "Green/red bars (lower pane)",
  },
};

const W = 900;
const H = 380;

function sma(values: number[], period: number): (number | undefined)[] {
  const out: (number | undefined)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      out.push(undefined);
      continue;
    }
    let s = 0;
    for (let j = 0; j < period; j++) s += values[i - j]!;
    out.push(s / period);
  }
  return out;
}

function ema(values: number[], period: number): (number | undefined)[] {
  const k = 2 / (period + 1);
  const out: (number | undefined)[] = [];
  let prev: number | undefined;
  for (let i = 0; i < values.length; i++) {
    const v = values[i]!;
    if (prev === undefined) {
      prev = v;
    } else {
      prev = v * k + prev * (1 - k);
    }
    out.push(i >= period - 1 ? prev : undefined);
  }
  return out;
}

export function CandleChart({
  bars,
  overlays,
  height = H,
}: {
  bars: OhlcBar[];
  overlays: Set<string>;
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || bars.length === 0) return;
    const chart = createChart(ref.current, {
      width: ref.current.clientWidth || W,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#141416" },
        textColor: "#e8e8ea",
      },
      grid: {
        vertLines: { color: "#26262a" },
        horzLines: { color: "#26262a" },
      },
      rightPriceScale: { borderColor: "#26262a" },
      timeScale: { borderColor: "#26262a" },
    });

    const candle = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    const data = bars.map((b) => ({
      time: b.time as import("lightweight-charts").UTCTimestamp,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
    }));
    candle.setData(data);

    const last = bars[bars.length - 1];
    if (last) {
      const isUp = last.close >= last.open;
      const entryMarkers = createSeriesMarkers(candle);
      entryMarkers.setMarkers([
        {
          time: last.time as import("lightweight-charts").UTCTimestamp,
          position: isUp ? "belowBar" : "aboveBar",
          shape: isUp ? "arrowUp" : "arrowDown",
          color: isUp ? "#22c55e" : "#ef4444",
          text: `Entry ${last.close.toFixed(2)}`,
        },
      ]);
    }

    const closes = bars.map((b) => b.close);
    const times = bars.map((b) => b.time as import("lightweight-charts").UTCTimestamp);

    const lineOver = (period: number, color: string) => {
      const e = ema(closes, period);
      const pts = times
        .map((t, i) =>
          e[i] !== undefined ? { time: t, value: e[i]! } : null,
        )
        .filter((x): x is { time: import("lightweight-charts").UTCTimestamp; value: number } => x !== null);
      if (pts.length) {
        const s = chart.addSeries(LineSeries, { color, lineWidth: 1 });
        s.setData(pts);
      }
    };

    if (overlays.has("ema20")) lineOver(20, "#3b82f6");
    if (overlays.has("ema50")) lineOver(50, "#f59e0b");
    if (overlays.has("ema200")) lineOver(200, "#8b5cf6");

    if (overlays.has("bollinger")) {
      const p = 20;
      const mid = sma(closes, p);
      const upper: (number | undefined)[] = [];
      const lower: (number | undefined)[] = [];
      for (let i = 0; i < closes.length; i++) {
        const m = mid[i];
        if (m === undefined) {
          upper.push(undefined);
          lower.push(undefined);
          continue;
        }
        if (i < p - 1) {
          upper.push(undefined);
          lower.push(undefined);
          continue;
        }
        let v = 0;
        for (let j = 0; j < p; j++) {
          const d = closes[i - j]! - m;
          v += d * d;
        }
        const sd = Math.sqrt(v / p);
        upper.push(m + 2 * sd);
        lower.push(m - 2 * sd);
      }
      const band = (vals: (number | undefined)[], color: string) => {
        const pts = times
          .map((t, i) =>
            vals[i] !== undefined ? { time: t, value: vals[i]! } : null,
          )
          .filter((x): x is { time: import("lightweight-charts").UTCTimestamp; value: number } => x !== null);
        if (pts.length) {
          const s = chart.addSeries(LineSeries, {
            color,
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
          });
          s.setData(pts);
        }
      };
      band(upper, "#8a8a92");
      band(lower, "#8a8a92");
      band(mid, "#6b7280");
    }

    if (overlays.has("macd")) {
      const e12 = ema(closes, 12);
      const e26 = ema(closes, 26);
      const macd = closes.map((_, i) => {
        const a = e12[i];
        const b = e26[i];
        if (a === undefined || b === undefined) return undefined;
        return a - b;
      });
      const macdPane = chart.addPane();
      const pts = times
        .map((t, i) =>
          macd[i] !== undefined ? { time: t, value: macd[i]! } : null,
        )
        .filter((x): x is { time: import("lightweight-charts").UTCTimestamp; value: number } => x !== null);
      if (pts.length) {
        const s = macdPane.addSeries(LineSeries, { color: "#22d3ee", lineWidth: 1 });
        s.setData(pts);
      }
    }

    if (overlays.has("volume") && bars[0]?.volume != null) {
      const vp = chart.addPane();
      const hs = vp.addSeries(HistogramSeries, {
        priceFormat: { type: "volume" },
      });
      hs.setData(
        bars.map((b) => ({
          time: b.time as import("lightweight-charts").UTCTimestamp,
          value: b.volume ?? 0,
          color:
            b.close >= b.open ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)",
        })),
      );
    }

    if (overlays.has("rsi")) {
      const rsiPane = chart.addPane();
      const period = 14;
      const rsiVals: number[] = [];
      let gains = 0;
      let losses = 0;
      for (let i = 0; i < closes.length; i++) {
        if (i === 0) {
          rsiVals.push(50);
          continue;
        }
        const ch = closes[i]! - closes[i - 1]!;
        const g = Math.max(ch, 0);
        const l = Math.max(-ch, 0);
        if (i < period) {
          gains += g;
          losses += l;
          rsiVals.push(50);
        } else {
          gains = (gains * (period - 1) + g) / period;
          losses = (losses * (period - 1) + l) / period;
          const rs = losses === 0 ? 100 : gains / losses;
          rsiVals.push(100 - 100 / (1 + rs));
        }
      }
      const rsiSeries = rsiPane.addSeries(LineSeries, { color: "#a78bfa", lineWidth: 1 });
      rsiSeries.setData(
        times.map((t, i) => ({ time: t, value: rsiVals[i] ?? 50 })),
      );
    }

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      if (ref.current) {
        chart.applyOptions({ width: ref.current.clientWidth });
      }
    });
    ro.observe(ref.current);

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, [bars, overlays, height]);

  return <div ref={ref} className="w-full rounded-sm border border-[var(--border)]" />;
}
