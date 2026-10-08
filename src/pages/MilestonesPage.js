import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BizPageHeader, BizStatCard } from "@/components/finance/BizParts";
import { api } from "@/convex/_generated/api";
import { NSE_PLAN_MONTHS, SCENARIOS, fiveYearCheckpoints, milestoneProgress, planNse, } from "@/lib/forecast";
import { ROADMAP_END, ROADMAP_START } from "@/lib/business";
import { formatDate, formatMoney } from "@/lib/format";
import { useQuery } from "convex/react";
export default function MilestonesPage() {
    const roadmap = useQuery(api.business.roadmapProgress, {});
    const portfolio = useQuery(api.invest.portfolio, {});
    if (roadmap === undefined || portfolio === undefined) {
        return _jsx("div", { className: "text-muted-foreground text-sm", children: "Loading milestones\u2026" });
    }
    const now = Date.now();
    const elapsed = Math.max(0, now - ROADMAP_START);
    const total = ROADMAP_END - ROADMAP_START;
    const rows = roadmap.map((row) => ({
        ...row,
        progress: milestoneProgress(row.actualCents, row.targetCents, Math.max(elapsed, 0), total, ROADMAP_START),
    }));
    const behindCount = rows.filter((row) => row.progress.status === "behind").length;
    // ---- Personal NSE five-year checkpoints (projection vs actual) ----------
    // The projection uses the base (hypothetical) scenario; the actual is the
    // real recorded portfolio value. Nothing here writes any forecast data.
    const startBalance = portfolio.totals.marketValueCents;
    const nsePlan = planNse({
        startBalanceCents: startBalance,
        monthlyBudgetCents: 100000, // KSh 1,000 default; editable on Roadmaps
        contributionGrowthPctPerYear: 5,
        scenario: "base",
        annualFeePct: 1.2,
        dividendYieldPct: 4,
        reinvestDividends: true,
    });
    const checkpoints = fiveYearCheckpoints(nsePlan);
    const statusStyles = {
        ahead: "text-positive",
        on_track: "text-amber-600",
        behind: "text-destructive",
    };
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx(BizPageHeader, { title: "Financial Milestones", subtitle: "Targets respond automatically to recorded actuals. Status: ahead (>110% of expected pace), on track (90\u2013110%), behind (<90%). Estimated completion assumes linear pace." }), behindCount > 0 && (_jsx(BizStatCard, { label: "Behind pace", value: behindCount, hint: "Milestones below 90% of expected progress", tone: "negative" })), _jsxs("section", { className: "surface-card overflow-x-auto rounded-xl border p-4", children: [_jsx("h2", { className: "text-sm font-semibold", children: "GHub Year-1 roadmap (actual vs target)" }), _jsxs("table", { className: "mt-3 w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-muted-foreground border-b text-left text-xs uppercase", children: [_jsx("th", { className: "py-2 pr-4", children: "Milestone" }), _jsx("th", { className: "py-2 pr-4", children: "Target" }), _jsx("th", { className: "py-2 pr-4", children: "Actual" }), _jsx("th", { className: "py-2 pr-4", children: "Progress" }), _jsx("th", { className: "py-2 pr-4", children: "Remaining" }), _jsx("th", { className: "py-2 pr-4", children: "Time remaining" }), _jsx("th", { className: "py-2 pr-4", children: "Pace" }), _jsx("th", { className: "py-2 pr-4", children: "Est. completion" }), _jsx("th", { className: "py-2", children: "Status" })] }) }), _jsxs("tbody", { children: [rows.map((row) => (_jsxs("tr", { className: "border-border/60 border-b last:border-0", children: [_jsx("td", { className: "py-2.5 pr-4 font-medium", children: row.label }), _jsx("td", { className: "py-2.5 pr-4 tabular-nums", children: formatMoney(row.targetCents) }), _jsx("td", { className: "py-2.5 pr-4 tabular-nums", children: formatMoney(row.actualCents) }), _jsxs("td", { className: "py-2.5 pr-4 tabular-nums", children: [row.progress.pct.toFixed(0), "%"] }), _jsx("td", { className: "py-2.5 pr-4 tabular-nums", children: formatMoney(row.progress.remainingCents) }), _jsx("td", { className: "py-2.5 pr-4 tabular-nums", children: row.progress.timeRemainingMs > 0
                                                    ? `${Math.round(row.progress.timeRemainingMs / (30.44 * 86400000))} mo`
                                                    : "—" }), _jsx("td", { className: "py-2.5 pr-4 tabular-nums", children: row.progress.paceRatio === null
                                                    ? "—"
                                                    : `${(row.progress.paceRatio * 100).toFixed(0)}% of pace` }), _jsxs("td", { className: "py-2.5 pr-4 tabular-nums", children: [row.progress.estimatedCompletionMs === null
                                                        ? "—"
                                                        : formatDate(row.progress.estimatedCompletionMs), row.progress.estimatedOverrun && (_jsx("span", { className: "text-destructive ml-1 text-xs", children: "(late)" }))] }), _jsx("td", { className: `py-2.5 font-medium ${statusStyles[row.progress.status]}`, children: row.progress.status.replace("_", " ") })] }, row._id))), rows.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 9, className: "text-muted-foreground py-8 text-center text-sm", children: "Open the GHub roadmap page once to seed Year-1 targets." }) }))] })] })] }), _jsxs("section", { className: "surface-card overflow-x-auto rounded-xl border p-4", children: [_jsx("h2", { className: "text-sm font-semibold", children: "Personal NSE five-year checkpoints (30-year plan)" }), _jsxs("p", { className: "text-muted-foreground mt-1 text-xs", children: ["Projected at the base scenario (", SCENARIOS.base.annualReturnPct, "%/yr return,", " ", SCENARIOS.base.annualInflationPct, "% inflation) over the ", NSE_PLAN_MONTHS, "-month engine, starting from the actual portfolio value. Hypothetical projection \u2014 not actual performance. Actual:", " ", _jsx("strong", { className: "tabular-nums", children: formatMoney(startBalance) })] }), _jsxs("table", { className: "mt-3 w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-muted-foreground border-b text-left text-xs uppercase", children: [_jsx("th", { className: "py-2 pr-4", children: "Checkpoint" }), _jsx("th", { className: "py-2 pr-4", children: "Projected nominal" }), _jsx("th", { className: "py-2 pr-4", children: "Projected real (today's KSh)" }), _jsx("th", { className: "py-2 pr-4", children: "Cumulative contributions" }), _jsx("th", { className: "py-2", children: "Progress vs Year-30 target" })] }) }), _jsx("tbody", { children: checkpoints.map((row) => {
                                    const finalBalance = nsePlan.yearly[nsePlan.yearly.length - 1]?.endBalanceCents ?? 0;
                                    const pct = finalBalance > 0
                                        ? Math.min(100, (row.endBalanceCents / finalBalance) * 100)
                                        : 0;
                                    return (_jsxs("tr", { className: "border-border/60 border-b last:border-0", children: [_jsxs("td", { className: "py-2.5 pr-4 font-medium", children: ["Year ", row.year] }), _jsx("td", { className: "py-2.5 pr-4 tabular-nums", children: formatMoney(row.endBalanceCents) }), _jsx("td", { className: "py-2.5 pr-4 tabular-nums", children: formatMoney(row.realBalanceCents) }), _jsx("td", { className: "py-2.5 pr-4 tabular-nums", children: formatMoney(nsePlan.yearly
                                                    .slice(0, row.year)
                                                    .reduce((s, y) => s + y.contributionsCents, 0)) }), _jsxs("td", { className: "py-2.5 tabular-nums", children: [pct.toFixed(0), "%"] })] }, row.year));
                                }) })] })] })] }));
}
