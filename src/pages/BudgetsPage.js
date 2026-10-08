import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { BudgetDialog } from "@/components/finance/BudgetDialog";
import { EmptyCard, LoadingCard, PageHeader } from "@/components/finance/PageParts";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { api } from "@/convex/_generated/api";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { Copy, PiggyBank, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
export default function BudgetsPage() {
    const budgets = useQuery(api.budgets.list, {});
    const removeBudget = useMutation(api.budgets.remove);
    const copyPrevious = useMutation(api.budgets.copyPrevious);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [confirmId, setConfirmId] = useState(null);
    const [copying, setCopying] = useState(false);
    const rows = budgets ?? [];
    const handleDelete = async () => {
        if (!confirmId)
            return;
        setDeletingId(confirmId);
        try {
            await removeBudget({ budgetId: confirmId });
            toast.success("Budget removed");
        }
        catch {
            toast.error("Couldn't remove that budget.");
        }
        finally {
            setDeletingId(null);
            setConfirmId(null);
        }
    };
    const handleCopy = async () => {
        setCopying(true);
        try {
            const copied = await copyPrevious({});
            toast.success(copied > 0 ? `${copied} budget${copied === 1 ? "" : "s"} copied` : "Nothing to copy");
        }
        catch {
            toast.error("Couldn't copy budgets.");
        }
        finally {
            setCopying(false);
        }
    };
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx(PageHeader, { title: "Budgets", subtitle: "Spending plans per category, measured against real transactions.", actions: _jsxs(_Fragment, { children: [_jsxs(Button, { variant: "outline", onClick: () => void handleCopy(), disabled: copying, className: "gap-2", children: [_jsx(Copy, { className: "size-4" }), "Copy last month"] }), _jsxs(Button, { onClick: () => {
                                        setEditing(null);
                                        setDialogOpen(true);
                                    }, className: "gap-2", children: [_jsx(Plus, { className: "size-4" }), "New budget"] })] }) }), budgets === undefined ? (_jsx(LoadingCard, { label: "Loading budgets\u2026" })) : rows.length === 0 ? (_jsx(EmptyCard, { icon: _jsx(PiggyBank, { className: "size-6" }), title: "No budgets yet", body: "Create a monthly budget for a category like Groceries or Transport. Tally measures it against what you actually spend.", action: _jsxs(Button, { onClick: () => {
                                setEditing(null);
                                setDialogOpen(true);
                            }, className: "gap-2", children: [_jsx(Plus, { className: "size-4" }), "Create your first budget"] }) })) : (_jsx("div", { className: "grid gap-4 sm:grid-cols-2 xl:grid-cols-3", children: rows.map((budget) => {
                            const over = budget.remaining < 0;
                            return (_jsxs("div", { className: "surface-card flex flex-col gap-4 p-5", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold", children: budget.name }), _jsxs("p", { className: "text-muted-foreground text-xs", children: [budget.category, budget.subcategory ? ` · ${budget.subcategory}` : "", " \u00B7", " ", budget.period === "custom" ? "Custom period" : budget.period === "annual" ? "Annual" : "Monthly"] })] }), _jsxs("div", { className: "flex shrink-0 gap-1", children: [_jsx(Button, { variant: "ghost", size: "icon-sm", "aria-label": `Edit ${budget.name}`, onClick: () => {
                                                            setEditing(budget);
                                                            setDialogOpen(true);
                                                        }, children: _jsx(Pencil, { className: "size-3.5" }) }), _jsx(Button, { variant: "ghost", size: "icon-sm", "aria-label": `Delete ${budget.name}`, className: "text-muted-foreground hover:text-destructive", onClick: () => setConfirmId(budget._id), children: _jsx(Trash2, { className: "size-3.5" }) })] })] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-baseline justify-between", children: [_jsxs("p", { className: "text-xl font-semibold tabular-nums", children: [formatMoney(budget.spent, { cents: false }), _jsxs("span", { className: "text-muted-foreground text-sm font-normal", children: [" ", "/ ", formatMoney(budget.amount, { cents: false })] })] }), _jsxs("span", { className: cn("text-xs font-medium tabular-nums", over ? "text-negative" : budget.usedPct >= 80 ? "text-amber-600" : "text-positive"), children: [Math.round(budget.usedPct), "%"] })] }), _jsx(Progress, { className: "mt-2 h-2", value: Math.min(100, budget.usedPct) })] }), _jsxs("div", { className: "text-muted-foreground flex items-center justify-between text-xs", children: [_jsx("span", { children: over
                                                    ? `${formatMoney(Math.abs(budget.remaining))} over budget`
                                                    : `${formatMoney(budget.remaining)} left` }), _jsxs("span", { children: [budget.daysRemaining, "d left \u00B7 proj. ", formatMoney(budget.projected, { cents: false })] })] }), budget.overBudget && (_jsx("span", { className: "text-negative text-xs font-medium", children: "Over budget this period" }))] }, budget._id));
                        }) }))] }), _jsx(BudgetDialog, { open: dialogOpen, onOpenChange: setDialogOpen, budget: editing }), _jsxs(AlertDialog, { open: confirmId !== null, onOpenChange: (open) => !open && setConfirmId(null), children: [_jsxs(AlertDialogContent, { children: [_jsxs(AlertDialogHeader, { children: [_jsx(AlertDialogTitle, { children: "Delete this budget?" }), _jsx(AlertDialogDescription, { children: "The budget is removed but your transactions stay untouched." })] }), _jsxs(AlertDialogFooter, { children: [_jsx(AlertDialogCancel, { children: "Keep it" }), _jsx(AlertDialogAction, { onClick: () => void handleDelete(), disabled: deletingId !== null, className: "bg-destructive hover:bg-destructive/90 text-white", children: "Delete budget" })] })] }), "          "] })] }));
}
