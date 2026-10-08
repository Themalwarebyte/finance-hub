// Phase 3 — Financial Intelligence. Pure forecast/scenario engine.
// All money integer cents. NOTHING here writes transactions or alters
// recorded balances: forecasts are hypothetical and clearly separated from
// verified history. Free of Convex imports so it is unit-testable.

// ---------------------------------------------------------------------------
// Generic monthly scenario engine (Stage 5)
// ---------------------------------------------------------------------------

export type OneOffEvent = {
  monthIndex: number; // 0-based
  amountCents: number; // positive
  kind: "asset_sale" | "acquisition" | "withdrawal";
};

export type ScenarioInput = {
  months: number;
  startBalanceCents: number;
  monthlyContributionCents: number;
  /** Contribution increase per year, % — linked to income growth. */
  contributionGrowthPctPerYear: number;
  /** Annual return %, may be zero or negative. */
  annualReturnPct: number;
  annualInflationPct: number;
  /** Annual fee/tax drag on the balance, %. */
  annualFeePct: number;
  /** Annual dividend/interest yield %, reinvested when flag set. */
  dividendYieldPct: number;
  reinvestDividends: boolean;
  monthlyWithdrawalCents: number;
  oneOffEvents: OneOffEvent[];
};

export type MonthRow = {
  monthIndex: number;
  balanceCents: number;
  realBalanceCents: number;
  contributionCents: number;
  returnCents: number;
  dividendCents: number;
  feeCents: number;
  withdrawalCents: number;
};

export type YearRow = {
  year: number; // 1-based
  endBalanceCents: number;
  realBalanceCents: number;
  contributionsCents: number;
  returnsCents: number;
  dividendsCents: number;
  feesCents: number;
  withdrawalsCents: number;
};

export type ScenarioResult = {
  monthly: MonthRow[];
  yearly: YearRow[];
  /** Cumulative at the end — contributions vs returns kept separate. */
  totals: {
    contributionsCents: number;
    returnsCents: number;
    dividendsCents: number;
    feesCents: number;
    withdrawalsCents: number;
    endBalanceCents: number;
    endRealBalanceCents: number;
  };
};

export const SCENARIOS = {
  conservative: { annualReturnPct: 3, annualInflationPct: 5 },
  base: { annualReturnPct: 8, annualInflationPct: 5 },
  ambitious: { annualReturnPct: 12, annualInflationPct: 5 },
} as const;
export type ScenarioKind = keyof typeof SCENARIOS;

/** Monthly rate equivalent of an annual percentage (geometric, not linear). */
export function monthlyRate(annualPct: number): number {
  return Math.pow(1 + annualPct / 100, 1 / 12) - 1;
}

export function runScenario(input: ScenarioInput): ScenarioResult {
  const r = monthlyRate(input.annualReturnPct);
  const divRate = monthlyRate(input.dividendYieldPct);
  const feeRate = monthlyRate(input.annualFeePct);

  let balance = input.startBalanceCents;
  let contributed = input.startBalanceCents; // seed capital counts as contribution
  let cumReturns = 0;
  let cumDividends = 0;
  let cumFees = 0;
  let cumWithdrawals = 0;

  const monthly: MonthRow[] = [];
  const yearly: YearRow[] = [];
  let yearContrib = 0;
  let yearReturns = 0;
  let yearDivs = 0;
  let yearFees = 0;
  let yearWith = 0;

  for (let monthIndex = 0; monthIndex < input.months; monthIndex += 1) {
    // Contribution escalates each year by the income-growth assumption.
    const yearsIn = Math.floor(monthIndex / 12);
    const contribution = Math.round(
      input.monthlyContributionCents *
        Math.pow(1 + input.contributionGrowthPctPerYear / 100, yearsIn),
    );

    const events = input.oneOffEvents.filter(
      (event) => event.monthIndex === monthIndex,
    );
    const eventOut = events
      .filter((event) => event.kind === "withdrawal")
      .reduce((sum, event) => sum + event.amountCents, 0);
    const eventIn = events
      .filter(
        (event) => event.kind === "asset_sale" || event.kind === "acquisition",
      )
      .reduce((sum, event) => sum + event.amountCents, 0);

    // Return on the balance BEFORE this month's contribution (classic
    // beginning-of-month compounding; documented).
    const returnCents = Math.round(balance * r);
    const dividendCents = Math.round(balance * divRate);
    const feeCents = Math.round(balance * feeRate);

    balance += returnCents + dividendCents - feeCents;
    balance += contribution - input.monthlyWithdrawalCents - eventOut + eventIn;
    if (balance < 0) balance = 0;

    contributed += contribution;
    cumReturns += returnCents;
    cumDividends += dividendCents;
    cumFees += feeCents;
    cumWithdrawals += input.monthlyWithdrawalCents + eventOut - eventIn;

    const yearsElapsed = (monthIndex + 1) / 12;
    const deflator = Math.pow(
      1 + input.annualInflationPct / 100,
      -yearsElapsed,
    );
    const real = Math.round(balance * deflator);

    yearContrib += contribution;
    yearReturns += returnCents;
    yearDivs += dividendCents;
    yearFees += feeCents;
    yearWith += input.monthlyWithdrawalCents + eventOut - eventIn;

    monthly.push({
      monthIndex,
      balanceCents: balance,
      realBalanceCents: real,
      contributionCents: contribution,
      returnCents,
      dividendCents,
      feeCents,
      withdrawalCents: input.monthlyWithdrawalCents + eventOut - eventIn,
    });

    if ((monthIndex + 1) % 12 === 0) {
      yearly.push({
        year: (monthIndex + 1) / 12,
        endBalanceCents: balance,
        realBalanceCents: real,
        contributionsCents: yearContrib,
        returnsCents: yearReturns,
        dividendsCents: yearDivs,
        feesCents: yearFees,
        withdrawalsCents: yearWith,
      });
      yearContrib = 0;
      yearReturns = 0;
      yearDivs = 0;
      yearFees = 0;
      yearWith = 0;
    }
  }

  return {
    monthly,
    yearly,
    totals: {
      contributionsCents: contributed,
      returnsCents: cumReturns,
      dividendsCents: cumDividends,
      feesCents: cumFees,
      withdrawalsCents: cumWithdrawals,
      endBalanceCents: balance,
      endRealBalanceCents:
        monthly[monthly.length - 1]?.realBalanceCents ?? balance,
    },
  };
}

