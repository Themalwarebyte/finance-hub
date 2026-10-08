import { describe, expect, test } from "bun:test";
import {
  allocatePayment,
  consolidatedExpensesCents,
  consolidatedIncomeCents,
  consolidatedNetCents,
  effectiveInvoiceStatus,
  expectedPct,
  isInternalTransfer,
  operatingExpensesCents,
  pipelineValue,
  progressPct,
  projectedEnd,
  quarterIndex,
  QUARTERLY_TARGETS,
  receivablesCents,
  runwayMonths,
  stageIsOpen,
  INITIAL_TARGETS,
  ROADMAP_END,
  ROADMAP_START,
} from "./business";
import { amortize, monthsToPayoff, resolvePeriod, totalInterest } from "@/convex/periods";

// ---------------------------------------------------------------------------
// Integer-cent arithmetic
// ---------------------------------------------------------------------------

describe("integer-cent arithmetic", () => {
  test("payment allocation never exceeds the outstanding balance", () => {
    // Invoice of KSh 1,000.00 (100_000 cents), pay 30_000, 30_000, then
    // exactly the remainder in whole cents.
    const first = allocatePayment(100_000, 0, 30_000);
    expect(first.applied).toBe(30_000);
    expect(first.status).toBe("partially_paid");

    const second = allocatePayment(100_000, first.afterPaid, 30_000);
    expect(second.afterPaid).toBe(60_000);
    expect(second.status).toBe("partially_paid");

    const third = allocatePayment(100_000, second.afterPaid, 40_000);
    expect(third.afterPaid).toBe(100_000);
    expect(third.status).toBe("paid");
  });

  test("over-payment is detected for rejection (outstanding < payment)", () => {
    const result = allocatePayment(100_000, 90_000, 20_000);
    expect(result.applied).toBe(10_000); // capped at outstanding
    expect(result.applied).toBeLessThan(20_000);
  });

  test("progress stays clamped 0..100", () => {
    expect(progressPct(50_000, 1_200_000)).toBeCloseTo(4.166666, 5);
    expect(progressPct(9_999_999, 1_200_000)).toBe(100);
    expect(progressPct(0, 1_200_000)).toBe(0);
    expect(progressPct(100, 0)).toBe(0);
  });

  test("receivables only count unpaid non-draft invoices", () => {
    const receivables = receivablesCents([
      { amountCents: 10_000, paidCents: 0, status: "issued" },
      { amountCents: 10_000, paidCents: 4_000, status: "partially_paid" },
      { amountCents: 10_000, paidCents: 10_000, status: "paid" },
      { amountCents: 10_000, paidCents: 0, status: "draft" },
      { amountCents: 10_000, paidCents: 0, status: "overdue" },
    ]);
    expect(receivables).toBe(10_000 + 6_000 + 10_000);
  });

  test("effectiveInvoiceStatus handles overdue and partial", () => {
    const now = 1_000_000;
    expect(effectiveInvoiceStatus("issued", 1000, 0, now - 1, now)).toBe("overdue");
    expect(effectiveInvoiceStatus("issued", 1000, 0, now + 1, now)).toBe("issued");
    expect(effectiveInvoiceStatus("issued", 1000, 500, now + 1, now)).toBe("partially_paid");
    expect(effectiveInvoiceStatus("issued", 1000, 1000, now + 1, now)).toBe("paid");
    expect(effectiveInvoiceStatus("draft", 1000, 0, now - 1, now)).toBe("draft");
  });

  test("runway is cash divided by monthly burn", () => {
    expect(runwayMonths(600_000, 100_000)).toBe(6);
    expect(runwayMonths(0, 100_000)).toBe(0);
    expect(runwayMonths(600_000, 0)).toBe(Number.POSITIVE_INFINITY);
  });
});

// ---------------------------------------------------------------------------
// Consolidated view: transfers must not double count
// ---------------------------------------------------------------------------

