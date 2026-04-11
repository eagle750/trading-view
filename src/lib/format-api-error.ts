/** Turn Zod flatten() or API payload into a user-visible string */
export function formatScreenerApiError(
  payload: unknown,
  meta?: { httpStatus?: number; fallbackText?: string },
): string {
  const bits: string[] = [];

  if (payload && typeof payload === "object") {
    const p = payload as {
      error?: unknown;
      details?: unknown;
      message?: unknown;
    };
    if (typeof p.error === "string" && p.error.trim()) {
      bits.push(p.error.trim());
    } else if (typeof p.message === "string" && p.message.trim()) {
      bits.push(p.message.trim());
    }

    const d = p.details;
    if (d && typeof d === "object") {
      if ("formErrors" in d) {
        const fe = (d as { formErrors: string[] }).formErrors;
        if (fe?.length) bits.push(fe.join(" · "));
      }
      if ("fieldErrors" in d) {
        const fe = (d as { fieldErrors: Record<string, string[] | undefined> })
          .fieldErrors;
        const lines: string[] = [];
        for (const [key, msgs] of Object.entries(fe)) {
          if (msgs?.length) lines.push(`${key}: ${msgs.join(", ")}`);
        }
        if (lines.length) bits.push(lines.join(" · "));
      }
    }

    if (bits.length === 0) {
      try {
        bits.push(JSON.stringify(payload));
      } catch {
        bits.push("Request failed.");
      }
    }
  } else if (meta?.fallbackText) {
    bits.push(meta.fallbackText);
  } else {
    bits.push("Request failed — empty or unreadable response.");
  }

  if (meta?.httpStatus != null) {
    bits.push(`HTTP ${meta.httpStatus}`);
  }

  return [...new Set(bits.filter(Boolean))].join(" · ");
}