// ---------------------------------------------------------------------------
// Stage 3 — 30-year NSE plan (Oct 2026 → Sep 2056, 360 months)
// ---------------------------------------------------------------------------

export const NSE_PLAN_MONTHS = 360;

export type NsePlanInput = {
  startBalanceCents: number;
  monthlyBudgetCents: number; // user may enter ANY amount
  contributionGrowthPctPerYear: number;
  scenario: ScenarioKind | "custom";
  customAnnualReturnPct?: number;
  customInflationPct?: number;
  annualFeePct: number; // brokerage + fund costs
  dividendYieldPct: number;
  reinvestDividends: boolean;
};

export function planNse(input: NsePlanInput): ScenarioResult {
  const preset =
    input.scenario === "custom"
      ? {
          annualReturnPct: input.customAnnualReturnPct ?? 8,
          annualInflationPct: input.customInflationPct ?? 5,
        }
      : SCENARIOS[input.scenario];
  return runScenario({
    months: NSE_PLAN_MONTHS,
    startBalanceCents: input.startBalanceCents,
    monthlyContributionCents: input.monthlyBudgetCents,
    contributionGrowthPctPerYear: input.contributionGrowthPctPerYear,
    annualReturnPct: preset.annualReturnPct,
    annualInflationPct: preset.annualInflationPct,
    annualFeePct: input.annualFeePct,
    dividendYieldPct: input.dividendYieldPct,
    reinvestDividends: input.reinvestDividends,
    monthlyWithdrawalCents: 0,
    oneOffEvents: [],
  });
}

/** Five-year checkpoints (years 5,10,15,20,25,30) from any scenario result. */
export function fiveYearCheckpoints(result: ScenarioResult): YearRow[] {
  return result.yearly.filter((row) => row.year % 5 === 0);
}

// ---------------------------------------------------------------------------
// Stage 4 — GHub 33-year master plan (Oct 2026 → Sep 2059, 396 months)
// ---------------------------------------------------------------------------

export const GHUB_PLAN_MONTHS = 396;

export type GHubVisionMilestone = {
  year: number;
  revenueCents: number | null;
  netWorthCents: number | null;
  label?: string;
};

/**
 * Initial vision targets — editable, kept strictly separate from actuals.
 * KSh amounts in cents (×100).
 */
