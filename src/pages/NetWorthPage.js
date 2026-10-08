import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { PageHeader } from "@/components/finance/PageParts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, } from "@/components/ui/chart";
import { Separator } from "@/components/ui/separator";
import { api } from "@/convex/_generated/api";
import { KIND_LABELS } from "@/lib/finance";
import { formatCompactMoney, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { Camera, Landmark, TrendingUp } from "lucide-react";
import { useEffect } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
const chartConfig = {
    netWorth: { label: "Net worth", color: "var(--chart-1)" },
};
export default function NetWorthPage() {
    const summary = useQuery(api.networth.summary, {});
    const history = useQuery(api.networth.history, { limit: 90 });
    const ensureSnapshot = useMutation(api.networth.ensureSnapshot);
    // Record today's position once per visit so the trend builds itself.
    useEffect(() => {
        if (summary !== undefined && summary !== null) {
            void ensureSnapshot({}).catch(() => undefined);
        }
    }, [summary, ensureSnapshot]);
    if (summary === undefined) {
        return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx("div", { className: "bg-muted h-9 w-56 animate-pulse rounded-lg" }), _jsx("div", { className: "bg-muted h-64 animate-pulse rounded-xl" })] }));
    }
    if (summary === null || summary.rows.length === 0) {
        return (_jsxs(_Fragment, { children: [_jsx(PageHeader, { title: "Net worth", subtitle: "Assets minus liabilities, from your accounts." }), _jsx("div", { className: "surface-card text-muted-foreground p-10 text-center text-sm", children: "Add accounts to see your net worth \u2014 every balance contributes automatically." })] }));
    }
    const assetRows = summary.rows.filter((row) => !row.isLiability);
    const liabilityRows = summary.rows.filter((row) => row.isLiability);
    const historyPoints = (history ?? []).map((row) => ({
        label: new Date(row.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        netWorth: row.netWorth,
    }));
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx(PageHeader, { title: "Net worth", subtitle: "Everything you hold, minus everything you owe." }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-3", children: [_jsxs("div", { className: "border-transparent bg-primary text-primary-foreground surface-card p-5", children: [_jsx("p", { className: "text-primary-foreground/70 text-[11px] font-semibold tracking-[0.14em] uppercase", children: "Net worth" }), _jsx("p", { className: "mt-2 text-[28px] font-semibold tracking-tight tabular-nums", children: formatMoney(summary.netWorth, { cents: false }) })] }), _jsxs("div", { className: "surface-card p-5", children: [_jsx("p", { className: "text-muted-foreground text-xs", children: "Total assets" }), _jsx("p", { className: "text-positive mt-2 text-2xl font-semibold tabular-nums", children: formatMoney(summary.assets, { cents: false }) })] }), _jsxs("div", { className: "surface-card p-5", children: [_jsx("p", { className: "text-muted-foreground text-xs", children: "Total liabilities" }), _jsx("p", { className: "text-negative mt-2 text-2xl font-semibold tabular-nums", children: formatMoney(summary.liabilities, { cents: false }) })] })] }), historyPoints.length > 1 && (_jsxs("section", { className: "surface-card p-6", children: [_jsxs("h2", { className: "flex items-center gap-2 text-base font-semibold tracking-tight", children: [_jsx(TrendingUp, { className: "text-muted-foreground size-4" }), "Net-worth trend"] }), _jsx("p", { className: "text-muted-foreground mt-1 text-sm", children: "A snapshot is recorded each time you visit \u2014 watch it grow over time." }), _jsx(ChartContainer, { config: chartConfig, className: "mt-4 aspect-auto h-[220px] w-full", children: _jsxs(AreaChart, { data: historyPoints, margin: { top: 8, right: 8, bottom: 0, left: 0 }, children: [_jsx("defs", { children: _jsxs("linearGradient", { id: "netWorthFill", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "0%", stopColor: "var(--color-net-worth)", stopOpacity: 0.26 }), _jsx("stop", { offset: "100%", stopColor: "var(--color-net-worth)", stopOpacity: 0.02 })] }) }), _jsx(CartesianGrid, { vertical: false, strokeDasharray: "3 3" }), _jsx(XAxis, { dataKey: "label", tickLine: false, axisLine: false, tickMargin: 10, minTickGap: 40 }), _jsx(YAxis, { tickLine: false, axisLine: false, width: 58, tickFormatter: (value) => formatCompactMoney(value) }), _jsx(ChartTooltip, { content: _jsx(ChartTooltipContent, { labelKey: "label", formatter: (value) => (_jsx("span", { className: "font-medium tabular-nums", children: formatMoney(Number(value)) })) }) }), _jsx(Area, { type: "monotone", dataKey: "netWorth", stroke: "var(--color-net-worth)", strokeWidth: 2.25, fill: "url(#netWorthFill)", dot: false })] }) })] })), _jsxs("div", { className: "grid gap-6 lg:grid-cols-2", children: [_jsxs("section", { className: "surface-card p-6", children: [_jsxs("h2", { className: "flex items-center gap-2 text-base font-semibold tracking-tight", children: [_jsx(Landmark, { className: "text-muted-foreground size-4" }), "Assets"] }), _jsx("ul", { className: "mt-3 flex flex-col", children: assetRows.map((row, index) => (_jsxs("li", { children: [_jsxs("div", { className: "flex items-center gap-3 py-2.5", children: [_jsx("span", { className: cn("size-2.5 shrink-0 rounded-full", "bg-positive/60") }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-sm font-medium", children: row.name }), _jsx("p", { className: "text-muted-foreground text-xs", children: KIND_LABELS[row.kind] })] }), _jsx("span", { className: "text-sm font-semibold tabular-nums", children: formatMoney(row.balance, { cents: false }) })] }), index < assetRows.length - 1 && _jsx(Separator, { className: "opacity-60" })] }, row._id))) })] }), _jsxs("section", { className: "surface-card p-6", children: [_jsxs("h2", { className: "flex items-center gap-2 text-base font-semibold tracking-tight", children: [_jsx(Camera, { className: "text-muted-foreground size-4 rotate-180" }), "Liabilities"] }), liabilityRows.length === 0 ? (_jsx("p", { className: "text-muted-foreground mt-3 text-sm", children: "No liabilities \u2014 debt free!" })) : (_jsx("ul", { className: "mt-3 flex flex-col", children: liabilityRows.map((row, index) => (_jsxs("li", { children: [_jsxs("div", { className: "flex items-center gap-3 py-2.5", children: [_jsx("span", { className: "bg-negative/60 size-2.5 shrink-0 rounded-full" }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-sm font-medium", children: row.name }), _jsx("p", { className: "text-muted-foreground text-xs", children: KIND_LABELS[row.kind] })] }), _jsx("span", { className: "text-negative text-sm font-semibold tabular-nums", children: formatMoney(Math.abs(row.balance), { cents: false }) })] }), index < liabilityRows.length - 1 && _jsx(Separator, { className: "opacity-60" })] }, row._id))) }))] })] })] }));
}
