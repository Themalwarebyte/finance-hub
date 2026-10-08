/**
 * Phase 4.2 — KES-first (Kenya Mode) tests.
 *
 * Verifies: new records default to KES, dashboards compute in KES, KES
 * formatting matches the spec (KSh 1,000 / 1.5M / 56.29B), the existing
 * multi-currency conversion functions remain intact, and no USD conversion
 * is accidentally applied in Kenya Mode.
 */
import { describe, expect, test } from "bun:test";
import {
  formatMoney,
  formatCompactMoney,
  formatSignedMoney,
  PRIMARY_CURRENCY,
} from "./format";
import { convertCents } from "./currency";
import {
  DEFAULT_DISPLAY_CURRENCY,
  DEFAULT_HOUSEHOLD_CURRENCY,
  DEFAULT_ACCOUNT_CURRENCY,
  DEFAULT_TRANSACTION_CURRENCY,
  DEFAULT_BUDGET_CURRENCY,
  DEFAULT_GOAL_CURRENCY,
  DEFAULT_DEBT_CURRENCY,
  DEFAULT_BUSINESS_CURRENCY,
  DEFAULT_INVOICE_CURRENCY,
  DEFAULT_INVESTMENT_CURRENCY,
  DEFAULT_ROADMAP_CURRENCY,
  DEFAULT_CURRENCY_MODE,
  SUPPORTED_CURRENCIES,
} from "../convex/schema";
import {
  receivablesCents,
  pipelineValue,
  progressPct,
  consolidatedNetCents,
} from "./business";

describe("KES-first defaults", () => {
  test("every record type defaults to KES", () => {
    expect(DEFAULT_HOUSEHOLD_CURRENCY).toBe("KES");
    expect(DEFAULT_ACCOUNT_CURRENCY).toBe("KES");
    expect(DEFAULT_TRANSACTION_CURRENCY).toBe("KES");
    expect(DEFAULT_BUDGET_CURRENCY).toBe("KES");
    expect(DEFAULT_GOAL_CURRENCY).toBe("KES");
    expect(DEFAULT_DEBT_CURRENCY).toBe("KES");
    expect(DEFAULT_BUSINESS_CURRENCY).toBe("KES");
    expect(DEFAULT_INVOICE_CURRENCY).toBe("KES");
    expect(DEFAULT_INVESTMENT_CURRENCY).toBe("KES");
    expect(DEFAULT_ROADMAP_CURRENCY).toBe("KES");
  });

  test("display currency and mode default to KES / kes_first", () => {
    expect(DEFAULT_DISPLAY_CURRENCY).toBe("KES");
    expect(DEFAULT_CURRENCY_MODE).toBe("kes_first");
    expect(PRIMARY_CURRENCY).toBe("KES");
  });

  test("multi-currency architecture is preserved (USD still supported)", () => {
    expect(SUPPORTED_CURRENCIES).toContain("USD");
    expect(SUPPORTED_CURRENCIES).toContain("KES");
  });
});

describe("KES formatting", () => {
  test("plain amounts render as KSh 1,000 style", () => {
    expect(formatMoney(100_000)).toBe("KSh 1,000.00");
    expect(formatMoney(100_000, { cents: false })).toBe("KSh 1,000");
    expect(formatMoney(12_345_67)).toBe("KSh 12,345.67");
  });

  test("negative amounts keep the minus before KSh", () => {
    expect(formatMoney(-250_000)).toBe("\u2212KSh 2,500.00");
  });

  test("compact amounts: KSh 1.5M and KSh 56.29B", () => {
    expect(formatCompactMoney(150_000_000)).toBe("KSh 1.5M");
    expect(formatCompactMoney(5_629_000_000_000)).toBe("KSh 56.29B");
    expect(formatCompactMoney(100_000)).toBe("KSh 1,000");
    expect(formatCompactMoney(999_00)).toBe("KSh 999");
  });

  test("signed money uses KSh for income and expenses", () => {
    expect(formatSignedMoney(50_000, "in")).toBe("+KSh 500.00");
    expect(formatSignedMoney(50_000, "out")).toBe("\u2212KSh 500.00");
    expect(formatSignedMoney(50_000, "transfer")).toBe("KSh 500.00");
  });
});

describe("dashboards compute correctly in KES", () => {
  test("receivables, pipeline and net cash are pure cent math (currency-agnostic)", () => {
    // All KES amounts in integer cents — sums must be exact, no conversion.
    const invoices = [
      { amountCents: 1_500_000, paidCents: 500_000, status: "partially_paid" }, // KSh 15,000
      { amountCents: 2_000_000, paidCents: 0, status: "issued" }, // KSh 20,000
    ];
    expect(receivablesCents(invoices)).toBe(3_000_000); // KSh 30,000

    const leads = [
      { stage: "Won", estimatedValueCents: 4_000_000, probabilityPct: 100, createdAt: 0, closedAtMs: 1_000 },
      { stage: "Proposal", estimatedValueCents: 2_000_000, probabilityPct: 50, createdAt: 0 },
    ];
    expect(pipelineValue(leads as never)).toBe(2_000_000);
    expect(progressPct(2_000_000, 4_000_000)).toBe(50);

    const txns = [
      { direction: "in", amount: 9_000_000 }, // KSh 90,000
      { direction: "out", amount: 3_500_000 }, // KSh 35,000
    ];
    expect(consolidatedNetCents(txns as never)).toBe(5_500_000); // KSh 55,000
  });
});

describe("conversion functions remain intact", () => {
  test("KES↔USD still converts with a manual rate (1 USD = 129.5 KES)", () => {
    const rateCentsPerUsd = 12_950; // 129.5 KES = 12,950 KES cents per USD
    const usd = convertCents(10_000, "USD", "KES", rateCentsPerUsd);
    expect(usd.cents).toBe(1_295_000); // KSh 12,950

    const back = convertCents(usd.cents ?? 0, "KES", "USD", rateCentsPerUsd);
    expect(Math.abs((back.cents ?? 0) - 10_000)).toBeLessThanOrEqual(1);
  });

  test("missing rate still returns null (never fabricated)", () => {
    expect(convertCents(100, "USD", "EUR", null).cents).toBeNull();
  });

  test("same-currency conversion is identity", () => {
    expect(convertCents(5_000, "KES", "KES", null).cents).toBe(5_000);
  });
});

describe("no accidental USD conversion in Kenya Mode", () => {
  test("KES-native values pass through unchanged (no USD round-trip)", () => {
    // In Kenya Mode there is no display conversion: stored KES cents are
    // rendered as-is. convertCents with from===to must be identity, and a
    // null rate between different currencies must NOT invent a value.
    const identity = convertCents(1_000_000, "KES", "KES", null);
    expect(identity.cents).toBe(1_000_000);
    expect(identity.rate).toBe(1);

    // Without a stored USD↔KES rate, no silent USD conversion may occur.
    expect(convertCents(1_000_000, "USD", "KES", null).cents).toBeNull();
  });

  test("roadmap/milestone math operates on KES cents directly", () => {
    // Roadmap targets are stored KES cents; progress math never converts.
    const targetKesCents = 12_000_000; // KSh 120,000 Year-1 target
    const actualKesCents = 3_000_000; // KSh 30,000 recorded
    expect(progressPct(actualKesCents, targetKesCents)).toBe(25);
  });
});
