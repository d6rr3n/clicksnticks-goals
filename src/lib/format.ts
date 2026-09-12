const AUD = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  maximumFractionDigits: 0,
});

export const money = (n: number): string => AUD.format(n);

/** "+$200" / "-$90" — sign always shown, for ledger rows. */
export const signedMoney = (n: number): string =>
  (n < 0 ? "−" : "+") + AUD.format(Math.abs(n));

export const percent = (fraction: number): string =>
  `${Math.round(fraction * 100)}%`;

export const monthYear = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-AU", { month: "short", year: "numeric" });

export const dayMonth = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short" });

export const longDate = (d: Date): string =>
  d.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
