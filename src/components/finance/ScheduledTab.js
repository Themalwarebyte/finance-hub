import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { api } from "@/convex/_generated/api";
import { frequencyLabel } from "@/lib/finance";
import { formatMoney, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { ArrowDownLeft, ArrowUpRight, CalendarClock, Plus, Trash2, } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
export function ScheduledTab({ onAdd }) {
    const items = useQuery(api.recurring.list, {});
    const setActive = useMutation(api.recurring.setActive);
    const removeRecurring = useMutation(api.recurring.remove);
    const [pendingId, setPendingId] = useState(null);
    const rows = items ?? [];
    const activeRows = rows.filter((row) => row.active);
    const monthlyIn = activeRows
        .filter((row) => row.direction === "in")
        .reduce((sum, row) => sum + row.amount, 0);
    const monthlyOut = activeRows
        .filter((row) => row.direction === "out")
        .reduce((sum, row) => sum + row.amount, 0);
    const handleToggle = async (id, active) => {
        try {
            await setActive({ recurringId: id, active });
            toast.success(active ? "Back in the projection" : "Paused");
        }
        catch {
            toast.error("Couldn't update that item.");
        }
    };
    const handleDelete = async (id) => {
        setPendingId(id);
        try {
            await removeRecurring({ recurringId: id });
            toast.success("Scheduled item removed");
        }
        catch {
            toast.error("Couldn't remove that item.");
        }
        finally {
            setPendingId(null);
        }
    };
    return (_jsxs("div", { className: "flex flex-col gap-5", children: [_jsxs("div", { className: "surface-card flex flex-wrap items-center justify-between gap-4 p-5", children: [_jsxs("div", { className: "flex flex-wrap gap-8", children: [_jsxs("div", { children: [_jsx("p", { className: "text-muted-foreground text-xs", children: "Active items" }), _jsx("p", { className: "mt-1 text-lg font-semibold tabular-nums", children: activeRows.length })] }), _jsxs("div", { children: [_jsx("p", { className: "text-muted-foreground text-xs", children: "Recurring money in" }), _jsxs("p", { className: "text-positive mt-1 text-lg font-semibold tabular-nums", children: ["+", formatMoney(monthlyIn)] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-muted-foreground text-xs", children: "Recurring money out" }), _jsxs("p", { className: "text-negative mt-1 text-lg font-semibold tabular-nums", children: ["\u2212", formatMoney(monthlyOut)] })] })] }), _jsxs(Button, { onClick: onAdd, className: "gap-2", children: [_jsx(Plus, { className: "size-4" }), "Schedule money"] })] }), _jsx("p", { className: "text-muted-foreground text-xs leading-5", children: "Totals above show each item's amount once \u2014 the projection handles how often it actually repeats." }), items === undefined ? (_jsx("div", { className: "surface-card text-muted-foreground p-10 text-center text-sm", children: "Loading scheduled money\u2026" })) : rows.length === 0 ? (_jsxs("div", { className: "surface-card flex flex-col items-center px-6 py-14 text-center", children: [_jsx("span", { className: "bg-primary/10 text-primary flex size-12 items-center justify-center rounded-xl", children: _jsx(CalendarClock, { className: "size-6" }) }), _jsx("h2", { className: "mt-5 text-lg font-semibold tracking-tight", children: "Project your next month" }), _jsx("p", { className: "text-muted-foreground mt-2 max-w-sm text-sm leading-6", children: "Add rent, paychecks and subscriptions \u2014 Tally places them on the right days and draws your balance forward." }), _jsxs(Button, { onClick: onAdd, className: "mt-6 gap-2", children: [_jsx(Plus, { className: "size-4" }), "Schedule your first item"] })] })) : (_jsx("div", { className: "surface-card flex flex-col p-6", children: _jsx("ul", { className: "flex flex-col", children: rows.map((item, index) => (_jsxs("li", { children: [_jsxs("div", { className: "flex items-center gap-3 py-3.5", children: [_jsx("span", { className: cn("flex size-9 shrink-0 items-center justify-center rounded-lg", item.direction === "in"
                                            ? "bg-positive/10 text-positive"
                                            : "bg-negative/10 text-negative", !item.active && "opacity-40"), children: item.direction === "in" ? (_jsx(ArrowDownLeft, { className: "size-4" })) : (_jsx(ArrowUpRight, { className: "size-4" })) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: cn("truncate text-sm font-medium", !item.active && "text-muted-foreground"), children: item.description }), _jsxs("p", { className: "text-muted-foreground truncate text-xs", children: [frequencyLabel(item.frequency), " \u00B7 next", " ", formatShortDate(item.nextDate), " \u00B7 ", item.accountName] })] }), _jsxs("span", { className: cn("hidden shrink-0 text-sm font-semibold tabular-nums sm:block", !item.active
                                            ? "text-muted-foreground"
                                            : item.direction === "in"
                                                ? "text-positive"
                                                : "text-foreground"), children: [item.direction === "in" ? "+" : "\u2212", formatMoney(item.amount)] }), _jsx(Switch, { checked: item.active, onCheckedChange: (checked) => void handleToggle(item._id, checked), "aria-label": `${item.active ? "Pause" : "Resume"} ${item.description}` }), _jsx(Button, { variant: "ghost", size: "icon-sm", "aria-label": `Delete ${item.description}`, onClick: () => void handleDelete(item._id), disabled: pendingId === item._id, className: "text-muted-foreground hover:text-destructive", children: _jsx(Trash2, { className: "size-3.5" }) })] }), index < rows.length - 1 && _jsx(Separator, { className: "opacity-60" })] }, item._id))) }) }))] }));
}
