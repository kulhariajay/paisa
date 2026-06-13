/**
 * Money utilities. ALL money in this app is stored and passed around as integer
 * paise (1 rupee = 100 paise). Never use floats for money arithmetic. Convert to
 * rupees only at the display/input boundary.
 *
 * Amounts comfortably fit in Number.MAX_SAFE_INTEGER (₹90 trillion in paise), so
 * we use plain numbers here rather than bigint for ergonomics.
 */

/** Convert a rupee amount (possibly with decimals) to integer paise. */
export function toPaise(rupees: number | string): number {
  const n = typeof rupees === "string" ? parseFloat(rupees) : rupees;
  if (!isFinite(n)) return 0;
  return Math.round(n * 100);
}

/** Convert integer paise to a rupee number (may have 2 decimals). */
export function toRupees(paise: number): number {
  return paise / 100;
}

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrFormatterPaise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format paise as ₹1,23,456 (no decimals, Indian grouping). */
export function formatINR(paise: number): string {
  return inrFormatter.format(toRupees(paise));
}

/** Format paise as ₹1,23,456.78 (with decimals). */
export function formatINRPrecise(paise: number): string {
  return inrFormatterPaise.format(toRupees(paise));
}

/** Compact Indian formatting: ₹1.2L, ₹3.4Cr, ₹5,600. */
export function formatINRCompact(paise: number): string {
  const r = toRupees(paise);
  const abs = Math.abs(r);
  const sign = r < 0 ? "-" : "";
  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(2)}Cr`;
  if (abs >= 1_00_000) return `${sign}₹${(abs / 1_00_000).toFixed(2)}L`;
  if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(1)}K`;
  return `${sign}₹${abs.toFixed(0)}`;
}
