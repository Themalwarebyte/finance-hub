import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { PageHeader } from "@/components/finance/PageParts";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent, } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import { formatCompactMoney, formatMoney, formatRelativeDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, LineChart } from "lucide-react";
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";
const chartConfig = {
    balance: { label: "Projected balance", color: "var(--chart-1)" },
};
const WINDOWS = [
    { value: 7, label: "Next 7 days" },
    { value: 30, label: "Next 30 days" },
    { value: 60, label: "Next 60 days" },
    { value: 90, label: "Next 90 days" },
];
export default function ForecastPage() {
    const [windowDays, setWindowDays] = useState(30);
    const data = useQuery(api.finance.overview, { windowDays });
    if (data === undefined) {
        return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx("div", { className: "bg-muted h-9 w-56 animate-pulse rounded-lg" }), _jsx("div", { className: "bg-muted h-80 animate-pulse rounded-xl" })] }));
    }
    if (data === null || !data.hasData) {
        return (_jsxs(_Fragment, { children: [_jsx(PageHeader, { title: "Forecast", subtitle: "Add accounts to project your balance forward." }), _jsx("div", { className: "surface-card text-muted-foreground p-10 text-center text-sm", children: "Add an account first \u2014 the forecast needs a starting balance." })] }));
    }
    const { projection } = data;
    const positive = projection.change >= 0;
    // Lowest point in the window — flag it if it dips near or below zero.
    const lowPoint = projection.points.reduce((lowest, point) => (point.balance < lowest.balance ? point : lowest), projection.points[0]);
    const lowWarning = lowPoint && lowPoint.balance < 50000;
    const milestones = WINDOWS.map((w) => {
        const point = projection.points[Math.min(w.value, projection.points.length - 1)];
        return { days: w.value, balance: point?.balance ?? projection.startBalance };
    });
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx(PageHeader, { title: "Forecast", subtitle: "Projected balances from recurring money and investment returns.", actions: _jsxs(Select, { value: String(windowDays), onValueChange: (value) => setWindowDays(Number(value)), children: [_jsx(SelectTrigger, { className: "w-[160px]", children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: WINDOWS.map((option) => (_jsx(SelectItem, { value: String(option.value), children: option.label }, option.value))) })] }) }), lowWarning && (_jsxs("div", { className: "border-destructive/30 bg-destructive/5 text-destructive flex items-center gap-3 rounded-xl border px-4 py-3 text-sm", children: [_jsx(AlertTriangle, { className: "size-4 shrink-0" }), "Projected low balance on ", lowPoint.label, ": ", formatMoney(lowPoint.balance)] })), _jsx("div", { className: "grid gap-4 sm:grid-cols-3", children: milestones.map((milestone) => (_jsxs("div", { className: "surface-card p-5", children: [_jsxs("p", { className: "text-muted-foreground text-xs", children: ["Balance in ", milestone.days, " days"] }), _jsx("p", { className: "mt-1 text-xl font-semibold tabular-nums", children: formatMoney(milestone.balance, { cents: false }) })] }, milestone.days))) }), _jsxs("section", { className: "surface-card flex flex-col p-6", children: [_jsxs("div", { className: "flex flex-wrap items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsxs("h2", { className: "flex items-center gap-2 text-base font-semibold tracking-tight", children: [_jsx(LineChart, { className: "text-muted-foreground size-4" }), "Balance projection"] }), _jsx("p", { className: "text-muted-foreground mt-1 text-sm", children: "Scheduled money plus estimated investment returns, day by day." })] }), _jsxs(Badge, { variant: "outline", className: cn("gap-1 border-transparent tabular-nums", positive ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative"), children: [positive ? "+" : "−", formatMoney(Math.abs(projection.change)), " over ", windowDays, " days"] })] }), _jsx(ChartContainer, { config: chartConfig, className: "mt-5 aspect-auto h-[280px] w-full", children: _jsxs(AreaChart, { data: projection.points, margin: { top: 8, right: 8, bottom: 0, left: 0 }, children: [_jsx("defs", { children: _jsxs("linearGradient", { id: "forecastFill", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "0%", stopColor: "var(--color-balance)", stopOpacity: 0.26 }), _jsx("stop", { offset: "100%", stopColor: "var(--color-balance)", stopOpacity: 0.02 })] }) }), _jsx(CartesianGrid, { vertical: false, strokeDasharray: "3 3" }), _jsx(XAxis, { dataKey: "label", tickLine: false, axisLine: false, tickMargin: 10, minTickGap: 32 }), _jsx(YAxis, { tickLine: false, axisLine: false, width: 58, tickFormatter: (value) => formatCompactMoney(value) }), _jsx(ChartTooltip, { content: _jsx(ChartTooltipContent, { labelKey: "label", formatter: (value) => (_jsx("span", { className: "font-medium tabular-nums", children: formatMoney(Number(value)) })) }) }), _jsx(ReferenceLine, { y: projection.startBalance, stroke: "var(--border)", strokeDasharray: "4 4" }), _jsx(Area, { type: "monotone", dataKey: "balance", stroke: "var(--color-balance)", strokeWidth: 2.25, fill: "url(#forecastFill)", dot: false, activeDot: { r: 4, strokeWidth: 2 } })] }) }), _jsxs("div", { className: "border-border/70 mt-4 grid gap-4 border-t pt-4 sm:grid-cols-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-muted-foreground text-xs", children: "Starting balance" }), _jsx("p", { className: "mt-1 text-sm font-semibold tabular-nums", children: formatMoney(projection.startBalance) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-muted-foreground text-xs", children: "Scheduled in" }), _jsxs("p", { className: "text-positive mt-1 text-sm font-semibold tabular-nums", children: ["+", formatMoney(projection.scheduledIn)] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-muted-foreground text-xs", children: "Scheduled out" }), _jsxs("p", { className: "text-negative mt-1 text-sm font-semibold tabular-nums", children: ["\u2212", formatMoney(projection.scheduledOut)] })] })] })] }), _jsxs("section", { className: "surface-card p-6", children: [_jsx("h2", { className: "text-base font-semibold tracking-tight", children: "Upcoming money" }), _jsxs("p", { className: "text-muted-foreground mt-1 text-sm", children: [projection.scheduledCount, " scheduled item", projection.scheduledCount === 1 ? "" : "s", " in the next ", windowDays, " days."] }), data.upcoming.length === 0 ? (_jsx("p", { className: "text-muted-foreground mt-4 text-sm", children: "Nothing scheduled \u2014 add recurring items on the Bills page." })) : (_jsx("ul", { className: "mt-3 flex flex-col", children: data.upcoming.slice(0, 10).map((item) => (_jsxs("li", { className: "flex items-center gap-3 py-2.5", children: [_jsx("span", { className: cn("flex size-8 shrink-0 items-center justify-center rounded-lg", item.direction === "in"
                                        ? "bg-positive/10 text-positive"
                                        : "bg-muted text-muted-foreground"), children: item.direction === "in" ? (_jsx(ArrowDownLeft, { className: "size-4" })) : (_jsx(ArrowUpRight, { className: "size-4" })) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-sm font-medium", children: item.description }), _jsxs("p", { className: "text-muted-foreground text-xs", children: [formatRelativeDay(item.date), " \u00B7 ", item.accountName] })] }), _jsxs("span", { className: "text-sm font-semibold tabular-nums", children: [item.direction === "in" ? "+" : "−", formatMoney(item.amount)] })] }, item._id))) }))] })] }));
}