export const GHUB_VISION_TARGETS: GHubVisionMilestone[] = [
  { year: 1, revenueCents: 12_000_000, netWorthCents: 1_500_000 },
  { year: 2, revenueCents: 48_000_000, netWorthCents: 20_500_000 },
  { year: 3, revenueCents: 180_000_000, netWorthCents: 85_000_000 },
  { year: 4, revenueCents: 360_000_000, netWorthCents: 245_000_000 },
  { year: 5, revenueCents: null, netWorthCents: 560_000_000 },
  { year: 10, revenueCents: null, netWorthCents: 4_800_000_000 },
  { year: 15, revenueCents: null, netWorthCents: 29_000_000_000 },
  { year: 18, revenueCents: null, netWorthCents: 62_000_000_000 },
  {
    year: 19,
    revenueCents: null,
    netWorthCents: null,
    label:
      "Hypothetical corporate acquisition — 70% of GHub at KSh 7.5B enterprise value, ~KSh 4.2B estimated post-tax proceeds. SPECULATIVE: never treated as guaranteed future cash.",
  },
  { year: 26, revenueCents: null, netWorthCents: 980_000_000_000 },
  { year: 33, revenueCents: null, netWorthCents: 5_629_000_000_000 },
];

export const GHUB_ACQUISITION = {
  year: 19,
  stakePct: 70,
  enterpriseValueCents: 750_000_000_000, // KSh 7.5B
  hypotheticalProceedsCents: 420_000_000_00, // KSh 4.2B post-tax (hypothetical)
} as const;

export type GHubPlanInput = {
  monthlyRevenueCents: number;
  monthlyRevenueGrowthPctPerYear: number;
  profitMarginPct: number; // net margin %
  ownerDrawPct: number; // % of profit taken out by the owner
  startBusinessEquityCents: number;
  monthlyPersonalInvestmentCents: number; // owner draws routed into investments
  scenario: ScenarioKind | "custom";
  customAnnualReturnPct?: number;
  contributionGrowthPctPerYear: number;
  annualFeePct: number;
  dividendYieldPct: number;
  startPersonalInvestmentsCents: number;
  /** If true, the hypothetical Year-19 proceeds are added in the projection. */
  applyHypotheticalAcquisition: boolean;
};

export type GHubPlanYear = {
  year: number;
  revenueCents: number;
  profitCents: number;
  retainedCents: number;
  ownerCompCents: number;
  businessEquityCents: number; // illiquid
  liquidInvestmentsCents: number; // personal investable capital
  totalWealthCents: number; // projection, NOT realized wealth
  realTotalWealthCents: number;
};

export function planGhub(input: GHubPlanInput): {
  years: GHubPlanYear[];
  personal: ScenarioResult;
  acquisition: { year: number; hypotheticalProceedsCents: number } | null;
} {
  const years: GHubPlanYear[] = [];
  const margin = input.profitMarginPct / 100;
  const drawPct = input.ownerDrawPct / 100;

  let businessEquity = input.startBusinessEquityCents;
  const applyAcq = input.applyHypotheticalAcquisition;
  const acquisition = applyAcq
    ? { year: GHUB_ACQUISITION.year, hypotheticalProceedsCents: GHUB_ACQUISITION.hypotheticalProceedsCents }
    : null;

  const annualReturnPct =
    input.scenario === "custom"
      ? input.customAnnualReturnPct ?? 8
      : SCENARIOS[input.scenario].annualReturnPct;
  const annualInflationPct = SCENARIOS.base.annualInflationPct;

  const personal = runScenario({
    months: GHUB_PLAN_MONTHS,
    startBalanceCents: input.startPersonalInvestmentsCents,
    monthlyContributionCents: input.monthlyPersonalInvestmentCents,
    contributionGrowthPctPerYear: input.contributionGrowthPctPerYear,
    annualReturnPct,
    annualInflationPct,
    annualFeePct: input.annualFeePct,
    dividendYieldPct: input.dividendYieldPct,
    reinvestDividends: true,
    monthlyWithdrawalCents: 0,
    oneOffEvents: acquisition
      ? [
          {
            monthIndex: (acquisition.year - 1) * 12,
            amountCents: acquisition.hypotheticalProceedsCents,
            kind: "acquisition",
          },
        ]
      : [],
  });

  for (let year = 1; year <= 33; year += 1) {
    const monthlyRevenue = Math.round(
      input.monthlyRevenueCents *
        Math.pow(1 + input.monthlyRevenueGrowthPctPerYear / 100, year - 1),
    );
    const revenueCents = monthlyRevenue * 12;
    const profitCents = Math.round(revenueCents * margin);
    const ownerCompCents = Math.round(profitCents * drawPct);
    const retainedCents = profitCents - ownerCompCents;
    businessEquity += retainedCents;
    if (acquisition !== null && year === acquisition.year) {
      // Tracked inside the projection only — never written to actual records.
      businessEquity += acquisition.hypotheticalProceedsCents;
    }
    const liquid = personal.yearly[year - 1]?.endBalanceCents ?? 0;
    const totalWealthCents = liquid + businessEquity;
    const deflator = Math.pow(1 + annualInflationPct / 100, -year);
    years.push({
      year,
      revenueCents,
      profitCents,
      retainedCents,
      ownerCompCents,
      businessEquityCents: businessEquity,
      liquidInvestmentsCents: liquid,
      totalWealthCents,
      realTotalWealthCents: Math.round(totalWealthCents * deflator),
    });
  }

  return { years, personal, acquisition };
}

