import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { api } from "@/convex/_generated/api";
import { formatMoney, formatRelativeDate, formatSignedMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { ArrowDownLeft, ArrowUpRight, Clock, Plus, Receipt, Trash2, } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
export function ActivityTab({ onAdd, }) {
    const transactions = useQuery(api.transactions.list, { limit: 150 });
    const removeTransaction = useMutation(api.transactions.remove);
    const [filter, setFilter] = useState("all");
    const [pendingId, setPendingId] = useState(null);
    const rows = useMemo(() => {
        const all = transactions ?? [];
        return filter === "all" ? all : all.filter((row) => row.direction === filter);
    }, [transactions, filter]);
    const monthTotals = useMemo(() => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        let moneyIn = 0;
        let moneyOut = 0;
        for (const row of transactions ?? []) {
            if (row.date < start)
                continue;
            if (row.direction === "in")
                moneyIn += row.amount;
            else
                moneyOut += row.amount;
        }
        return { moneyIn, moneyOut };
    }, [transactions]);
    const groups = useMemo(() => {
        const map = new Map();
        for (const row of rows) {
            const key = formatRelativeDate(row.date);
            const bucket = map.get(key) ?? [];
            bucket.push(row);
            map.set(key, bucket);
        }
        return Array.from(map.entries());
    }, [rows]);
    const handleDelete = async (id) => {
        setPendingId(id);
        try {
            await removeTransaction({ transactionId: id });
            toast.success("Entry removed");
        }
        catch {
            toast.error("Couldn't remove that entry.");
        }
        finally {
            setPendingId(null);
        }
    };
    return (_jsxs("div", { className: "flex flex-col gap-5", children: [_jsxs("div", { className: "surface-card flex flex-wrap items-center justify-between gap-4 p-5", children: [_jsxs("div", { className: "flex flex-wrap gap-8", children: [_jsxs("div", { children: [_jsx("p", { className: "text-muted-foreground text-xs", children: "Money in this month" }), _jsxs("p", { className: "text-positive mt-1 text-lg font-semibold tabular-nums", children: ["+", formatMoney(monthTotals.moneyIn)] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-muted-foreground text-xs", children: "Money out this month" }), _jsxs("p", { className: "text-negative mt-1 text-lg font-semibold tabular-nums", children: ["\u2212", formatMoney(monthTotals.moneyOut)] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-muted-foreground text-xs", children: "Net this month" }), _jsxs("p", { className: "mt-1 text-lg font-semibold tabular-nums", children: [monthTotals.moneyIn - monthTotals.moneyOut >= 0 ? "+" : "\u2212", formatMoney(Math.abs(monthTotals.moneyIn - monthTotals.moneyOut))] })] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsxs(Button, { variant: "outline", onClick: () => onAdd("in"), className: "gap-2", children: [_jsx(ArrowDownLeft, { className: "size-4" }), "Money in"] }), _jsxs(Button, { onClick: () => onAdd("out"), className: "gap-2", children: [_jsx(Plus, { className: "size-4" }), "Money out"] })] })] }), _jsx("div", { className: "flex items-center gap-2", children: [
                    { value: "all", label: "All" },
                    { value: "in", label: "Money in" },
                    { value: "out", label: "Money out" },
                ].map((option) => (_jsx("button", { type: "button", onClick: () => setFilter(option.value), className: cn("rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors", filter === option.value
                        ? "bg-foreground text-background border-transparent"
                        : "border-border text-muted-foreground hover:text-foreground"), children: option.label }, option.value))) }), transactions === undefined ? (_jsx("div", { className: "surface-card text-muted-foreground p-10 text-center text-sm", children: "Loading activity\u2026" })) : rows.length === 0 ? (_jsxs("div", { className: "surface-card flex flex-col items-center px-6 py-14 text-center", children: [_jsx("span", { className: "bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-xl", children: _jsx(Receipt, { className: "size-6" }) }), _jsx("h2", { className: "mt-5 text-lg font-semibold tracking-tight", children: "No entries here yet" }), _jsx("p", { className: "text-muted-foreground mt-2 max-w-sm text-sm leading-6", children: "Record money in and money out and it will show up here, grouped by day." }), _jsxs(Button, { onClick: () => onAdd("out"), className: "mt-6 gap-2", children: [_jsx(Plus, { className: "size-4" }), "Record money"] })] })) : (_jsx("div", { className: "surface-card flex flex-col p-6", children: groups.map(([label, items], groupIndex) => (_jsxs("div", { className: cn(groupIndex > 0 && "mt-6"), children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("p", { className: "text-muted-foreground text-xs font-semibold tracking-[0.1em] uppercase", children: label }), _jsxs("p", { className: "text-muted-foreground text-xs tabular-nums", children: [items.length, " entr", items.length === 1 ? "y" : "ies"] })] }), _jsx("ul", { className: "mt-2 flex flex-col", children: items.map((item, index) => (_jsxs("li", { children: [_jsxs("div", { className: "group flex items-center gap-3 py-3", children: [_jsx("span", { className: cn("flex size-9 shrink-0 items-center justify-center rounded-lg", item.direction === "in"
                                                    ? "bg-positive/10 text-positive"
                                                    : "bg-negative/10 text-negative"), children: item.direction === "in" ? (_jsx(ArrowDownLeft, { className: "size-4" })) : (_jsx(ArrowUpRight, { className: "size-4" })) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-sm font-medium", children: item.description }), _jsxs("p", { className: "text-muted-foreground flex items-center gap-1.5 truncate text-xs", children: [_jsx(Clock, { className: "size-3" }), item.category, " \u00B7 ", item.accountName] })] }), _jsx("span", { className: cn("shrink-0 text-sm font-semibold tabular-nums", item.direction === "in"
                                                    ? "text-positive"
                                                    : "text-foreground"), children: formatSignedMoney(item.amount, item.direction) }), _jsx(Button, { variant: "ghost", size: "icon-sm", "aria-label": `Delete ${item.description}`, onClick: () => void handleDelete(item._id), disabled: pendingId === item._id, className: "text-muted-foreground hover:text-destructive opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100", children: _jsx(Trash2, { className: "size-3.5" }) })] }), index < items.length - 1 && (_jsx(Separator, { className: "opacity-60" }))] }, item._id))) })] }, label))) }))] }));
}
