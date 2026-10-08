// Phase 3 — Financial Intelligence. Pure forecast/scenario engine.
// All money integer cents. NOTHING here writes transactions or alters
// recorded balances: forecasts are hypothetical and clearly separated from
// verified history. Free of Convex imports so it is unit-testable.
export const SCENARIOS = {
    conservative: { annualReturnPct: 3, annualInflationPct: 5 },
    base: { annualReturnPct: 8, annualInflationPct: 5 },
    ambitious: { annualReturnPct: 12, annualInflationPct: 5 },
};
/** Monthly rate equivalent of an annual percentage (geometric, not linear). */
export function monthlyRate(annualPct) {
    return Math.pow(1 + annualPct / 100, 1 / 12) - 1;
}
export function runScenario(input) {
    const r = monthlyRate(input.annualReturnPct);
    const divRate = monthlyRate(input.dividendYieldPct);
    const feeRate = monthlyRate(input.annualFeePct);
    let balance = input.startBalanceCents;
    let contributed = input.startBalanceCents; // seed capital counts as contribution
    let cumReturns = 0;
    let cumDividends = 0;
    let cumFees = 0;
    let cumWithdrawals = 0;
    const monthly = [];
    const yearly = [];
    let yearContrib = 0;
    let yearReturns = 0;
    let yearDivs = 0;
    let yearFees = 0;
    let yearWith = 0;
    for (let monthIndex = 0; monthIndex < input.months; monthIndex += 1) {
        // Contribution escalates each year by the income-growth assumption.
        const yearsIn = Math.floor(monthIndex / 12);
        const contribution = Math.round(input.monthlyContributionCents *
            Math.pow(1 + input.contributionGrowthPctPerYear / 100, yearsIn));
        const events = input.oneOffEvents.filter((event) => event.monthIndex === monthIndex);
        const eventOut = events
            .filter((event) => event.kind === "withdrawal")
            .reduce((sum, event) => sum + event.amountCents, 0);
        const eventIn = events
            .filter((event) => event.kind === "asset_sale" || event.kind === "acquisition")
            .reduce((sum, event) => sum + event.amountCents, 0);
        // Return on the balance BEFORE this month's contribution (classic
        // beginning-of-month compounding; documented).
        const returnCents = Math.round(balance * r);
        const dividendCents = Math.round(balance * divRate);
        const feeCents = Math.round(balance * feeRate);
        balance += returnCents + dividendCents - feeCents;
        balance += contribution - input.monthlyWithdrawalCents - eventOut + eventIn;
        if (balance < 0)
            balance = 0;
        contributed += contribution;
        cumReturns += returnCents;
        cumDividends += dividendCents;
        cumFees += feeCents;
        cumWithdrawals += input.monthlyWithdrawalCents + eventOut - eventIn;
        const yearsElapsed = (monthIndex + 1) / 12;
        const deflator = Math.pow(1 + input.annualInflationPct / 100, -yearsElapsed);
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
            endRealBalanceCents: monthly[monthly.length - 1]?.realBalanceCents ?? balance,
        },
    };
}
// ---------------------------------------------------------------------------
// Stage 3 — 30-year NSE plan (Oct 2026 → Sep 2056, 360 months)
// ---------------------------------------------------------------------------
export const NSE_PLAN_MONTHS = 360;
export function planNse(input) {
    const preset = input.scenario === "custom"
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
export function fiveYearCheckpoints(result) {
    return result.yearly.filter((row) => row.year % 5 === 0);
}
// ---------------------------------------------------------------------------
// Stage 4 — GHub 33-year master plan (Oct 2026 → Sep 2059, 396 months)
// ---------------------------------------------------------------------------
export const GHUB_PLAN_MONTHS = 396;
/**
 * Initial vision targets — editable, kept strictly separate from actuals.
 * KSh amounts in cents (×100).
 */
export const GHUB_VISION_TARGETS = [
    { year: 1, revenueCents: 12000000, netWorthCents: 1500000 },
    { year: 2, revenueCents: 48000000, netWorthCents: 20500000 },
    { year: 3, revenueCents: 180000000, netWorthCents: 85000000 },
    { year: 4, revenueCents: 360000000, netWorthCents: 245000000 },
    { year: 5, revenueCents: null, netWorthCents: 560000000 },
    { year: 10, revenueCents: null, netWorthCents: 4800000000 },
    { year: 15, revenueCents: null, netWorthCents: 29000000000 },
    { year: 18, revenueCents: null, netWorthCents: 62000000000 },
    {
        year: 19,
        revenueCents: null,
        netWorthCents: null,
        label: "Hypothetical corporate acquisition — 70% of GHub at KSh 7.5B enterprise value, ~KSh 4.2B estimated post-tax proceeds. SPECULATIVE: never treated as guaranteed future cash.",
    },
    { year: 26, revenueCents: null, netWorthCents: 980000000000 },
    { year: 33, revenueCents: null, netWorthCents: 5629000000000 },
];
export const GHUB_ACQUISITION = {
    year: 19,
    stakePct: 70,
    enterpriseValueCents: 750000000000, // KSh 7.5B
    hypotheticalProceedsCents: 42000000000, // KSh 4.2B post-tax (hypothetical)
};
export function planGhub(input) {
    const years = [];
    const margin = input.profitMarginPct / 100;
    const drawPct = input.ownerDrawPct / 100;
    let businessEquity = input.startBusinessEquityCents;
    const applyAcq = input.applyHypotheticalAcquisition;
    const acquisition = applyAcq
        ? { year: GHUB_ACQUISITION.year, hypotheticalProceedsCents: GHUB_ACQUISITION.hypotheticalProceedsCents }
        : null;
    const annualReturnPct = input.scenario === "custom"
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
        const monthlyRevenue = Math.round(input.monthlyRevenueCents *
            Math.pow(1 + input.monthlyRevenueGrowthPctPerYear / 100, year - 1));
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
export function milestoneProgress(actualCents, targetCents, elapsedMs, totalMs, windowStartMs = 0) {
    const pct = targetCents > 0
        ? Math.min(100, Math.max(0, (actualCents / targetCents) * 100))
        : 0;
    const expectedPct = totalMs > 0 ? Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100)) : 0;
    const remainingCents = Math.max(0, targetCents - actualCents);
    const timeRemainingMs = Math.max(0, totalMs - elapsedMs);
    const paceRatio = expectedPct > 0 ? pct / expectedPct : null;
    let status = "on_track";
    if (paceRatio !== null) {
        if (paceRatio >= 1.1)
            status = "ahead";
        else if (paceRatio < 0.9)
            status = "behind";
    }
    // Linear extrapolation: total duration = elapsed / (fraction completed).
    // pct is clamped to 0..100, so pct === 100 means "done at now".
    let estimatedCompletionMs = null;
    let estimatedOverrun = false;
    if (pct >= 100) {
        estimatedCompletionMs = windowStartMs + elapsedMs; // finished now
    }
    else if (pct > 0 && elapsedMs > 0) {
        const totalDuration = elapsedMs * (100 / pct);
        estimatedOverrun = totalDuration > totalMs;
        estimatedCompletionMs = Math.round(windowStartMs + totalDuration);
    }
    return {
        pct,
        remainingCents,
        timeRemainingMs,
        expectedPct,
        paceRatio,
        status,
        estimatedCompletionMs,
        estimatedOverrun,
    };
}
export function deriveInsights(input) {
    const insights = [];
    for (const holding of input.portfolio) {
        const weight = input.portfolioTotalCents > 0
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
    if (input.monthlyExpensesCents > 0 &&
        input.liquidCashCents < input.monthlyExpensesCents * 3) {
        insights.push({
            kind: "cash_reserves",
            severity: "danger",
            message: "Liquid cash is below 3 months of expenses — a thin emergency buffer.",
        });
    }
    if (input.monthlyIncomeCents > 0 &&
        input.monthlyExpensesCents > input.monthlyIncomeCents * 0.9) {
        insights.push({
            kind: "savings_requirement",
            severity: "warning",
            message: "Expenses consume over 90% of income — current goals may need a longer horizon or higher income.",
        });
    }
    if (input.overdueInvoiceCount > 0) {
        insights.push({
            kind: "overdue_invoices",
            severity: "warning",
            message: `${input.overdueInvoiceCount} business invoice(s) are overdue — follow up on collections.`,
        });
    }
    if (input.monthlyRevenuePrev > 0 &&
        input.monthlyRevenueNow < input.monthlyRevenuePrev * 0.8) {
        insights.push({
            kind: "cash_flow",
            severity: "warning",
            message: "Business revenue this month is over 20% below last month — cash flow is falling.",
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
