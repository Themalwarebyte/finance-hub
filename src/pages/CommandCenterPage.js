import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BizPageHeader, BizStatCard, useEnsureGHub } from "@/components/finance/BizParts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { INITIAL_TARGETS } from "@/lib/business";
import { milestoneProgress } from "@/lib/forecast";
import { formatMoney } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
const ACTIVITY_LABELS = {
    businesses_researched: "Businesses researched",
    new_contacts: "New contacts made",
    follow_ups_completed: "Follow-ups completed",
    discovery_meetings: "Discovery meetings",
    proposals_sent: "Proposals sent",
    contracts_won: "Contracts won",
};
function statusTone(status) {
    if (status === "ahead")
        return "text-positive";
    if (status === "behind")
        return "text-destructive";
    return "text-amber-600";
}
export default function CommandCenterPage() {
    useEnsureGHub();
    const overview = useQuery(api.business.overview, {});
    const cc = useQuery(api.ceo.commandCenter, {});
    const roadmap = useQuery(api.business.roadmapProgress, {});
    const activity = useQuery(api.ceo.activitySummary, {});
    const logActivity = useMutation(api.ceo.logActivity);
    const setTarget = useMutation(api.ceo.setActivityTarget);
    const [targetDraft, setTargetDraft] = useState({});
    if (overview === undefined ||
        cc === undefined ||
        roadmap === undefined ||
        activity === undefined) {
        return _jsx("div", { className: "text-muted-foreground text-sm", children: "Loading command center\u2026" });
    }
    // --- Section B: Year-1 mission control. Targets are clearly labelled ---
    // editable values (from the seeded roadmap); actuals come from records.
    const actualByKind = new Map();
    for (const row of roadmap) {
        actualByKind.set(row.kind, row.actualCents);
    }
    const monthlyAvgTargetCents = Math.round(INITIAL_TARGETS.annualRevenueCents / 12);
    const objectives = [
        {
            label: "Annual revenue (target KSh 120,000)",
            targetCents: INITIAL_TARGETS.annualRevenueCents,
            actualCents: actualByKind.get("revenue") ?? cc.revenueYtdCents,
        },
        {
            label: "Monthly average (target KSh 10,000)",
            targetCents: monthlyAvgTargetCents,
            actualCents: cc.revenueThisMonthCents,
        },
        {
            label: "Recurring revenue (target KSh 6,000/month)",
            targetCents: INITIAL_TARGETS.monthlyRecurringRevenueCents,
            actualCents: overview.mrrCents,
        },
        {
            label: "Year-end net worth (target KSh 15,000)",
            targetCents: INITIAL_TARGETS.yearEndNetWorthCents,
            actualCents: actualByKind.get("net_worth") ?? 0,
        },
    ];
    const activityRows = activity;
    const behindActivities = activityRows.filter((r) => r.status === "behind").length;
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx(BizPageHeader, { title: "GHub CEO Command Center", subtitle: "Daily operating dashboard. Actuals come from recorded business data; targets are editable goals, clearly separated from performance." }), _jsxs("section", { className: "flex flex-col gap-3", children: [_jsx("h2", { className: "text-sm font-semibold", children: "Business performance (actuals)" }), _jsxs("div", { className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-4", children: [_jsx(BizStatCard, { label: "Revenue this month", value: formatMoney(cc.revenueThisMonthCents), hint: "Non-draft invoices issued this month" }), _jsx(BizStatCard, { label: "Revenue year-to-date", value: formatMoney(cc.revenueYtdCents), hint: "All issued invoices" }), _jsx(BizStatCard, { label: "Cash collected", value: formatMoney(cc.cashCollectedCents), hint: "Payments received against invoices" }), _jsx(BizStatCard, { label: "Outstanding receivables", value: formatMoney(cc.receivablesCents), hint: "Unpaid issued invoices" }), _jsx(BizStatCard, { label: "Operating expenses", value: formatMoney(overview.operatingExpenses), hint: "YTD, excludes owner movements" }), _jsx(BizStatCard, { label: "Net operating profit", value: formatMoney(overview.netOperatingProfit), tone: overview.netOperatingProfit >= 0 ? "positive" : "negative" }), _jsx(BizStatCard, { label: "Active clients", value: cc.activeClients }), _jsx(BizStatCard, { label: "Active contracts", value: cc.activeContracts }), _jsx(BizStatCard, { label: "Monthly recurring revenue", value: formatMoney(overview.mrrCents), hint: `${overview.activeRetainerClients} active retainer client(s)` }), _jsx(BizStatCard, { label: "Open leads", value: cc.openLeads, hint: "Opportunities still in the pipeline" })] })] }), _jsxs("section", { className: "surface-card rounded-xl border p-4", children: [_jsx("h2", { className: "text-sm font-semibold", children: "Year 1 Mission Control \u2014 targets (editable vision, not actuals)" }), _jsxs("p", { className: "text-muted-foreground mt-1 text-xs", children: ["Targets are the seeded Year-1 objectives; edit them on the", " ", _jsx("a", { href: "/ghub/roadmap", className: "underline", children: "Business roadmap" }), " ", "page. Status uses the shared milestone thresholds (ahead >110% of expected pace, on track 90\u2013110%, behind <90%), compared against elapsed Year-1 time."] }), _jsxs("table", { className: "mt-3 w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-muted-foreground border-b text-left text-xs uppercase", children: [_jsx("th", { className: "py-2 pr-4", children: "Objective" }), _jsx("th", { className: "py-2 pr-4", children: "Target" }), _jsx("th", { className: "py-2 pr-4", children: "Actual" }), _jsx("th", { className: "py-2 pr-4", children: "Gap" }), _jsx("th", { className: "py-2 pr-4", children: "Complete" }), _jsx("th", { className: "py-2", children: "Status" })] }) }), _jsx("tbody", { children: objectives.map((objective) => {
                                    const gap = objective.actualCents - objective.targetCents;
                                    const pct = objective.targetCents > 0
                                        ? Math.min(100, (objective.actualCents / objective.targetCents) * 100)
                                        : 0;
                                    const start = Date.UTC(2026, 9, 1);
                                    const end = Date.UTC(2027, 8, 30, 23, 59, 59, 999);
                                    const now = Date.now();
                                    const progress = milestoneProgress(objective.actualCents, objective.targetCents, Math.max(0, now - start), end - start, start);
                                    const beforeRoadmap = now < start;
                                    const status = beforeRoadmap
                                        ? "on_track"
                                        : progress.status.replace("_", " ");
                                    return (_jsxs("tr", { className: "border-border/60 border-b last:border-0", children: [_jsx("td", { className: "py-2.5 pr-4 font-medium", children: objective.label }), _jsx("td", { className: "py-2.5 pr-4 tabular-nums", children: formatMoney(objective.targetCents) }), _jsx("td", { className: "py-2.5 pr-4 tabular-nums", children: formatMoney(objective.actualCents) }), _jsxs("td", { className: `py-2.5 pr-4 tabular-nums ${gap >= 0 ? "text-positive" : "text-destructive"}`, children: [gap >= 0 ? "+" : "", formatMoney(gap)] }), _jsxs("td", { className: "py-2.5 pr-4 tabular-nums", children: [pct.toFixed(0), "%"] }), _jsx("td", { className: `py-2.5 font-medium capitalize ${statusTone(progress.status)}`, children: status })] }, objective.label));
                                }) })] })] }), _jsxs("section", { className: "surface-card rounded-xl border p-4", children: [_jsxs("div", { className: "flex items-baseline justify-between gap-3", children: [_jsx("h2", { className: "text-sm font-semibold", children: "Weekly CEO activity tracker" }), behindActivities > 0 && (_jsxs("span", { className: "text-destructive text-xs font-semibold", children: [behindActivities, " activity goal(s) behind pace"] }))] }), _jsx("p", { className: "text-muted-foreground mt-1 text-xs", children: "Activity goals \u2014 not financial transactions. Counts log into the current week (Monday-based). Suggested targets are prefilled; owners can edit each one." }), _jsx("ul", { className: "mt-3 flex flex-col gap-3", children: activityRows.map((row) => (_jsxs("li", { className: "flex flex-col gap-1.5", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2 text-sm", children: [_jsx("span", { className: "font-medium", children: ACTIVITY_LABELS[row.kind] ?? row.kind }), _jsxs("span", { className: "text-muted-foreground tabular-nums", children: [row.count, " / ", row.target, " per week", row.isDefaultTarget ? " (suggested)" : ""] }), _jsxs("span", { className: `text-xs font-semibold ${statusTone(row.status)}`, children: [row.status.replace("_", " "), " \u00B7 ", row.pct.toFixed(0), "%"] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Input, { className: "h-8 w-20 tabular-nums", inputMode: "numeric", placeholder: "target", value: targetDraft[row.kind] ?? "", onChange: (e) => setTargetDraft((draft) => ({ ...draft, [row.kind]: e.target.value })) }), _jsx(Button, { size: "sm", variant: "outline", onClick: () => {
                                                        const value = Number.parseInt(targetDraft[row.kind] ?? "", 10);
                                                        if (!Number.isFinite(value) || value < 0) {
                                                            toast.error("Enter a non-negative whole number.");
                                                            return;
                                                        }
                                                        void setTarget({ kind: row.kind, targetPerWeek: value })
                                                            .then(() => toast.success("Target updated"))
                                                            .catch(() => toast.error("Only the owner can edit targets."))
                                                            .finally(() => setTargetDraft((draft) => ({ ...draft, [row.kind]: "" })));
                                                    }, children: "Set" }), _jsxs(Button, { size: "sm", onClick: () => void logActivity({ kind: row.kind, count: 1 })
                                                        .catch(() => toast.error("Couldn't log the activity.")), children: [_jsx(Plus, { className: "size-4" }), " Log 1"] })] })] }), _jsx("div", { className: "bg-muted h-1.5 w-full overflow-hidden rounded-full", children: _jsx("div", { className: "bg-primary h-full rounded-full transition-[width]", style: { width: `${row.pct}%` } }) })] }, row.kind))) })] })] }));
}
