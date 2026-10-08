import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Skeleton } from "@/components/ui/skeleton";
/** Standard page header used by every finance page. */
export function PageHeader({ title, subtitle, actions, }) {
    return (_jsxs("div", { className: "flex flex-wrap items-end justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-semibold tracking-tight sm:text-[28px]", children: title }), subtitle && _jsx("p", { className: "text-muted-foreground mt-1 text-sm", children: subtitle })] }), actions && _jsx("div", { className: "flex flex-wrap items-center gap-2", children: actions })] }));
}
/** Small labelled stat, used inside summary strips and cards. */
export function MiniStat({ label, value, tone = "default", }) {
    const toneClass = tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : "";
    return (_jsxs("div", { children: [_jsx("p", { className: "text-muted-foreground text-xs", children: label }), _jsx("p", { className: `mt-1 text-sm font-semibold tabular-nums ${toneClass}`, children: value })] }));
}
/** Empty state card with an icon, message and optional action. */
export function EmptyCard({ icon, title, body, action, }) {
    return (_jsxs("div", { className: "surface-card flex flex-col items-center px-6 py-14 text-center", children: [_jsx("span", { className: "bg-primary/10 text-primary flex size-12 items-center justify-center rounded-xl", children: icon }), _jsx("h2", { className: "mt-5 text-lg font-semibold tracking-tight", children: title }), _jsx("p", { className: "text-muted-foreground mt-2 max-w-sm text-sm leading-6", children: body }), action && _jsx("div", { className: "mt-6", children: action })] }));
}
/** Loading state card. */
export function LoadingCard({ label = "Loading…" }) {
    return (_jsxs("div", { className: "surface-card p-6", children: [_jsx(Skeleton, { className: "bg-muted h-5 w-40" }), _jsxs("div", { className: "mt-4 space-y-3", children: [_jsx(Skeleton, { className: "bg-muted h-4 w-full" }), _jsx(Skeleton, { className: "bg-muted h-4 w-4/5" }), _jsx(Skeleton, { className: "bg-muted h-4 w-3/5" })] }), _jsx("span", { className: "sr-only", children: label })] }));
}
/** Percentage-change pill: green when a rise is good, red when a fall is good. */
export function ChangeBadge({ pct, invert = false, suffix = "vs last period", }) {
    if (pct === null)
        return null;
    const up = pct >= 0;
    const good = invert ? !up : up;
    return (_jsxs("span", { className: `inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${good ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative"}`, children: [up ? "▲" : "▼", " ", Math.abs(pct).toFixed(1), "%", " ", suffix && _jsx("span", { className: "text-muted-foreground font-normal", children: suffix })] }));
}
