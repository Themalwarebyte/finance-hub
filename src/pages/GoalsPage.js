import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { GoalDialog } from "@/components/finance/GoalDialog";
import { GoalContributeDialog } from "@/components/finance/GoalContributeDialog";
import { EmptyCard, LoadingCard, PageHeader } from "@/components/finance/PageParts";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { api } from "@/convex/_generated/api";
import { formatMoney } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import { Pencil, Plus, Target, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
export default function GoalsPage() {
    const goals = useQuery(api.goals.list, {});
    const removeGoal = useMutation(api.goals.remove);
    const [addOpen, setAddOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [contributing, setContributing] = useState(null);
    const [confirmId, setConfirmId] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const rows = goals ?? [];
    const totalSaved = rows.reduce((sum, goal) => sum + goal.saved, 0);
    const totalTarget = rows.reduce((sum, goal) => sum + goal.targetAmount, 0);
    const handleDelete = async () => {
        if (!confirmId)
            return;
        setDeleting(true);
        try {
            await removeGoal({ goalId: confirmId });
            toast.success("Goal removed — contributions stay in your ledger");
        }
        catch {
            toast.error("Couldn't remove that goal.");
        }
        finally {
            setDeleting(false);
            setConfirmId(null);
        }
    };
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx(PageHeader, { title: "Savings goals", subtitle: "Progress comes from real contributions recorded in your ledger.", actions: _jsxs(Button, { onClick: () => setAddOpen(true), className: "gap-2", children: [_jsx(Plus, { className: "size-4" }), "New goal"] }) }), rows.length > 0 && (_jsxs("div", { className: "surface-card flex flex-wrap gap-8 p-5", children: [_jsxs("div", { children: [_jsx("p", { className: "text-muted-foreground text-xs", children: "Total saved" }), _jsx("p", { className: "text-positive mt-1 text-lg font-semibold tabular-nums", children: formatMoney(totalSaved, { cents: false }) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-muted-foreground text-xs", children: "Total targeted" }), _jsx("p", { className: "mt-1 text-lg font-semibold tabular-nums", children: formatMoney(totalTarget, { cents: false }) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-muted-foreground text-xs", children: "Active goals" }), _jsx("p", { className: "mt-1 text-lg font-semibold tabular-nums", children: rows.length })] })] })), goals === undefined ? (_jsx(LoadingCard, { label: "Loading goals\u2026" })) : rows.length === 0 ? (_jsx(EmptyCard, { icon: _jsx(Target, { className: "size-6" }), title: "No savings goals yet", body: "Set a target \u2014 emergency fund, school fees, a car \u2014 and record contributions from any account. Progress builds from the ledger.", action: _jsxs(Button, { onClick: () => setAddOpen(true), className: "gap-2", children: [_jsx(Plus, { className: "size-4" }), "Create your first goal"] }) })) : (_jsx("div", { className: "grid gap-4 sm:grid-cols-2 xl:grid-cols-3", children: rows.map((goal) => (_jsxs("div", { className: "surface-card flex flex-col gap-4 p-5", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold", children: goal.name }), _jsxs("p", { className: "text-muted-foreground text-xs", children: [goal.accountName ? `Saves into ${goal.accountName}` : "Unlinked", goal.targetDate
                                                            ? ` · by ${new Date(goal.targetDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
                                                            : ""] })] }), _jsxs("div", { className: "flex shrink-0 gap-1", children: [_jsx(Button, { variant: "ghost", size: "icon-sm", "aria-label": `Edit ${goal.name}`, onClick: () => setEditing(goal), children: _jsx(Pencil, { className: "size-3.5" }) }), _jsx(Button, { variant: "ghost", size: "icon-sm", "aria-label": `Delete ${goal.name}`, className: "text-muted-foreground hover:text-destructive", onClick: () => setConfirmId(goal._id), children: _jsx(Trash2, { className: "size-3.5" }) })] })] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-baseline justify-between", children: [_jsxs("p", { className: "text-xl font-semibold tabular-nums", children: [formatMoney(goal.saved, { cents: false }), _jsxs("span", { className: "text-muted-foreground text-sm font-normal", children: [" ", "/ ", formatMoney(goal.targetAmount, { cents: false })] })] }), _jsx("span", { className: goal.status === "completed"
                                                        ? "text-positive text-xs font-medium"
                                                        : goal.status === "behind"
                                                            ? "text-amber-600 text-xs font-medium"
                                                            : "text-muted-foreground text-xs font-medium", children: goal.status === "completed"
                                                        ? "Goal reached"
                                                        : goal.status === "behind"
                                                            ? "Behind pace"
                                                            : `${Math.round(goal.progressPct)}%` })] }), _jsx(Progress, { className: "mt-2 h-2", value: goal.progressPct })] }), _jsx("div", { className: "text-muted-foreground text-xs leading-5", children: goal.remaining > 0 ? (_jsxs(_Fragment, { children: [formatMoney(goal.remaining, { cents: false }), " to go", goal.monthlyRequired > 0 && (_jsxs(_Fragment, { children: [" \u00B7 ", formatMoney(goal.monthlyRequired, { cents: false }), "/mo needed"] }))] })) : ("Target reached — nicely done.") }), _jsxs(Button, { variant: "outline", size: "sm", className: "mt-auto w-full gap-2", onClick: () => setContributing(goal), disabled: goal.status === "completed", children: [_jsx(Plus, { className: "size-4" }), "Record contribution"] })] }, goal._id))) }))] }), _jsx(GoalDialog, { open: addOpen || editing !== null, onOpenChange: (open) => {
                    if (!open) {
                        setAddOpen(false);
                        setEditing(null);
                    }
                }, goal: editing }), _jsx(GoalContributeDialog, { goal: contributing, onOpenChange: (open) => !open && setContributing(null) }), _jsx(AlertDialog, { open: confirmId !== null, onOpenChange: (open) => !open && setConfirmId(null), children: _jsxs(AlertDialogContent, { children: [_jsxs(AlertDialogHeader, { children: [_jsx(AlertDialogTitle, { children: "Delete this goal?" }), _jsx(AlertDialogDescription, { children: "Contributions already recorded stay in your transaction history." })] }), _jsxs(AlertDialogFooter, { children: [_jsx(AlertDialogCancel, { children: "Keep it" }), _jsx(AlertDialogAction, { onClick: () => void handleDelete(), disabled: deleting, className: "bg-destructive hover:bg-destructive/90 text-white", children: "Delete goal" })] })] }) })] }));
}
