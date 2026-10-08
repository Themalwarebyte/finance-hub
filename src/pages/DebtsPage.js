import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { DebtDialog } from "@/components/finance/DebtDialog";
import { DebtPayDialog } from "@/components/finance/DebtPayDialog";
import { EmptyCard, LoadingCard, PageHeader, MiniStat } from "@/components/finance/PageParts";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { api } from "@/convex/_generated/api";
import { formatMoney } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import { CreditCard, Pencil, Plus, Scale, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
export default function DebtsPage() {
    const data = useQuery(api.debts.list, {});
    const removeDebt = useMutation(api.debts.remove);
    const [addOpen, setAddOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [paying, setPaying] = useState(null);
    const [confirmId, setConfirmId] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [extra, setExtra] = useState(0); // extra monthly payment, dollars
    const rows = data?.debts ?? [];
    const totals = data?.totals ?? { totalOutstanding: 0, totalMonthly: 0, count: 0 };
    const planner = useQuery(api.debts.strategies, {
        extraMonthly: Math.round(extra * 100),
    });
    const baseline = planner?.baseline;
    const snowball = planner?.snowball;
    const avalanche = planner?.avalanche;
    const interestSaved = useMemo(() => {
        if (!baseline || !snowball || !avalanche)
            return null;
        return {
            snowball: Math.max(0, baseline.totalInterest - snowball.totalInterest),
            avalanche: Math.max(0, baseline.totalInterest - avalanche.totalInterest),
        };
    }, [baseline, snowball, avalanche]);
    const handleDelete = async () => {
        if (!confirmId)
            return;
        setDeleting(true);
        try {
            await removeDebt({ debtId: confirmId });
            toast.success("Debt removed — payment history stays in your ledger");
        }
        catch {
            toast.error("Couldn't remove that debt.");
        }
        finally {
            setDeleting(false);
            setConfirmId(null);
        }
    };
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx(PageHeader, { title: "Debt manager", subtitle: "Every loan tracked with real amortisation \u2014 payments are ledger transactions.", actions: _jsxs(Button, { onClick: () => setAddOpen(true), className: "gap-2", children: [_jsx(Plus, { className: "size-4" }), "Add debt"] }) }), rows.length > 0 && (_jsxs("div", { className: "surface-card flex flex-wrap gap-8 p-5", children: [_jsx(MiniStat, { label: "Total debt", value: formatMoney(totals.totalOutstanding, { cents: false }), tone: "negative" }), _jsx(MiniStat, { label: "Monthly payments", value: formatMoney(totals.totalMonthly, { cents: false }) }), _jsx(MiniStat, { label: "Active debts", value: String(totals.count) })] })), data === undefined ? (_jsx(LoadingCard, { label: "Loading debts\u2026" })) : rows.length === 0 ? (_jsx(EmptyCard, { icon: _jsx(CreditCard, { className: "size-6" }), title: "No debts tracked", body: "Add a loan, mortgage or card with its balance, rate and payment. Tally projects your debt-free date and interest costs from real numbers.", action: _jsxs(Button, { onClick: () => setAddOpen(true), className: "gap-2", children: [_jsx(Plus, { className: "size-4" }), "Add your first debt"] }) })) : (_jsx("div", { className: "grid gap-4 sm:grid-cols-2 xl:grid-cols-3", children: rows.map((debt) => (_jsxs("div", { className: "surface-card flex flex-col gap-4 p-5", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold", children: debt.name }), _jsxs("p", { className: "text-muted-foreground text-xs", children: [debt.lender ? `${debt.lender} · ` : "", debt.interestRatePct ? `${debt.interestRatePct}% APR` : "No rate set"] })] }), _jsxs("div", { className: "flex shrink-0 gap-1", children: [_jsx(Button, { variant: "ghost", size: "icon-sm", "aria-label": `Edit ${debt.name}`, onClick: () => setEditing(debt), children: _jsx(Pencil, { className: "size-3.5" }) }), _jsx(Button, { variant: "ghost", size: "icon-sm", "aria-label": `Delete ${debt.name}`, className: "text-muted-foreground hover:text-destructive", onClick: () => setConfirmId(debt._id), children: _jsx(Trash2, { className: "size-3.5" }) })] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xl font-semibold tabular-nums", children: formatMoney(debt.outstandingBalance, { cents: false }) }), _jsxs("p", { className: "text-muted-foreground text-xs", children: ["of ", formatMoney(debt.originalAmount, { cents: false }), " original"] }), _jsx(Progress, { className: "mt-2 h-2", value: debt.paidPct }), _jsxs("p", { className: "text-muted-foreground mt-1 text-xs", children: [Math.round(debt.paidPct), "% paid \u00B7", " ", debt.payoffDate
                                                    ? `debt-free ${new Date(debt.payoffDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
                                                    : "payment too small to cover interest"] })] }), _jsxs("div", { className: "text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-2 text-xs", children: [_jsxs("span", { children: ["Payment: ", _jsx("span", { className: "text-foreground font-medium", children: formatMoney(debt.monthlyPayment) })] }), _jsxs("span", { children: ["Months left: ", _jsx("span", { className: "text-foreground font-medium", children: debt.monthsLeft || "—" })] }), _jsxs("span", { children: ["Interest paid: ", _jsx("span", { className: "text-foreground font-medium", children: formatMoney(debt.interestPaid) })] }), _jsxs("span", { children: ["Interest left: ", _jsx("span", { className: "text-foreground font-medium", children: formatMoney(debt.interestRemaining) })] })] }), _jsxs(Button, { variant: "outline", size: "sm", className: "mt-auto w-full gap-2", onClick: () => setPaying(debt), children: [_jsx(Plus, { className: "size-4" }), "Record payment"] })] }, debt._id))) })), rows.length > 1 && (_jsxs("section", { className: "surface-card flex flex-col gap-4 p-5 sm:p-6", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("h2", { className: "flex items-center gap-2 text-base font-semibold tracking-tight", children: [_jsx(Scale, { className: "text-muted-foreground size-4" }), "Repayment strategies"] }), _jsxs("label", { className: "flex items-center gap-2 text-sm", children: [_jsx("span", { className: "text-muted-foreground", children: "Extra per month" }), _jsx("input", { type: "number", min: 0, value: extra || "", onChange: (event) => setExtra(Math.max(0, Number(event.target.value) || 0)), className: "border-input bg-background h-8 w-28 rounded-md border px-2 text-sm tabular-nums", placeholder: "0" })] })] }), planner === undefined ? (_jsx("p", { className: "text-muted-foreground text-sm", children: "Simulating strategies\u2026" })) : (_jsx("div", { className: "grid gap-4 sm:grid-cols-2", children: [
                                    { name: "Snowball", tagline: "Smallest balance first", result: snowball, saved: interestSaved?.snowball },
                                    { name: "Avalanche", tagline: "Highest interest rate first", result: avalanche, saved: interestSaved?.avalanche },
                                ].map((strategy) => (_jsxs("div", { className: "border-border/70 rounded-xl border p-4", children: [_jsx("p", { className: "text-sm font-semibold", children: strategy.name }), _jsx("p", { className: "text-muted-foreground text-xs", children: strategy.tagline }), _jsxs("div", { className: "mt-3 grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-muted-foreground text-xs", children: "Debt-free in" }), _jsxs("p", { className: "text-sm font-semibold tabular-nums", children: [strategy.result ? Math.max(1, Math.round(strategy.result.months / 30.44)) || "—" : "—", " mo"] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-muted-foreground text-xs", children: "Total interest" }), _jsx("p", { className: "text-sm font-semibold tabular-nums", children: strategy.result ? formatMoney(strategy.result.totalInterest, { cents: false }) : "—" })] }), _jsxs("div", { children: [_jsx("p", { className: "text-muted-foreground text-xs", children: "Interest saved" }), _jsx("p", { className: "text-positive text-sm font-semibold tabular-nums", children: strategy.saved !== null && strategy.saved !== undefined
                                                                ? formatMoney(strategy.saved, { cents: false })
                                                                : "—" })] }), _jsxs("div", { children: [_jsx("p", { className: "text-muted-foreground text-xs", children: "Payoff order" }), _jsx("p", { className: "text-foreground truncate text-xs", children: strategy.result?.order.join(" → ") || "—" })] })] })] }, strategy.name))) })), _jsx("p", { className: "text-muted-foreground text-xs leading-5", children: "Both plans pay the same total monthly amount \u2014 they differ only in the order debts are cleared. Choose whichever keeps you motivated; the numbers above show the trade-off." })] }))] }), _jsx(DebtDialog, { open: addOpen || editing !== null, onOpenChange: (open) => {
                    if (!open) {
                        setAddOpen(false);
                        setEditing(null);
                    }
                }, debt: editing }), _jsx(DebtPayDialog, { debt: paying, onOpenChange: (open) => !open && setPaying(null) }), _jsx(AlertDialog, { open: confirmId !== null, onOpenChange: (open) => !open && setConfirmId(null), children: _jsxs(AlertDialogContent, { children: [_jsxs(AlertDialogHeader, { children: [_jsx(AlertDialogTitle, { children: "Delete this debt?" }), _jsx(AlertDialogDescription, { children: "Payment history stays in your transactions; the debt record is removed." })] }), _jsxs(AlertDialogFooter, { children: [_jsx(AlertDialogCancel, { children: "Keep it" }), _jsx(AlertDialogAction, { onClick: () => void handleDelete(), disabled: deleting, className: "bg-destructive hover:bg-destructive/90 text-white", children: "Delete debt" })] })] }) })] }));
}