// ---------------------------------------------------------------------------
// Stage 6 — dynamic milestones
// ---------------------------------------------------------------------------

export type MilestoneStatus = "ahead" | "on_track" | "behind";

export function milestoneProgress(
  actualCents: number,
  targetCents: number,
  elapsedMs: number,
  totalMs: number,
): {
  pct: number;
  remainingCents: number;
  timeRemainingMs: number;
  expectedPct: number;
  paceRatio: number | null;
  status: MilestoneStatus;
} {
  const pct =
    targetCents > 0
      ? Math.min(100, Math.max(0, (actualCents / targetCents) * 100))
      : 0;
  const expectedPct =
    totalMs > 0 ? Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100)) : 0;
  const remainingCents = Math.max(0, targetCents - actualCents);
  const timeRemainingMs = Math.max(0, totalMs - elapsedMs);

  const paceRatio = expectedPct > 0 ? pct / expectedPct : null;
  let status: MilestoneStatus = "on_track";
  if (paceRatio !== null) {
    if (paceRatio >= 1.1) status = "ahead";
    else if (paceRatio < 0.9) status = "behind";
  }

  return { pct, remainingCents, timeRemainingMs, expectedPct, paceRatio, status };
}

// ---------------------------------------------------------------------------
// Stage 7 — rule-based insights (NOT investment advice)
// ---------------------------------------------------------------------------

export type InsightInput = {
  portfolio: { symbol: string; marketValueCents: number }[];
  portfolioTotalCents: number;
  liquidCashCents: number;
  monthlyExpensesCents: number;
  monthlyIncomeCents: number;
  overdueInvoiceCount: number;
  monthlyRevenueNow: number;
  monthlyRevenuePrev: number;
  missedTargetCount: number;
  allocationDriftPct: number;
};

export type Insight = {
  kind: string;
  severity: "info" | "warning" | "danger";
  message: string;
};

export function deriveInsights(input: InsightInput): Insight[] {
  const insights: Insight[] = [];

  for (const holding of input.portfolio) {
    const weight =
      input.portfolioTotalCents > 0
        ? (holding.marketValueCents / input.portfolioTotalCents) * 100
        : 0;
    if (weight > 40) {
      insights.push({
        kind: "concentration",
        severity: "warning",
        message: `${holding.symbol} is ${weight.toFixed(0)}% of your portfolio — consider whether that concentration matches your risk preference.`,
      });
    }
  }

  if (
    input.monthlyExpensesCents > 0 &&
    input.liquidCashCents < input.monthlyExpensesCents * 3
  ) {
    insights.push({
      kind: "cash_reserves",
      severity: "danger",
      message:
        "Liquid cash is below 3 months of expenses — a thin emergency buffer.",
    });
  }

  if (
    input.monthlyIncomeCents > 0 &&
    input.monthlyExpensesCents > input.monthlyIncomeCents * 0.9
  ) {
    insights.push({
      kind: "savings_requirement",
      severity: "warning",
      message:
        "Expenses consume over 90% of income — current goals may need a longer horizon or higher income.",
    });
  }

  if (input.overdueInvoiceCount > 0) {
    insights.push({
      kind: "overdue_invoices",
      severity: "warning",
      message: `${input.overdueInvoiceCount} business invoice(s) are overdue — follow up on collections.`,
    });
  }

  if (
    input.monthlyRevenuePrev > 0 &&
    input.monthlyRevenueNow < input.monthlyRevenuePrev * 0.8
  ) {
    insights.push({
      kind: "cash_flow",
      severity: "warning",
      message:
        "Business revenue this month is over 20% below last month — cash flow is falling.",
    });
  }

  if (input.missedTargetCount > 0) {
    insights.push({
      kind: "missed_targets",
      severity: "info",
      message: `${input.missedTargetCount} milestone(s) are behind their pace.`,
    });
  }

  if (input.allocationDriftPct > 10) {
    insights.push({
      kind: "allocation_drift",
      severity: "info",
      message: `An allocation has drifted ${input.allocationDriftPct.toFixed(0)}pp from target — review your cycle weights.`,
    });
  }

  return insights;
}
