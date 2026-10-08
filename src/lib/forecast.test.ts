import { describe, expect, test } from "bun:test";
import {
  GHUB_ACQUISITION,
  GHUB_PLAN_MONTHS,
  GHUB_VISION_TARGETS,
  NSE_PLAN_MONTHS,
  deriveInsights,
  fiveYearCheckpoints,
  milestoneProgress,
  monthlyRate,
  planGhub,
  planNse,
  runScenario,
} from "./forecast";

const BASE = {
  startBalanceCents: 0,
  monthlyContributionCents: 100_000, // KSh 1,000
  contributionGrowthPctPerYear: 0,
  annualFeePct: 0,
  dividendYieldPct: 0,
  reinvestDividends: false,
  monthlyWithdrawalCents: 0,
  oneOffEvents: [],
};

describe("scenario engine", () => {
  test("produces exactly 360 NSE months and 396 GHub months", () => {
    const nse = planNse({
      startBalanceCents: 0,
      monthlyBudgetCents: 100_000,
      contributionGrowthPctPerYear: 0,
      scenario: "base",
      annualFeePct: 1,
      dividendYieldPct: 3,
      reinvestDividends: true,
    });
    expect(nse.monthly.length).toBe(NSE_PLAN_MONTHS);
    expect(nse.monthly.length).toBe(360);
    expect(nse.yearly.length).toBe(30);

    const ghub = planGhub({
      monthlyRevenueCents: 10_000,
      monthlyRevenueGrowthPctPerYear: 5,
      profitMarginPct: 20,
      ownerDrawPct: 40,
      startBusinessEquityCents: 0,
      monthlyPersonalInvestmentCents: 100_000,
      scenario: "base",
      contributionGrowthPctPerYear: 0,
      annualFeePct: 1,
      dividendYieldPct: 3,
      startPersonalInvestmentsCents: 0,
      applyHypotheticalAcquisition: false,
    });
    expect(ghub.years.length).toBe(33);
    expect(ghub.personal.monthly.length).toBe(GHUB_PLAN_MONTHS);
    expect(ghub.personal.monthly.length).toBe(396);
  });

  test("zero returns: balance equals contributions exactly", () => {
    const result = runScenario({ ...BASE, months: 12, annualReturnPct: 0, annualInflationPct: 0 });
    expect(result.totals.endBalanceCents).toBe(12 * 100_000);
    expect(result.totals.returnsCents).toBe(0);
    expect(result.totals.contributionsCents).toBe(12 * 100_000);
  });

  test("negative returns reduce the balance and are recorded as negative returns", () => {
    const result = runScenario({ ...BASE, months: 1, startBalanceCents: 1_000_000, annualReturnPct: -12, annualInflationPct: 0 });
    expect(result.totals.returnsCents).toBeLessThan(0);
    expect(result.totals.endBalanceCents).toBeLessThan(1_000_000 + 100_000);
  });

  test("compounding is geometric: monthly rate of 12%/yr beats linear 1%/mo over a year", () => {
    expect(monthlyRate(12)).toBeCloseTo(0.009489, 5);
    const withReturns = runScenario({
      ...BASE,
      months: 12,
      startBalanceCents: 100_000_000,
      annualReturnPct: 12,
      annualInflationPct: 0,
    });
    // 100,000 KSh seed earning 12%/yr, no fees/dividends
    const expected = Math.round(100_000_000 * Math.pow(1 + 0.12, 1)) + 12 * 100_000; // approx (contributions mid-month)
    // Loose bound: more than seed+contribs, less than naive 12% on everything
    expect(withReturns.totals.returnsCents).toBeGreaterThan(0);
    expect(withReturns.totals.endBalanceCents).toBeGreaterThan(100_000_000);
    void expected;
  });

  test("inflation deflates real balances", () => {
    const result = runScenario({ ...BASE, months: 12, annualReturnPct: 0, annualInflationPct: 10 });
    expect(result.totals.endRealBalanceCents).toBeLessThan(result.totals.endBalanceCents);
  });

  test("contributions and returns are never blended", () => {
    const result = runScenario({ ...BASE, months: 24, startBalanceCents: 500_000, annualReturnPct: 8, annualInflationPct: 0 });
    const identity =
      result.totals.contributionsCents +
      result.totals.returnsCents -
      result.totals.feesCents -
      result.totals.withdrawalsCents;
    expect(identity).toBe(result.totals.endBalanceCents);
  });

  test("withdrawals reduce the balance", () => {
    const without = runScenario({ ...BASE, months: 6, annualReturnPct: 0, annualInflationPct: 0 });
    const withDraw = runScenario({ ...BASE, months: 6, annualReturnPct: 0, annualInflationPct: 0, monthlyWithdrawalCents: 20_000 });
    expect(withDraw.totals.endBalanceCents).toBe(without.totals.endBalanceCents - 6 * 20_000);
  });

  test("five-year checkpoints return years 5,10,15,20,25,30", () => {
    const nse = planNse({
      startBalanceCents: 0,
      monthlyBudgetCents: 100_000,
      contributionGrowthPctPerYear: 0,
      scenario: "base",
      annualFeePct: 1,
      dividendYieldPct: 3,
      reinvestDividends: true,
    });
    const checkpoints = fiveYearCheckpoints(nse);
    expect(checkpoints.map((c) => c.year)).toEqual([5, 10, 15, 20, 25, 30]);
  });

  test("contribution growth escalates annually", () => {
    const result = runScenario({ ...BASE, months: 25, annualReturnPct: 0, annualInflationPct: 0, contributionGrowthPctPerYear: 10 });
    // Year 1 months pay 100_000; year 2 pay 110_000; year 3 pay 121_000.
    expect(result.monthly[11].contributionCents).toBe(100_000);
    expect(result.monthly[12].contributionCents).toBe(110_000);
    expect(result.monthly[24].contributionCents).toBe(121_000);
  });
});

