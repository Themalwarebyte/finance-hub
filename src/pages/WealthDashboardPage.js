import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BizPageHeader, BizStatCard } from "@/components/finance/BizParts";
import { api } from "@/convex/_generated/api";
import { milestoneProgress } from "@/lib/forecast";
import { ROADMAP_END, ROADMAP_START } from "@/lib/business";
import { formatMoney } from "@/lib/format";
import { useQuery } from "convex/react";
import { Link } from "react-router";
export default function WealthDashboardPage() {
    const overview = useQuery(api.finance.overview, {});
    const dashboard = useQuery(api.finance.dashboard, {});
    const business = useQuery(api.business.overview, {});
    const portfolio = useQuery(api.invest.portfolio, {});
    const roadmap = useQuery(api.business.roadmapProgress, {});
    if (overview === undefined ||
        dashboard === undefined ||
        business === undefined ||
        portfolio === undefined ||
        roadmap === undefined) {
        return _jsx("div", { className: "text-muted-foreground text-sm", children: "Loading consolidated wealth\u2026" });
    }
    // --- Personal (household actuals) ---
    const personalNetWorth = overview ? overview.assets - overview.liabilities : null;
    const totalLiabilities = overview ? overview.liabilities : null;
    const cashAndSavings = dashboard ? dashboard.cards.cash + dashboard.cards.bank : null;
    // --- Business (GHub actuals) ---
    // Business equity = available cash + receivables (assets) minus customer
    // prepayments held (a liability owed to customers). Counted once.
    const businessEquity = business
        ? business.availableCash + business.receivables - business.customerPrepaymentsCents
        : null;
    // --- Portfolio (investments actuals) ---
    const portfolioValue = portfolio.totals.marketValueCents;
    // Consolidated economic net worth = personal + portfolio + business equity.
    // Business receivables are included once (as an asset owed TO the
    // business); nothing is double-counted across the three domains.
    const consolidated = (personalNetWorth ?? 0) + portfolioValue + (businessEquity ?? 0);
    // --- Roadmap progress (active roadmap = Year-1 GHub targets) ---
    const now = Date.now();
    const elapsed = Math.max(0, now - ROADMAP_START);
    const total = ROADMAP_END - ROADMAP_START;
    const roadmapRows = (roadmap ?? []).map((row) => ({
        ...row,
        progress: milestoneProgress(row.actualCents, row.targetCents, elapsed, total, ROADMAP_START),
    }));
    const overallPct = roadmapRows.length > 0
        ? roadmapRows.reduce((s, r) => s + r.progress.pct, 0) /
            roadmapRows.length
        : null;
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx(BizPageHeader, { title: "Wealth \u2014 Consolidated Dashboard", subtitle: "Every figure comes from actual recorded data across personal, business and investment domains. Projections and hypothetical valuations are never counted as realized wealth." }), _jsxs("div", { className: "surface-card border-transparent bg-primary text-primary-foreground rounded-xl border p-5", children: [_jsx("p", { className: "text-primary-foreground/70 text-xs font-semibold tracking-[0.14em] uppercase", children: "Consolidated economic net worth" }), _jsx("p", { className: "mt-2 text-3xl font-semibold tracking-tight tabular-nums", children: formatMoney(consolidated) }), _jsx("p", { className: "text-primary-foreground/70 mt-1 text-xs", children: "Personal net worth + investment portfolio + business equity (cash + receivables \u2212 prepayments)" })] }), _jsxs("div", { className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-4", children: [_jsx(BizStatCard, { label: "Personal net worth", value: personalNetWorth === null ? "—" : formatMoney(personalNetWorth), hint: "Household accounts, from the Finance Hub" }), _jsx(BizStatCard, { label: "Total liabilities", value: totalLiabilities === null ? "—" : formatMoney(totalLiabilities), hint: "Credit cards, loans, mortgages tracked in the household" }), _jsx(BizStatCard, { label: "Cash & emergency savings", value: cashAndSavings === null ? "—" : formatMoney(cashAndSavings), hint: "Cash, mobile money and bank balances" }), _jsx(BizStatCard, { label: "Investment portfolio", value: formatMoney(portfolioValue), hint: portfolio.totals.unknownPriceCount > 0
                            ? `${portfolio.totals.unknownPriceCount} position(s) awaiting a price entry`
                            : "At your latest manual prices" }), _jsx(BizStatCard, { label: "Business cash & receivables", value: businessEquity === null ? "—" : formatMoney(businessEquity), hint: `Cash ${business ? formatMoney(business.availableCash) : "—"} + receivables ${business ? formatMoney(business.receivables) : "—"} − prepayments ${business ? formatMoney(business.customerPrepaymentsCents) : "—"}` }), _jsx(BizStatCard, { label: "Business liabilities (owed to others)", value: business && business.customerPrepaymentsCents > 0
                            ? formatMoney(business.customerPrepaymentsCents)
                            : formatMoney(0), hint: "Customer prepayments held (a liability, never revenue)" }), _jsx(BizStatCard, { label: "Business revenue (billed, YTD)", value: business ? formatMoney(business.billedRevenueYtd) : "—", hint: "Issued invoices \u2014 not recognition" }), _jsx(BizStatCard, { label: "Business net operating profit", value: business ? formatMoney(business.netOperatingProfit) : "—", tone: business && business.netOperatingProfit >= 0 ? "positive" : "negative" }), _jsx(BizStatCard, { label: "Business receivables", value: business ? formatMoney(business.receivables) : "—", hint: "Unpaid issued invoices" }), _jsx(BizStatCard, { label: "Total portfolio cost basis", value: formatMoney(portfolio.totals.costBasisCents) })] }), _jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [_jsx(BizStatCard, { label: "Personal savings rate", value: dashboard && dashboard.cards.savingsRate !== null
                            ? `${dashboard.cards.savingsRate.toFixed(1)}%`
                            : "—", hint: "Saved \u00F7 income this month, from the household ledger" }), _jsx(BizStatCard, { label: "Monthly investable surplus", value: dashboard
                            ? formatMoney(Math.max(0, dashboard.cards.income - dashboard.cards.expenses - dashboard.cards.upcomingBillsTotal))
                            : "—", hint: "Income \u2212 expenses \u2212 upcoming bills" })] }), _jsxs("section", { className: "surface-card rounded-xl border p-4", children: [_jsxs("div", { className: "flex items-baseline justify-between gap-3", children: [_jsx("h2", { className: "text-sm font-semibold", children: "Active roadmap progress" }), overallPct !== null && (_jsxs("span", { className: "text-sm font-semibold tabular-nums", children: [overallPct.toFixed(0), "% average"] }))] }), roadmapRows.length === 0 ? (_jsx("p", { className: "text-muted-foreground mt-2 text-xs", children: "No roadmap milestones yet \u2014 open the GHub roadmap page to seed Year-1 targets." })) : (_jsx("ul", { className: "mt-3 flex flex-col gap-2.5", children: roadmapRows.map((row) => (_jsxs("li", { className: "flex flex-col gap-1", children: [_jsxs("div", { className: "flex items-baseline justify-between gap-2 text-xs", children: [_jsx("span", { className: "font-medium", children: row.label }), _jsxs("span", { className: "text-muted-foreground tabular-nums", children: [formatMoney(row.actualCents), " / ", formatMoney(row.targetCents), " \u00B7", " ", row.progress.pct.toFixed(0), "% \u00B7 ", row.progress.status.replace("_", " ")] })] }), _jsx("div", { className: "bg-muted h-1.5 w-full overflow-hidden rounded-full", children: _jsx("div", { className: "bg-primary h-full rounded-full transition-[width]", style: { width: `${row.progress.pct}%` } }) })] }, row._id))) })), _jsxs("p", { className: "text-muted-foreground mt-3 text-xs", children: ["Full detail with pace and estimated completion lives on the", " ", _jsx(Link, { to: "/wealth/milestones", className: "underline", children: "Milestones" }), " ", "page."] })] }), _jsx("p", { className: "text-muted-foreground text-xs", children: "Methodology: business exit valuations are never treated as realized liquid wealth; the projected/hypothetical acquisition stays inside the 33-year plan page only. Receivables are counted once, as business assets; customer prepayments are counted as liabilities, never revenue." })] }));
}
