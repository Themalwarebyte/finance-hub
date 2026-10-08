import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BizPageHeader, BizStatCard, useEnsureGHub } from "@/components/finance/BizParts";
import { api } from "@/convex/_generated/api";
import { formatMoney } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";
export default function RoadmapPage() {
    useEnsureGHub();
    const seed = useMutation(api.business.seedMilestones);
    const roadmap = useQuery(api.business.roadmapProgress, {});
    const updateTarget = useMutation(api.business.updateMilestoneTarget);
    useEffect(() => {
        void seed({}).catch(() => undefined);
    }, [seed]);
    if (roadmap === undefined) {
        return (_jsxs("div", { className: "text-muted-foreground flex items-center gap-2 text-sm", children: [_jsx(Loader2, { className: "size-4 animate-spin" }), " Loading roadmap\u2026"] }));
    }
    if (roadmap === null) {
        return _jsx("div", { className: "surface-card rounded-xl p-8 text-sm", children: "Roadmap unavailable." });
    }
    const annual = roadmap.find((row) => row.kind === "revenue" && row.quarter === null);
    const quarters = roadmap
        .filter((row) => row.kind === "revenue" && row.quarter !== null)
        .sort((a, b) => (a.quarter ?? 0) - (b.quarter ?? 0));
    const others = roadmap.filter((row) => row.kind !== "revenue" || row.quarter === null);
    const handleRetarget = async (milestoneId, current, event) => {
        const value = Math.round(Number.parseFloat(event.target.value || "0") * 100);
        if (!Number.isFinite(value) || value === current)
            return;
        try {
            await updateTarget({ milestoneId: milestoneId, targetCents: value });
            toast.success("Target updated");
        }
        catch {
            toast.error("Only the owner can edit targets.");
        }
    };
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx(BizPageHeader, { title: "Business Roadmap \u2014 Year 1", subtitle: "Oct 2026 \u2192 Sep 2027. Targets are editable goals; actuals come only from recorded data." }), _jsx("p", { className: "text-muted-foreground text-xs", children: "Projected outcomes assume a straight-line run-rate from realised revenue to date \u2014 a documented Phase-1 assumption, not a forecast model." }), annual && (_jsxs("div", { className: "grid gap-3 sm:grid-cols-3", children: [_jsx(BizStatCard, { label: "Annual revenue target", value: formatMoney(annual.targetCents), hint: "Target" }), _jsx(BizStatCard, { label: "Actual to date", value: formatMoney(annual.actualCents), hint: `${Math.round(annual.progressPct)}% of target` }), _jsx(BizStatCard, { label: "Projected year-end", value: formatMoney(annual.projectedEndCents), hint: `Pace ${Math.round(annual.progressPct)}% vs expected ${Math.round(annual.expectedPct)}%` })] })), _jsxs("section", { className: "surface-card rounded-xl border p-4", children: [_jsx("h2", { className: "text-sm font-semibold", children: "Quarterly revenue targets" }), _jsx("ul", { className: "mt-3 divide-y", children: quarters.map((row) => (_jsxs("li", { className: "py-2.5", children: [_jsxs("div", { className: "flex items-center justify-between gap-3 text-sm", children: [_jsx("span", { className: "font-medium", children: row.label }), _jsxs("span", { className: "tabular-nums", children: [formatMoney(row.actualCents), " / ", formatMoney(row.targetCents)] })] }), _jsx("div", { className: "bg-muted mt-1.5 h-2 overflow-hidden rounded-full", children: _jsx("div", { className: "bg-primary h-full rounded-full transition-all", style: { width: `${Math.round(row.progressPct)}%` } }) })] }, row._id))) })] }), _jsxs("section", { className: "surface-card rounded-xl border p-4", children: [_jsx("h2", { className: "text-sm font-semibold", children: "Other Year-1 milestones" }), _jsxs("ul", { className: "mt-3 divide-y", children: [others.map((row) => (_jsxs("li", { className: "flex items-center justify-between gap-4 py-2.5 text-sm", children: [_jsxs("div", { children: [_jsx("p", { className: "font-medium", children: row.label }), _jsxs("p", { className: "text-muted-foreground text-xs", children: [Math.round(row.progressPct), "% \u00B7 projected ", formatMoney(row.projectedEndCents)] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("span", { className: "text-muted-foreground text-xs tabular-nums", children: ["actual ", formatMoney(row.actualCents)] }), _jsx("input", { type: "number", className: "border-border w-24 rounded-md border px-2 py-1 text-right text-xs tabular-nums", defaultValue: (row.targetCents / 100).toFixed(0), onBlur: (event) => void handleRetarget(row._id, row.targetCents, event), "aria-label": `${row.label} target` })] })] }, row._id))), others.length === 0 && (_jsx("li", { className: "text-muted-foreground py-6 text-center text-sm", children: "Roadmap seeds appear the first time the owner opens this page." }))] })] })] }));
}
