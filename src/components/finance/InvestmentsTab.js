import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { api } from "@/convex/_generated/api";
import { returnBasisLabel } from "@/lib/finance";
import { formatMoney, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { ArrowDownRight, ArrowUpRight, Info, LineChart, Pencil, Plus, TrendingUp, } from "lucide-react";
import { useState } from "react";
/** Yearly estimate for one account, compounded from its own basis. */
function accountEstimates(row) {
    const pct = row.estimatedReturnPct ?? null;
    const basis = row.returnBasis === "monthly" ? "monthly" : "annual";
    if (pct === null || row.balance === 0) {
        return { pct, basis, annual: null, monthly: null };
    }
    const dollars = Math.abs(row.balance) / 100;
    const sign = row.balance < 0 ? -1 : 1;
    const growth = basis === "annual"
        ? dollars * (Math.pow(1 + pct / 100, 1) - 1)
        : dollars * (Math.pow(1 + pct / 100, 12) - 1);
    const annualCents = Math.round(growth * 100 * sign);
    return {
        pct,
        basis,
        annual: annualCents,
        monthly: Math.round(annualCents / 12),
    };
}
function sumEstimates(rows, key) {
    const values = rows
        .map(accountEstimates)
        .map((estimate) => estimate[key])
        .filter((value) => value !== null);
    if (rows.length === 0)
        return null;
    return values.reduce((sum, value) => sum + value, 0);
}
export function InvestmentsTab({ onAdd, onEdit, }) {
    const accounts = useQuery(api.accounts.list, {});
    const [view, setView] = useState("monthly");
    const rows = (accounts ?? []).filter((account) => account.kind === "investment");
    const invested = rows.reduce((sum, row) => sum + row.balance, 0);
    const monthlyEstimate = sumEstimates(rows, "monthly");
    const annualEstimate = sumEstimates(rows, "annual");
    const estimate = view === "monthly" ? monthlyEstimate : annualEstimate;
    const estimateLabel = view === "monthly" ? "Estimated next month" : "Estimated next year";
    if (accounts === undefined) {
        return (_jsx("div", { className: "surface-card text-muted-foreground p-10 text-center text-sm", children: "Loading investments\u2026" }));
    }
    if (rows.length === 0) {
        return (_jsx("div", { className: "flex flex-col gap-5", children: _jsxs("div", { className: "surface-card flex flex-col items-center px-6 py-14 text-center", children: [_jsx("span", { className: "bg-primary/10 text-primary flex size-12 items-center justify-center rounded-xl", children: _jsx(TrendingUp, { className: "size-6" }) }), _jsx("h2", { className: "mt-5 text-lg font-semibold tracking-tight", children: "No investments yet" }), _jsx("p", { className: "text-muted-foreground mt-2 max-w-sm text-sm leading-6", children: "Add an Investment account with an estimated return \u2014 monthly or annual \u2014 and its growth is folded into the balance projection." }), _jsxs(Button, { onClick: onAdd, className: "mt-6 gap-2", children: [_jsx(Plus, { className: "size-4" }), "Add an investment"] })] }) }));
    }
    return (_jsxs("div", { className: "flex flex-col gap-5", children: [_jsxs("div", { className: "surface-card flex flex-wrap items-center justify-between gap-4 p-5", children: [_jsxs("div", { className: "flex flex-wrap gap-8", children: [_jsxs("div", { children: [_jsx("p", { className: "text-muted-foreground text-xs", children: "Invested balance" }), _jsx("p", { className: "mt-1 text-lg font-semibold tabular-nums", children: formatMoney(invested) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-muted-foreground text-xs", children: estimateLabel }), _jsxs("p", { className: cn("mt-1 text-lg font-semibold tabular-nums", (estimate ?? 0) >= 0 ? "text-positive" : "text-negative"), children: [(estimate ?? 0) >= 0 ? "+" : "\u2212", formatMoney(Math.abs(estimate ?? 0))] })] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "bg-muted flex rounded-lg p-1", children: [_jsx("button", { type: "button", onClick: () => setView("monthly"), className: cn("rounded-md px-3.5 py-1.5 text-sm font-medium transition-all", view === "monthly"
                                            ? "bg-card text-foreground shadow-[var(--shadow-soft)]"
                                            : "text-muted-foreground hover:text-foreground"), children: "Monthly" }), _jsx("button", { type: "button", onClick: () => setView("annual"), className: cn("rounded-md px-3.5 py-1.5 text-sm font-medium transition-all", view === "annual"
                                            ? "bg-card text-foreground shadow-[var(--shadow-soft)]"
                                            : "text-muted-foreground hover:text-foreground"), children: "Annual" })] }), _jsxs(Button, { onClick: onAdd, className: "gap-2", children: [_jsx(Plus, { className: "size-4" }), "Add investment"] })] })] }), _jsxs("div", { className: "surface-card p-6", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsxs("h2", { className: "flex items-center gap-2 text-base font-semibold tracking-tight", children: [_jsx(TrendingUp, { className: "text-muted-foreground size-4" }), "Holdings & return estimates"] }), _jsx("p", { className: "text-muted-foreground hidden text-xs sm:block", children: "Shown for each account's own rate basis" })] }), _jsx("ul", { className: "mt-2 flex flex-col", children: rows.map((row, index) => {
                            const estimateInfo = accountEstimates(row);
                            const displayValue = view === "monthly" ? estimateInfo.monthly : estimateInfo.annual;
                            const positive = (displayValue ?? 0) >= 0;
                            return (_jsxs("li", { children: [_jsxs("div", { className: "flex items-center gap-3 py-3.5", children: [_jsx("span", { className: cn("flex size-9 shrink-0 items-center justify-center rounded-lg", positive
                                                    ? "bg-positive/10 text-positive"
                                                    : "bg-negative/10 text-negative"), children: positive ? (_jsx(ArrowUpRight, { className: "size-4" })) : (_jsx(ArrowDownRight, { className: "size-4" })) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-sm font-medium", children: row.name }), _jsxs("p", { className: "text-muted-foreground truncate text-xs", children: [formatMoney(row.balance), row.institution ? ` · ${row.institution}` : ""] })] }), _jsxs("div", { className: "hidden shrink-0 text-right sm:block", children: [_jsx("p", { className: cn("text-sm font-semibold tabular-nums", positive ? "text-positive" : "text-negative"), children: displayValue === null
                                                            ? "—"
                                                            : `${positive ? "+" : "\u2212"}${formatMoney(Math.abs(displayValue))}` }), _jsx("p", { className: "text-muted-foreground text-xs tabular-nums", children: view === "monthly" ? "this month" : "this year" })] }), estimateInfo.pct !== null && (_jsxs("span", { className: "border-border/70 bg-muted/60 text-muted-foreground hidden shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium tabular-nums md:inline-flex", children: [formatPct(estimateInfo.pct), "/", returnBasisLabel(row.returnBasis ?? "annual")] })), _jsx(Button, { variant: "ghost", size: "icon-sm", "aria-label": `Edit ${row.name}`, onClick: () => onEdit(row), children: _jsx(Pencil, { className: "size-3.5" }) })] }), index < rows.length - 1 && _jsx(Separator, { className: "opacity-60" })] }, row._id));
                        }) }), _jsx(Separator, { className: "my-4" }), _jsxs("div", { className: "text-muted-foreground flex items-start gap-2.5 text-xs leading-5", children: [_jsx(Info, { className: "mt-0.5 size-3.5 shrink-0" }), _jsx("p", { children: "These estimates compound daily inside the balance projection \u2014 see the Overview tab. Estimates only: actual market returns vary." })] })] }), _jsxs("div", { className: "surface-card flex items-center gap-3 p-5", children: [_jsx(LineChart, { className: "text-muted-foreground size-4 shrink-0" }), _jsx("p", { className: "text-muted-foreground text-sm", children: "Estimated returns are included in the projection on the Overview tab automatically \u2014 nothing else to switch on." })] })] }));
}