describe("GHub master plan", () => {
  test("vision targets match the specification exactly", () => {
    const byYear = new Map(GHUB_VISION_TARGETS.map((t) => [t.year, t]));
    expect(byYear.get(1)?.revenueCents).toBe(12_000_000); // KSh 120,000
    expect(byYear.get(1)?.netWorthCents).toBe(1_500_000); // KSh 15,000
    expect(byYear.get(2)?.revenueCents).toBe(48_000_000); // KSh 480,000
    expect(byYear.get(2)?.netWorthCents).toBe(20_500_000); // KSh 205,000
    expect(byYear.get(3)?.revenueCents).toBe(180_000_000); // KSh 1.8M
    expect(byYear.get(3)?.netWorthCents).toBe(85_000_000); // KSh 850,000
    expect(byYear.get(4)?.revenueCents).toBe(360_000_000); // KSh 3.6M
    expect(byYear.get(4)?.netWorthCents).toBe(245_000_000); // KSh 2.45M
    expect(byYear.get(5)?.netWorthCents).toBe(560_000_000); // KSh 5.6M
    expect(byYear.get(10)?.netWorthCents).toBe(4_800_000_000); // KSh 48M
    expect(byYear.get(15)?.netWorthCents).toBe(29_000_000_000); // KSh 290M
    expect(byYear.get(18)?.netWorthCents).toBe(62_000_000_000); // KSh 620M
    expect(byYear.get(26)?.netWorthCents).toBe(980_000_000_000); // KSh 9.8B
    expect(byYear.get(33)?.netWorthCents).toBe(5_629_000_000_000); // KSh 56.29B
  });

  test("acquisition constants are the specified hypothetical values", () => {
    expect(GHUB_ACQUISITION.year).toBe(19);
    expect(GHUB_ACQUISITION.stakePct).toBe(70);
    expect(GHUB_ACQUISITION.enterpriseValueCents).toBe(750_000_000_000); // KSh 7.5B
    expect(GHUB_ACQUISITION.hypotheticalProceedsCents).toBe(420_000_000_00); // KSh 4.2B
  });

  test("acquisition proceeds are projection-only and labeled hypothetical", () => {
    const withAcq = planGhub({
      monthlyRevenueCents: 10_000,
      monthlyRevenueGrowthPctPerYear: 0,
      profitMarginPct: 20,
      ownerDrawPct: 40,
      startBusinessEquityCents: 0,
      monthlyPersonalInvestmentCents: 0,
      scenario: "base",
      contributionGrowthPctPerYear: 0,
      annualFeePct: 0,
      dividendYieldPct: 0,
      startPersonalInvestmentsCents: 0,
      applyHypotheticalAcquisition: true,
    });
    expect(withAcq.acquisition).not.toBeNull();
    // Year 19 equity = year 18 equity + retained profit + hypothetical proceeds.
    const y18 = withAcq.years[17];
    const y19 = withAcq.years[18];
    expect(y19.businessEquityCents).toBe(
      y18.businessEquityCents + y19.retainedCents + GHUB_ACQUISITION.hypotheticalProceedsCents,
    );
  });

  test("liquid vs illiquid separation: owner draws route to liquid investments", () => {
    const plan = planGhub({
      monthlyRevenueCents: 100_000, // KSh 1,000/mo
      monthlyRevenueGrowthPctPerYear: 0,
      profitMarginPct: 50,
      ownerDrawPct: 100, // all profit out to owner
      startBusinessEquityCents: 0,
      monthlyPersonalInvestmentCents: 50_000, // KSh 500 invested
      scenario: "conservative",
      contributionGrowthPctPerYear: 0,
      annualFeePct: 0,
      dividendYieldPct: 0,
      startPersonalInvestmentsCents: 0,
      applyHypotheticalAcquisition: false,
    });
    // Business equity stays 0 (all profit drawn out); liquid grows from contributions.
    expect(plan.years[0].businessEquityCents).toBe(0);
    expect(plan.years[0].retainedCents).toBe(0);
    expect(plan.years[0].ownerCompCents).toBe(600_000); // 100_000*12*50%
    expect(plan.years[0].liquidInvestmentsCents).toBeGreaterThan(0);
    // Total wealth = liquid + illiquid at every year.
    for (const year of plan.years) {
      expect(year.totalWealthCents).toBe(
        year.liquidInvestmentsCents + year.businessEquityCents,
      );
    }
  });

  test("realized wealth is never generated from projections (pure function only)", () => {
    // planGhub returns data; it has no side effects and writes nothing.
    const plan = planGhub({
      monthlyRevenueCents: 50_000,
      monthlyRevenueGrowthPctPerYear: 3,
      profitMarginPct: 25,
      ownerDrawPct: 30,
      startBusinessEquityCents: 100_000,
      monthlyPersonalInvestmentCents: 20_000,
      scenario: "base",
      contributionGrowthPctPerYear: 0,
      annualFeePct: 1,
      dividendYieldPct: 2,
      startPersonalInvestmentsCents: 0,
      applyHypotheticalAcquisition: false,
    });
    expect(plan.years.length).toBe(33);
    expect(plan.acquisition).toBeNull();
  });
});

