import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { api } from "@/convex/_generated/api";
import { KIND_LABELS, colorMeta, returnBasisLabel } from "@/lib/finance";
import { formatMoney, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
export function AccountsTab({ onAdd, onEdit, }) {
    const accounts = useQuery(api.accounts.list, {});
    const removeAccount = useMutation(api.accounts.remove);
    const [deletingId, setDeletingId] = useState(null);
    const rows = (accounts ?? []);
    const handleDelete = async (accountId) => {
        setDeletingId(accountId);
        try {
            await removeAccount({ accountId });
            toast.success("Account removed");
        }
        catch {
            toast.error("Couldn't remove that account.");
        }
        finally {
            setDeletingId(null);
        }
    };
    if (accounts === undefined) {
        return (_jsx("div", { className: "surface-card text-muted-foreground p-10 text-center text-sm", children: "Loading accounts\u2026" }));
    }
    const held = rows
        .filter((row) => row.kind !== "credit")
        .reduce((sum, row) => sum + row.balance, 0);
    const owed = rows
        .filter((row) => row.kind === "credit")
        .reduce((sum, row) => sum + Math.abs(row.balance), 0);
    return (_jsxs("div", { className: "flex flex-col gap-5", children: [_jsxs("div", { className: "surface-card flex flex-wrap items-center justify-between gap-4 p-5", children: [_jsxs("div", { className: "flex flex-wrap gap-8", children: [_jsxs("div", { children: [_jsx("p", { className: "text-muted-foreground text-xs", children: "Accounts" }), _jsx("p", { className: "mt-1 text-lg font-semibold tabular-nums", children: rows.length })] }), _jsxs("div", { children: [_jsx("p", { className: "text-muted-foreground text-xs", children: "Money you hold" }), _jsx("p", { className: "mt-1 text-lg font-semibold tabular-nums", children: formatMoney(held) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-muted-foreground text-xs", children: "Money you owe" }), _jsx("p", { className: "mt-1 text-lg font-semibold tabular-nums", children: formatMoney(owed) })] })] }), _jsxs(Button, { onClick: onAdd, className: "gap-2", children: [_jsx(Plus, { className: "size-4" }), "Add account"] })] }), rows.length === 0 ? (_jsxs("div", { className: "surface-card flex flex-col items-center px-6 py-14 text-center", children: [_jsx("span", { className: "bg-primary/10 text-primary flex size-12 items-center justify-center rounded-xl", children: _jsx(Wallet, { className: "size-6" }) }), _jsx("h2", { className: "mt-5 text-lg font-semibold tracking-tight", children: "No accounts yet" }), _jsx("p", { className: "text-muted-foreground mt-2 max-w-sm text-sm leading-6", children: "Add checking, savings, cards and cash to build your full balance picture." }), _jsxs(Button, { onClick: onAdd, className: "mt-6 gap-2", children: [_jsx(Plus, { className: "size-4" }), "Add your first account"] })] })) : (_jsx("div", { className: "grid gap-4 sm:grid-cols-2 xl:grid-cols-3", children: rows.map((account) => {
                    const meta = colorMeta(account.color);
                    return (_jsxs("div", { className: "surface-card flex flex-col gap-4 p-5", children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { className: "flex min-w-0 items-center gap-2.5", children: [_jsx("span", { className: cn("size-2.5 shrink-0 rounded-full", meta.dot) }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "truncate text-sm font-semibold", children: account.name }), _jsxs("p", { className: "text-muted-foreground truncate text-xs", children: [KIND_LABELS[account.kind], account.institution ? ` · ${account.institution}` : ""] })] })] }), _jsxs("div", { className: "flex shrink-0 gap-1", children: [_jsx(Button, { variant: "ghost", size: "icon-sm", "aria-label": `Edit ${account.name}`, onClick: () => onEdit(account), children: _jsx(Pencil, { className: "size-3.5" }) }), _jsxs(AlertDialog, { children: [_jsx(AlertDialogTrigger, { asChild: true, children: _jsx(Button, { variant: "ghost", size: "icon-sm", "aria-label": `Delete ${account.name}`, className: "text-muted-foreground hover:text-destructive", children: _jsx(Trash2, { className: "size-3.5" }) }) }), _jsxs(AlertDialogContent, { children: [_jsxs(AlertDialogHeader, { children: [_jsxs(AlertDialogTitle, { children: ["Delete ", account.name, "?"] }), _jsx(AlertDialogDescription, { children: "This also removes every transaction and scheduled item tied to this account. It can't be undone." })] }), _jsxs(AlertDialogFooter, { children: [_jsx(AlertDialogCancel, { children: "Keep it" }), _jsx(AlertDialogAction, { onClick: () => void handleDelete(account._id), disabled: deletingId === account._id, className: "bg-destructive hover:bg-destructive/90 text-white", children: "Delete account" })] })] })] })] })] }), _jsxs("div", { children: [_jsx("p", { className: cn("text-2xl font-semibold tracking-tight tabular-nums", account.balance < 0 && "text-negative"), children: formatMoney(account.balance) }), _jsxs("p", { className: "text-muted-foreground mt-1 text-xs", children: ["Started at ", formatMoney(account.openingBalance)] })] }), account.kind === "investment" && account.estimatedReturnPct != null && (_jsxs("span", { className: "border-border/70 bg-muted/60 text-muted-foreground w-fit rounded-full border px-2.5 py-1 text-xs font-medium tabular-nums", children: [formatPct(account.estimatedReturnPct), "/", returnBasisLabel(account.returnBasis ?? "annual"), " est. return"] })), _jsx(Separator, { className: "opacity-60" }), _jsxs("p", { className: "text-muted-foreground text-xs", children: ["Movements: ", formatMoney(account.balance - account.openingBalance)] })] }, account._id));
                }) }))] }));
}
