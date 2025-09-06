export interface FormatShortOptions {
  readonly decimals?: number; // number of decimals to keep
  readonly trimTrailingZeros?: boolean;
}

const UNITS = [
  { v: 1e12, s: "T" },
  { v: 1e9, s: "B" },
  { v: 1e6, s: "M" },
  { v: 1e3, s: "K" },
] as const;

/**
 * Format a number using short scale suffixes (K, M, B, T). Falls back to scientific for >= 1e15 or < 1e-3.
 */
export function formatShort(value: number, options: FormatShortOptions = {}): string {
  const { decimals = 2, trimTrailingZeros = true } = options;
  if (!Number.isFinite(value)) return String(value);

  const abs = Math.abs(value);
  if ((abs !== 0 && abs < 1e-3) || abs >= 1e15) {
    // scientific fallback
    return value.toExponential(decimals);
  }

  for (const u of UNITS) {
    if (abs >= u.v) {
      const num = value / u.v;
      return finalize(num, u.s, decimals, trimTrailingZeros);
    }
  }

  // No unit
  return finalize(value, "", decimals, trimTrailingZeros);
}

function finalize(num: number, suffix: string, decimals: number, trim: boolean): string {
  let s = num.toFixed(decimals);
  if (trim && decimals > 0) {
    // trim trailing zeros and optional decimal point
    s = s.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
  }
  return suffix ? `${s}${suffix}` : s;
}
