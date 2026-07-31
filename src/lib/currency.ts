/**
 * Currency code is a simple config value (env var), not live FX conversion —
 * CodeCanyon buyers just need their own currency symbol, not rate lookups.
 */
export const CURRENCY_CODE = process.env.NEXT_PUBLIC_CURRENCY_CODE || "USD";

export const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: CURRENCY_CODE,
  maximumFractionDigits: 0,
});

export const compactCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: CURRENCY_CODE,
  notation: "compact",
  maximumFractionDigits: 1,
});
