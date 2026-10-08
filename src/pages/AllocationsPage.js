import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { BizPageHeader, BizStatCard } from "@/components/finance/BizParts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api } from "@/convex/_generated/api";
import { formatMoney } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
const CYCLES = [
    {
        key: "A",
        label: "Month A",
        fixed: "SMWF Global ETF 55% · Safaricom 25% · KenGen 20%",
    },
    {
        key: "B",
        label: "Month B",
        fixed: "Safaricom 35% · Co-op Bank 20% · Equity 20% · TotalEnergies 25%",
    },
    {
        key: "C",
        label: "Month C",
        fixed: "SMWF 50% · KenGen 25% · KCB 20% · TotalEnergies 5%",
    },
];
export default function AllocationsPage() {
    const allocations = useQuery(api.invest.listAllocations, {});
    const securities = useQuery(api.invest.listSecurities, {});
    const upsertAllocation = useMutation(api.invest.upsertAllocation);
    const removeAllocation = useMutation(api.invest.removeAllocation);
    const [budget, setBudget] = useState("1000");
    const [cycle, setCycle] = useState("A");
    const [newPct, setNewPct] = useState("");
    const [newSecurity, setNewSecurity] = useState("");
    const handleAdd = async () => {
        const pct = Number.parseFloat(newPct);
        if (!newSecurity || !Number.isFinite(pct) || pct <= 0 || pct > 100) {
            toast.error("Choose an investment and a percent between 0 and 100.");
            return;
        }
        try {
            await upsertAllocation({
                cycle,
                securityId: newSecurity,
                pct,
                active: true,
            });
            const total = allocations
                ?.filter((row) => row.cycle === cycle)
                .reduce((sum, row) => sum + row.pct, pct) ?? pct;
            if (Math.abs(total - 100) > 1e-9)
                toast.warning(`Cycle ${cycle} now totals ${total}% — adjust to exactly 100%.`);
            else
                toast.success(`Added to cycle ${cycle} (total 100%)`);
            setNewPct("");
            setNewSecurity("");
        }
        catch {
            toast.error("Couldn't add the allocation.");
        }
    };
    const handleSubstitute = async (allocationId, securityId, event) => {
        try {
            // Substitution = remove old row, add same pct for the new security.
            await removeAllocation({ allocationId: allocationId });
            await upsertAllocation({
                cycle,
                securityId: event.target.value,
                pct: allocations?.find((row) => row._id === allocationId)?.pct ?? 0,
                active: true,
            });
            void securityId;
            toast.success("Investment substituted");
        }
        catch {
            toast.error("Substitution failed.");
        }
    };
    const budgetCents = Math.round(Number.parseFloat(budget || "0") * 100);
    const plan = useQuery(api.invest.planPreview, budgetCents > 0 ? { cycle, budgetCents, carriedCents: 0 } : "skip");
    if (allocations === undefined) {
        return _jsx("div", { className: "text-muted-foreground text-sm", children: "Loading allocations\u2026" });
    }
    const grouped = CYCLES.map((cycleMeta) => ({
        ...cycleMeta,
        rows: allocations.filter((row) => row.cycle === cycleMeta.key),
        totalPct: allocations
            .filter((row) => row.cycle === cycleMeta.key)
            .reduce((sum, row) => sum + row.pct, 0),
    }));
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx(BizPageHeader, { title: "Monthly Allocation Strategy", subtitle: "Percent-based plan over a repeating A \u2192 B \u2192 C cycle. Every month must total exactly 100%. Nothing is auto-traded \u2014 this is a planning surface only." }), _jsx("div", { className: "grid gap-3 lg:grid-cols-3", children: grouped.map((cycleMeta) => (_jsxs("div", { className: "surface-card rounded-xl border p-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "text-sm font-semibold", children: cycleMeta.label }), _jsxs("span", { className: `text-xs font-medium tabular-nums ${cycleMeta.totalPct === 100 ? "text-positive" : "text-amber-600"}`, children: [cycleMeta.totalPct, "%"] })] }), _jsx("p", { className: "text-muted-foreground mt-1 text-xs", children: cycleMeta.fixed }), _jsxs("ul", { className: "mt-3 divide-y", children: [cycleMeta.rows.map((row) => (_jsxs("li", { className: "flex items-center justify-between gap-2 py-1.5 text-sm", children: [_jsx("span", { children: row.securityId }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs(Select, { value: row.securityId, onValueChange: (next) => void handleSubstitute(row._id, row.securityId, { target: { value: next } }), children: [_jsx(SelectTrigger, { className: "h-7 w-24 text-xs", children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: (securities ?? []).map((security) => (_jsx(SelectItem, { value: security._id, children: security.symbol }, security._id))) })] }), _jsxs("span", { className: "tabular-nums", children: [row.pct, "%"] }), _jsx(Switch, { checked: row.active, onCheckedChange: (active) => {
                                                        void removeAllocation({ allocationId: row._id })
                                                            .then(() => upsertAllocation({
                                                            cycle: row.cycle,
                                                            securityId: row.securityId,
                                                            pct: row.pct,
                                                            active,
                                                        }))
                                                            .then(() => toast.success(active ? "Purchases active" : "Purchases paused"))
                                                            .catch(() => toast.error("Couldn't pause purchases."));
                                                    }, "aria-label": `${row.active ? "Pause" : "Resume"} purchases for ${row.securityId}` }), _jsx(Button, { variant: "ghost", size: "sm", className: "text-muted-foreground h-7 px-2", onClick: () => void removeAllocation({ allocationId: row._id })
                                                        .then(() => toast.success("Allocation removed"))
                                                        .catch(() => toast.error("Couldn't remove.")), children: "Remove" })] })] }, row._id))), cycleMeta.rows.length === 0 && (_jsx("li", { className: "text-muted-foreground py-2 text-xs", children: "Not configured yet." }))] })] }, cycleMeta.key))) }), _jsxs("section", { className: "surface-card rounded-xl border p-4", children: [_jsx("h2", { className: "text-sm font-semibold", children: "Plan a month (no trades executed)" }), _jsx("p", { className: "text-muted-foreground mt-1 text-xs", children: "To edit: pick the cycle month, add an investment with its percent, substitute via the dropdown, pause purchases with the switch, or remove a row. The cycle must total exactly 100% before the planner will run." }), _jsxs("div", { className: "mt-3 flex flex-wrap items-end gap-3", children: [_jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("label", { className: "text-muted-foreground text-xs", htmlFor: "alloc-cycle-edit", children: "Cycle month" }), _jsx("select", { id: "alloc-cycle-edit", value: cycle, onChange: (event) => setCycle(event.target.value), className: "border-border rounded-md border px-2 py-1.5 text-sm", children: CYCLES.map((cycleMeta) => (_jsx("option", { value: cycleMeta.key, children: cycleMeta.label }, cycleMeta.key))) })] }), _jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("label", { className: "text-muted-foreground text-xs", children: "Investment" }), _jsxs(Select, { value: newSecurity, onValueChange: setNewSecurity, children: [_jsx(SelectTrigger, { className: "h-9 w-40", children: _jsx(SelectValue, { placeholder: "Choose" }) }), _jsx(SelectContent, { children: (securities ?? []).map((security) => (_jsx(SelectItem, { value: security._id, children: security.symbol }, security._id))) })] })] }), _jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("label", { className: "text-muted-foreground text-xs", htmlFor: "alloc-pct", children: "Percent" }), _jsx(Input, { id: "alloc-pct", inputMode: "decimal", value: newPct, onChange: (event) => setNewPct(event.target.value), className: "w-20", placeholder: "25" })] }), _jsx(Button, { onClick: () => void handleAdd(), children: "Add allocation" })] })] }), _jsxs("section", { className: "surface-card rounded-xl border p-4", children: [_jsx("h2", { className: "text-sm font-semibold", children: "Planner preview" }), _jsxs("div", { className: "mt-3 flex flex-wrap items-end gap-3", children: [_jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("label", { className: "text-muted-foreground text-xs", htmlFor: "alloc-budget", children: "Monthly budget (KSh)" }), _jsx("input", { id: "alloc-budget", type: "number", min: "0", value: budget, onChange: (event) => setBudget(event.target.value), className: "border-border w-32 rounded-md border px-2 py-1.5 text-sm tabular-nums" })] }), _jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("label", { className: "text-muted-foreground text-xs", htmlFor: "alloc-cycle", children: "Cycle month" }), _jsx("select", { id: "alloc-cycle", value: cycle, onChange: (event) => setCycle(event.target.value), className: "border-border rounded-md border px-2 py-1.5 text-sm", children: CYCLES.map((cycleMeta) => (_jsx("option", { value: cycleMeta.key, children: cycleMeta.label }, cycleMeta.key))) })] })] }), plan && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "mt-4 grid gap-3 sm:grid-cols-3", children: [_jsx(BizStatCard, { label: "Allocated & purchasable", value: formatMoney(plan.spentCents) }), _jsx(BizStatCard, { label: "Remaining (carried forward)", value: formatMoney(plan.remainingCents) }), _jsx(BizStatCard, { label: "Blocked (missing price)", value: formatMoney(plan.unallocatedCents), hint: "Add manual prices to unblock" })] }), _jsx("ul", { className: "mt-4 divide-y", children: plan.lines.map((line) => (_jsxs("li", { className: "flex items-center justify-between py-2 text-sm", children: [_jsx("span", { className: "font-medium", children: line.name }), _jsxs("span", { className: "text-muted-foreground tabular-nums", children: [formatMoney(line.allocatedCents), " \u2192", " ", line.wholeShares > 0
                                                    ? `${line.wholeShares} share${line.wholeShares === 1 ? "" : "s"} (${formatMoney(line.spentCents)})`
                                                    : "insufficient for a whole share — carried forward"] })] }, line.securityId))) })] }))] })] }));
}
