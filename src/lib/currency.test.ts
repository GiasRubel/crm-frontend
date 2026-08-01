import { describe, expect, it, vi } from "vitest";
import { CURRENCY_CODE, compactCurrencyFormatter, currencyFormatter } from "./currency";

/** Re-evaluates currency.ts so the module-scope env read runs again. */
async function reload() {
  vi.resetModules();
  return import("./currency");
}

// CURRENCY_CODE is read once at module scope from NEXT_PUBLIC_CURRENCY_CODE
// (set to USD in test/setup.ts), so these assertions pin the default install.
describe("CURRENCY_CODE", () => {
  it("defaults to the configured currency", () => {
    expect(CURRENCY_CODE).toBe("USD");
  });

  it("re-reads the env var on a fresh module load", async () => {
    const previous = process.env.NEXT_PUBLIC_CURRENCY_CODE;
    process.env.NEXT_PUBLIC_CURRENCY_CODE = "EUR";
    try {
      const fresh = await reload();
      expect(fresh.CURRENCY_CODE).toBe("EUR");
      expect(fresh.currencyFormatter.format(1000)).toContain("€");
    } finally {
      process.env.NEXT_PUBLIC_CURRENCY_CODE = previous;
      vi.resetModules();
    }
  });

  it("falls back to USD when the env var is unset", async () => {
    const previous = process.env.NEXT_PUBLIC_CURRENCY_CODE;
    delete process.env.NEXT_PUBLIC_CURRENCY_CODE;
    try {
      const fresh = await reload();
      expect(fresh.CURRENCY_CODE).toBe("USD");
    } finally {
      process.env.NEXT_PUBLIC_CURRENCY_CODE = previous;
      vi.resetModules();
    }
  });
});

describe("currencyFormatter", () => {
  it("formats whole amounts with a symbol and thousands separators", () => {
    expect(currencyFormatter.format(1234567)).toBe("$1,234,567");
  });

  it("rounds away fractional digits", () => {
    expect(currencyFormatter.format(1234.56)).toBe("$1,235");
    expect(currencyFormatter.format(0.4)).toBe("$0");
  });

  it("formats zero", () => {
    expect(currencyFormatter.format(0)).toBe("$0");
  });

  it("formats negatives", () => {
    expect(currencyFormatter.format(-2500)).toBe("-$2,500");
  });
});

describe("compactCurrencyFormatter", () => {
  // `maximumFractionDigits: 1` under compact notation also pins the *minimum*
  // to one digit, so round values keep a trailing ".0" ($1.0M, not $1M).
  it.each([
    [950, "$950.0"],
    [1500, "$1.5K"],
    [1_000_000, "$1.0M"],
    [2_450_000, "$2.5M"],
    [1_200_000_000, "$1.2B"],
  ])("formats %i compactly as %s", (input, expected) => {
    expect(compactCurrencyFormatter.format(input)).toBe(expected);
  });

  it("formats zero and negatives", () => {
    expect(compactCurrencyFormatter.format(0)).toBe("$0.0");
    expect(compactCurrencyFormatter.format(-1500)).toBe("-$1.5K");
  });
});
