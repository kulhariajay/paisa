import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Current month as "YYYY-MM" in local time. */
export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Parse "YYYY-MM" into { year, month0 } where month0 is 0-indexed. */
export function parseMonth(m: string): { year: number; month0: number } {
  const [y, mo] = m.split("-").map(Number);
  return { year: y, month0: mo - 1 };
}

/** Add `n` months to a "YYYY-MM" string. */
export function addMonths(m: string, n: number): string {
  const { year, month0 } = parseMonth(m);
  const d = new Date(year, month0 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Last day (28-31) of a given "YYYY-MM". */
export function lastDayOfMonth(m: string): number {
  const { year, month0 } = parseMonth(m);
  return new Date(year, month0 + 1, 0).getDate();
}

/**
 * Build a due Date for a template's day_of_month within a given month, clamping
 * to the last day of shorter months (31 -> Feb 28/29).
 */
export function dueDateFor(month: string, dayOfMonth: number): Date {
  const { year, month0 } = parseMonth(month);
  const day = Math.min(dayOfMonth, lastDayOfMonth(month));
  return new Date(year, month0, day);
}

/** Inclusive list of "YYYY-MM" strings from `start` to `end`. */
export function monthsBetween(start: string, end: string): string[] {
  const out: string[] = [];
  let cur = start;
  // guard against runaway loops
  for (let i = 0; i < 600 && cur <= end; i++) {
    out.push(cur);
    cur = addMonths(cur, 1);
  }
  return out;
}

/** Human label for a "YYYY-MM": "June 2026". */
export function monthLabel(m: string): string {
  const { year, month0 } = parseMonth(m);
  return new Date(year, month0, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}
