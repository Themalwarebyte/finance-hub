import { describe, expect, test } from "bun:test";
import {
  allocatePayment,
  consolidatedExpensesCents,
  consolidatedIncomeCents,
  operatingExpensesCents,
} from "./business";
import {
  Q,
  averageCostPerUnit,
  buyLot,
  formatQty,
  govSecuritiesAccruedCents,
  parseQty,
  planMonth,
  portfolioTotals,
  sellFifo,
  splitByPct,
  unrealizedCents,
  validateCyclePcts,
  valueOf,
} from "./investing";

// ---------------------------------------------------------------------------
// Fixed-point precision
// ---------------------------------------------------------------------------

describe("fixed-point quantities", () => {
  test("parseQty handles whole and fractional units", () => {
    expect(parseQty("17")).toBe(17 * Q);
    expect(parseQty("0.5")).toBe(500_000);
    expect(parseQty("1.234567")).toBe(1_234_567);
    expect(parseQty("0.0000001")).toBeNull(); // more than 6dp
    expect(parseQty("abc")).toBeNull();
    expect(parseQty("0")).toBeNull();
  });

  test("formatQty round-trips parseQty", () => {
    for (const input of ["17", "0.5", "12.345678"]) {
      const parsed = parseQty(input);
      if (parsed === null) {
        expect(formatQty(0)).toBeDefined();
      } else {
        expect(formatQty(parsed)).toBe(input.replace(/0+$/, "").replace(/\.$/, "") || input);
      }
    }
    expect(formatQty(3 * Q)).toBe("3");
    expect(formatQty(500_000)).toBe("0.5");
  });

  test("valueOf is exact in cents for whole and fractional units", () => {
    expect(valueOf(1500, 17 * Q)).toBe(25_500); // KSh 255.00
    expect(valueOf(1500, 500_000)).toBe(750); // half a unit
  });

  test("splitByPct sums exactly to the total", () => {
    const parts = splitByPct(1_000_003, [5500, 2500, 2000]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(1_000_003);
    expect(() => splitByPct(100, [5000, 4000])).toThrow(); // not 10000 bps
  });
});

// ---------------------------------------------------------------------------
// FIFO cost basis, realized/unrealized
// ---------------------------------------------------------------------------

describe("FIFO cost basis", () => {
  test("sells consume the oldest lot first", () => {
    let lots: { qtyMicro: number; costCents: number }[] = [];
    lots = buyLot(lots, 10 * Q, 10_000); // 10 @ 1000c
    lots = buyLot(lots, 10 * Q, 20_000); // 10 @ 2000c
    const result = sellFifo(lots, 12 * Q, 30_000); // sell 12 @ ~2500c avg proceeds
    // matched cost: 10_000 (first lot) + 2/10 of 20_000 = 4_000
    expect(result.matchedCostCents).toBe(14_000);
    expect(result.realizedCents).toBe(30_000 - 14_000);
    // remaining lot: 8 units @ 2000c total
    expect(result.lots).toEqual([{ qtyMicro: 8 * Q, costCents: 16_000 }]);
  });

  test("selling more than held is rejected", () => {
    const lots = buyLot([], 5 * Q, 5_000);
    expect(() => sellFifo(lots, 6 * Q, 6_000)).toThrow();
  });

  test("average cost and unrealized gain", () => {
    let lots: { qtyMicro: number; costCents: number }[] = [];
    lots = buyLot(lots, 3 * Q, 3_000);
    lots = buyLot(lots, 2 * Q, 4_000);
    expect(averageCostPerUnit(lots)).toBe(1_400); // 7000c / 5 units
    const unrealized = unrealizedCents(lots, 1_600);
    expect(unrealized?.marketCents).toBe(8_000);
    expect(unrealized?.gainCents).toBe(1_000);
  });
});

// ---------------------------------------------------------------------------
// Valuation — no double counting of brokerage cash
// ---------------------------------------------------------------------------

describe("portfolio valuation", () => {
  test("totals only count holdings; unknown prices are flagged not guessed", () => {
    const totals = portfolioTotals([
      { qtyMicro: 3 * Q, priceCents: 1_000, costCents: 2_400 },
      { qtyMicro: 10 * Q, priceCents: null, costCents: 5_000 },
      { qtyMicro: 0, priceCents: 999, costCents: 0 },
    ]);
    expect(totals.marketValueCents).toBe(3_000);
    expect(totals.unknownPriceCount).toBe(1);
    expect(totals.costBasisCents).toBe(7_400);
  });
});

// ---------------------------------------------------------------------------
// Allocation planner
// ---------------------------------------------------------------------------

describe("monthly allocation planner", () => {
  const targetsA = [
    { securityId: "smwf", name: "SMWF", pct: 55, priceCents: 10_000, feeCents: 100 },
    { securityId: "scom", name: "SCOM", pct: 25, priceCents: 1_500, feeCents: 100 },
    { securityId: "ken", name: "KenGen", pct: 20, priceCents: 500, feeCents: 100 },
  ];

  test("cycle percentages total exactly 100", () => {
    expect(validateCyclePcts([
      { label: "A", pcts: [55, 25, 20] },
      { label: "B", pcts: [35, 20, 20, 25] },
      { label: "C", pcts: [50, 25, 20, 5] },
    ])).toBe(true);
    expect(validateCyclePcts([{ label: "X", pcts: [50, 40] }])).toBe(false);
  });

  test("allocates by percentage and buys only whole shares", () => {
    // Budget 10_000c + 0 carried
    const plan = planMonth(10_000, 0, targetsA);
    const smwf = plan.lines.find((l) => l.name === "SMWF");
    const scom = plan.lines.find((l) => l.name === "SCOM");
    expect(smwf?.allocatedCents).toBe(5_500);
    expect(scom?.allocatedCents).toBe(2_500);
    // SMWF: 10_000+100 = 10_100c per share -> 0 affordable from 5_500
    expect(smwf?.wholeShares).toBe(0);
    // SCOM: 1_600 per share -> 1 share (1_600 <= 2_500)
    expect(scom?.wholeShares).toBe(1);
    expect(plan.remainingCents).toBe(10_000 - plan.spentCents);
  });

  test("unaffordable allocations carry forward; plan never over-spends", () => {
    const plan = planMonth(2_000, 0, targetsA);
    // KenGen 500+100=600 -> 400c alloc (20%) buys 0... actually 400/600 = 0
    expect(plan.spentCents).toBeLessThanOrEqual(2_000);
    expect(plan.remainingCents).toBe(2_000 - plan.spentCents);
    // carry = remaining
    const next = planMonth(2_000, plan.remainingCents, targetsA);
    expect(next.spentCents).toBeLessThanOrEqual(2_000 + plan.remainingCents);
  });

  test("unknown prices are flagged unallocated, never guessed", () => {
    const plan = planMonth(10_000, 0, [
      { securityId: "x", name: "X", pct: 100, priceCents: null, feeCents: 0 },
    ]);
    expect(plan.unallocatedCents).toBe(10_000);
    expect(plan.spentCents).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Government securities
// ---------------------------------------------------------------------------

describe("government securities accrual", () => {
  const start = Date.UTC(2026, 9, 1);
  const end = Date.UTC(2027, 9, 1);
  const sec = {
    purchaseCents: 90_000,
    maturityValueCents: 100_000,
    couponPerYearPct: null,
    purchaseDate: start,
    maturityDate: end,
  };

  test("straight-line actual accrual, no hypothetical rates", () => {
    expect(govSecuritiesAccruedCents(sec, start)).toBe(0);
    expect(govSecuritiesAccruedCents(sec, end)).toBe(10_000);
    const mid = start + Math.floor((end - start) / 2);
    expect(govSecuritiesAccruedCents(sec, mid)).toBe(5_000);
  });
});

// ---------------------------------------------------------------------------
// Phase-1 regressions (household + business math intact)
// ---------------------------------------------------------------------------

describe("phase-1 regressions", () => {
  test("invoice allocation still exact", () => {
    expect(allocatePayment(100_000, 0, 30_000).status).toBe("partially_paid");
  });

  test("transfer/owner categories still excluded from consolidated flows", () => {
    expect(
      consolidatedExpensesCents([
        { direction: "out", amount: 1_000, category: "Owner Drawings" },
        { direction: "in", amount: 2_000, category: "Owner Capital" },
      ]),
    ).toBe(0);
    expect(consolidatedIncomeCents([{ direction: "in", amount: 500, category: "Salary" }])).toBe(500);
  });

  test("operating expenses still exclude owner movements", () => {
    expect(
      operatingExpensesCents([
        { direction: "out", amount: 700, category: "Rent" },
        { direction: "out", amount: 300, category: "Owner Drawings" },
      ]),
    ).toBe(700);
  });
});

// ---------------------------------------------------------------------------
// Access-control guard contract (pure mirror of server checks)
// ---------------------------------------------------------------------------

describe("access guard contract", () => {
  type Row = { householdId?: string; businessId?: string };
  function assertOwns(row: Row | null, scope: string, field: "householdId" | "businessId") {
    if (!row || row[field] !== scope) throw new Error("Not found in this workspace.");
  }

  test("cross-workspace rows are rejected", () => {
    expect(() => assertOwns({ householdId: "h1" }, "h2", "householdId")).toThrow();
    expect(() => assertOwns({ businessId: "b1" }, "b2", "businessId")).toThrow();
    expect(() => assertOwns(null, "h1", "householdId")).toThrow();
    expect(() => assertOwns({ householdId: "h1" }, "h1", "householdId")).not.toThrow();
  });
});
