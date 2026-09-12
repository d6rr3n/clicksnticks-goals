/**
 * Money is integer cents everywhere inside the app. Floats are only ever
 * produced at the formatting edge, so repeated sums never drift.
 */

export const toCents = (dollars: number): number => Math.round(dollars * 100);

export const toDollars = (cents: number): number => cents / 100;

/**
 * Parse user input such as "1,250", "$1250.50" or "1250.5".
 * Returns null for anything that isn't a finite amount.
 */
export function parseAmount(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, "");
  if (cleaned === "" || !/^-?\d*\.?\d*$/.test(cleaned)) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return toCents(n);
}

const AUD = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  maximumFractionDigits: 0,
});

const AUD_EXACT = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  minimumFractionDigits: 2,
});

/** Whole dollars — for headline figures. */
export const money = (cents: number): string => AUD.format(toDollars(cents));

/** Cents shown when they are not zero — for ledger rows. */
export const moneyExact = (cents: number): string =>
  cents % 100 === 0 ? money(cents) : AUD_EXACT.format(toDollars(cents));

/** "+$200" / "−$90", sign always shown. */
export const signedMoney = (cents: number): string =>
  (cents < 0 ? "−" : "+") + moneyExact(Math.abs(cents));
