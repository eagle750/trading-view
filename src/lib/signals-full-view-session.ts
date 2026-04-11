import type { SignalRow } from "@/lib/schemas";

/** Shared across tabs on the same origin (unlike sessionStorage). */
export const SIGNALS_FULL_VIEW_KEY = "trade-signals-full-v1";

export function stashSignalsForFullView(rows: SignalRow[]): void {
  const payload = {
    at: Date.now(),
    signals: rows,
  };
  try {
    localStorage.setItem(SIGNALS_FULL_VIEW_KEY, JSON.stringify(payload));
  } catch {
    // Private mode / quota
    throw new Error("STORAGE_UNAVAILABLE");
  }
}

export function readStashedSignalsForFullView(): string | null {
  try {
    return localStorage.getItem(SIGNALS_FULL_VIEW_KEY);
  } catch {
    return null;
  }
}

export function openSignalsFullViewTab(): void {
  window.open("/signals", "_blank", "noopener,noreferrer");
}