describe("consolidated dedup rules", () => {
  test("transfers are excluded from income and expenses", () => {
    const txns = [
      { direction: "in", amount: 100_000, category: "Salary" },
      { direction: "out", amount: 20_000, category: "Groceries" },
      { direction: "transfer", amount: 5_000, transferAccountId: "acct2", category: "Transfer" },
    ];
    expect(consolidatedIncomeCents(txns)).toBe(100_000);
    expect(consolidatedExpensesCents(txns)).toBe(20_000);
    expect(consolidatedNetCents(txns)).toBe(80_000);
  });

  test("owner drawings/capital are not consumption", () => {
    const txns = [
      { direction: "out", amount: 10_000, category: "Owner Drawings" },
      { direction: "in", amount: 30_000, category: "Owner Capital" },
    ];
    expect(consolidatedExpensesCents(txns)).toBe(0);
    expect(consolidatedNetCents(txns)).toBe(30_000);
  });

  test("isInternalTransfer requires a counterpart account", () => {
    expect(isInternalTransfer("transfer", "acct9")).toBe(true);
    expect(isInternalTransfer("transfer", null)).toBe(false);
    expect(isInternalTransfer("in", null)).toBe(false);
  });

  test("operating expenses exclude owner movements", () => {
    const txns = [
      { direction: "out", amount: 5_000, category: "Rent" },
      { direction: "out", amount: 2_000, category: "Owner Drawings" },
      { direction: "out", amount: 1_000, category: "Owner Capital" },
    ];
    expect(operatingExpensesCents(txns)).toBe(5_000);
  });
});

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------

describe("milestone math", () => {
  test("roadmap window is Oct 2026 through Sep 2027", () => {
    expect(new Date(ROADMAP_START).getUTCFullYear()).toBe(2026);
    expect(new Date(ROADMAP_START).getUTCMonth()).toBe(9);
    expect(new Date(ROADMAP_END).getUTCFullYear()).toBe(2027);
    expect(new Date(ROADMAP_END).getUTCMonth()).toBe(8);
  });

  test("Year 1 targets match the specification", () => {
    expect(INITIAL_TARGETS.annualRevenueCents).toBe(12_000_000); // KSh 120,000
    expect(INITIAL_TARGETS.mmfContributionsCents).toBe(1_200_000); // KSh 12,000
    expect(INITIAL_TARGETS.yearEndNetWorthCents).toBe(1_500_000); // KSh 15,000
    expect(INITIAL_TARGETS.monthlyRecurringRevenueCents).toBe(600_000); // KSh 6,000
    expect(QUARTERLY_TARGETS).toEqual([1_000_000, 2_000_000, 3_500_000, 5_500_000]);
  });

  test("quarterIndex maps dates across the roadmap year", () => {
    expect(quarterIndex(ROADMAP_START + 1, ROADMAP_START)).toBe(1);
    expect(quarterIndex(ROADMAP_END, ROADMAP_START)).toBe(4);
    expect(quarterIndex(ROADMAP_START - 1, ROADMAP_START)).toBe(1);
  });

  test("expected pace is linear", () => {
    expect(expectedPct(0, 100)).toBe(0);
    expect(expectedPct(50, 100)).toBe(50);
    expect(expectedPct(150, 100)).toBe(100);
  });

  test("projected end is linear run-rate, never speculative", () => {
    // 10,000 earned in the first 10% of the year -> 100,000 projected.
    const total = 365 * 86_400_000;
    expect(projectedEnd(10_000, total * 0.1, total)).toBe(100_000);
  });
});

// ---------------------------------------------------------------------------
// Pipeline stages
// ---------------------------------------------------------------------------

describe("sales pipeline", () => {
  test("only open stages count toward pipeline value", () => {
    const leads = [
      { stage: "New", estimatedValueCents: 10_000 },
      { stage: "Proposal", estimatedValueCents: 20_000 },
      { stage: "Won", estimatedValueCents: 99_000 },
      { stage: "Lost", estimatedValueCents: 50_000 },
    ];
    expect(pipelineValue(leads)).toBe(30_000);
    expect(stageIsOpen("Negotiation")).toBe(true);
    expect(stageIsOpen("Won")).toBe(false);
    expect(stageIsOpen("Lost")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Existing household math keeps working (regression guard)
// ---------------------------------------------------------------------------

describe("household finance regressions", () => {
  test("amortisation schedule is exact for a standard loan", () => {
    // 100,000 cents at 12%/yr, paying 10,000/month.
    const schedule = amortize(100_000, 12, 10_000);
    expect(schedule.length).toBe(11);
    const interest = totalInterest(schedule);
    expect(interest).toBeGreaterThan(0);
    expect(schedule[schedule.length - 1].balance).toBe(0);
    expect(monthsToPayoff(100_000, 12, 10_000)).toBe(11);
  });

  test("period resolver yields this-month and last-month windows", () => {
    const now = new Date(2026, 9, 15).getTime(); // Oct 15 2026
    const thisMonth = resolvePeriod("this_month", now);
    expect(new Date(thisMonth.start).getMonth()).toBe(9);
    expect(new Date(thisMonth.start).getDate()).toBe(1);
    const lastMonth = resolvePeriod("last_month", now);
    expect(new Date(lastMonth.start).getMonth()).toBe(8);
  });
});
