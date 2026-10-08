import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BizPageHeader, BizStatCard, useEnsureGHub } from "@/components/finance/BizParts";
import { api } from "@/convex/_generated/api";
import { formatMoney } from "@/lib/format";
import { useQuery } from "convex/react";
import { Building2, Loader2 } from "lucide-react";
export default function GHubDashboard() {
    useEnsureGHub();
    const overview = useQuery(api.business.overview, {});
    const roadmap = useQuery(api.business.roadmapProgress, {});
    if (overview === undefined || roadmap === undefined) {
        return (_jsxs("div", { className: "text-muted-foreground flex items-center gap-2 text-sm", children: [_jsx(Loader2, { className: "size-4 animate-spin" }), " Loading GHub dashboard\u2026"] }));
    }
    if (overview === null || roadmap === null) {
        return (_jsxs("div", { className: "surface-card flex items-center gap-3 rounded-xl border p-6 text-sm", children: [_jsx(Building2, { className: "size-8 shrink-0" }), _jsxs("div", { children: [_jsx("p", { className: "font-medium", children: "GHub Technology Solutions isn't set up yet." }), _jsx("p", { className: "text-muted-foreground", children: "Sign in with the owner account to bootstrap it." })] })] }));
    }
    const mrrRow = roadmap.find((row) => row.kind === "mrr");
    const revenueRow = roadmap.find((row) => row.kind === "revenue" && row.quarter === null);
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx(BizPageHeader, { title: "GHub \u2014 Dashboard", subtitle: "All amounts are KES and come only from recorded business data." }), _jsxs("div", { className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-4", children: [_jsx(BizStatCard, { label: "Revenue YTD", value: formatMoney(overview.revenueYtd), hint: `Invoiced ${formatMoney(overview.invoicedRevenueYtd)} · earned basis` }), _jsx(BizStatCard, { label: "Cash collected", value: formatMoney(overview.cashCollected) }), _jsx(BizStatCard, { label: "Operating expenses", value: formatMoney(overview.operatingExpenses), tone: "neutral" }), _jsx(BizStatCard, { label: "Net operating profit", value: formatMoney(overview.netOperatingProfit), tone: overview.netOperatingProfit >= 0 ? "positive" : "negative" }), _jsx(BizStatCard, { label: "Available business cash", value: formatMoney(overview.availableCash) }), _jsx(BizStatCard, { label: "Outstanding receivables", value: formatMoney(overview.receivables) }), _jsx(BizStatCard, { label: "Monthly recurring revenue", value: formatMoney(overview.mrrCents), hint: mrrRow
                            ? `${Math.round(mrrRow.progressPct)}% of the KSh 6,000 goal`
                            : undefined }), _jsx(BizStatCard, { label: "Active retainer clients", value: overview.activeRetainerClients, hint: `${overview.openLeadCount} open leads in the pipeline` })] }), _jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [_jsx(BizStatCard, { label: "Business runway", value: overview.runwayMonths === Number.POSITIVE_INFINITY
                            ? "Open-ended"
                            : `${overview.runwayMonths} months`, hint: overview.assumptions.runway }), _jsx(BizStatCard, { label: "Milestone pace", value: revenueRow ? `Revenue ${Math.round(revenueRow.progressPct)}%` : "—", hint: revenueRow ? `Expected pace ${Math.round(revenueRow.expectedPct)}% of the year` : undefined })] }), _jsxs("p", { className: "text-muted-foreground text-xs", children: ["Earned-revenue basis: ", overview.assumptions.earned] })] }));
}
