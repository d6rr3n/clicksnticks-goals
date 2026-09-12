/**
 * Date-only values are stored as YYYY-MM-DD. They are parsed at local noon so
 * that a timezone offset can never push a date onto the previous or next day.
 */

export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const today = (now: Date = new Date()): string => toISODate(now);

/** Whole months from `date`, keeping the day of month where possible. */
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const targetDay = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(targetDay, lastDay));
  return d;
}

/** Fractional months between two dates, for pace maths. */
export function monthsBetween(from: Date, to: Date): number {
  const MS_PER_MONTH = (365.25 / 12) * 24 * 60 * 60 * 1000;
  return (to.getTime() - from.getTime()) / MS_PER_MONTH;
}

export const isSameMonth = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

export const monthYear = (iso: string): string =>
  parseDate(iso).toLocaleDateString("en-AU", { month: "short", year: "numeric" });

export const dayMonth = (iso: string): string =>
  parseDate(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short" });

export const fullDate = (iso: string): string =>
  parseDate(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export const longDate = (d: Date): string =>
  d.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