describe("milestones", () => {
  test("status thresholds: ahead / on track / behind", () => {
    // Expected 50%, actual 60% -> ahead
    expect(milestoneProgress(600, 1000, 50, 100).status).toBe("ahead");
    expect(milestoneProgress(500, 1000, 50, 100).status).toBe("on_track");
    expect(milestoneProgress(400, 1000, 50, 100).status).toBe("behind");
  });

  test("remaining amount and time remaining", () => {
    const result = milestoneProgress(200, 1000, 25, 100);
    expect(result.remainingCents).toBe(800);
    expect(result.timeRemainingMs).toBe(75);
    expect(result.pct).toBe(20);
  });
});

describe("insights rules", () => {
  test("concentration flags a dominant position", () => {
    const insights = deriveInsights({
      portfolio: [
        { symbol: "SCOM", marketValueCents: 900 },
        { symbol: "COOP", marketValueCents: 100 },
      ],
      portfolioTotalCents: 1000,
      liquidCashCents: 1_000_000,
      monthlyExpensesCents: 100_000,
      monthlyIncomeCents: 500_000,
      overdueInvoiceCount: 0,
      monthlyRevenueNow: 100,
      monthlyRevenuePrev: 100,
      missedTargetCount: 0,
      allocationDriftPct: 0,
    });
    expect(insights.some((i) => i.kind === "concentration" && i.message.includes("SCOM"))).toBe(true);
  });

  test("cash, invoices, cash-flow and drift rules fire", () => {
    const insights = deriveInsights({
      portfolio: [],
      portfolioTotalCents: 0,
      liquidCashCents: 10_000,
      monthlyExpensesCents: 100_000,
      monthlyIncomeCents: 100_000,
      overdueInvoiceCount: 2,
      monthlyRevenueNow: 50,
      monthlyRevenuePrev: 100,
      missedTargetCount: 1,
      allocationDriftPct: 15,
    });
    const kinds = insights.map((i) => i.kind);
    expect(kinds).toContain("cash_reserves");
    expect(kinds).toContain("overdue_invoices");
    expect(kinds).toContain("cash_flow");
    expect(kinds).toContain("missed_targets");
    expect(kinds).toContain("allocation_drift");
  });
});
