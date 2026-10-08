import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import { categoriesFor } from "@/lib/finance";
import { dateInputToMs, msToDateInput, parseAmountToCents } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
const MODES = [
    { value: "in", label: "Money in", icon: ArrowDownLeft },
    { value: "out", label: "Money out", icon: ArrowUpRight },
    { value: "transfer", label: "Transfer", icon: ArrowRightLeft },
];
export function TransactionDialog({ open, onOpenChange, defaultDirection = "out", }) {
    const accounts = useQuery(api.accounts.list, {});
    const createTransaction = useMutation(api.transactions.create);
    const [mode, setMode] = useState(defaultDirection === "in" ? "in" : defaultDirection === "transfer" ? "transfer" : "out");
    const [amount, setAmount] = useState("");
    const [accountId, setAccountId] = useState("");
    const [transferAccountId, setTransferAccountId] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("Groceries");
    const [merchant, setMerchant] = useState("");
    const [date, setDate] = useState(msToDateInput(Date.now()));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const activeAccounts = accounts ?? [];
    useEffect(() => {
        if (!open)
            return;
        setMode(defaultDirection === "in" ? "in" : defaultDirection === "transfer" ? "transfer" : "out");
        setAmount("");
        setDescription("");
        setMerchant("");
        setCategory(defaultDirection === "in" ? "Salary" : "Groceries");
        setDate(msToDateInput(Date.now()));
        setError(null);
    }, [open, defaultDirection]);
    useEffect(() => {
        if (!open || activeAccounts.length === 0)
            return;
        if (!activeAccounts.some((a) => a._id === accountId)) {
            setAccountId(activeAccounts[0]._id);
        }
        if (!activeAccounts.some((a) => a._id === transferAccountId)) {
            const second = activeAccounts.find((a) => a._id !== accountId) ?? activeAccounts[0];
            setTransferAccountId(second._id);
        }
    }, [accounts, accountId, transferAccountId, open]);
    const switchMode = (next) => {
        setMode(next);
        const options = categoriesFor(next);
        if (!options.includes(category))
            setCategory(options[0]);
    };
    const handleSubmit = async (event) => {
        event.preventDefault();
        const cents = parseAmountToCents(amount);
        if (cents === null) {
            setError("Enter an amount greater than zero.");
            return;
        }
        if (!accountId) {
            setError("Add an account first.");
            return;
        }
        if (mode === "transfer" && transferAccountId === accountId) {
            setError("Pick two different accounts for a transfer.");
            return;
        }
        if (description.trim().length === 0) {
            setError("Add a short description.");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await createTransaction({
                accountId: accountId,
                direction: mode,
                amount: cents,
                description,
                category,
                date: dateInputToMs(date),
                transferAccountId: mode === "transfer" ? transferAccountId : undefined,
                merchant: merchant.trim() || undefined,
            });
            toast.success(mode === "in" ? "Money in recorded" : mode === "out" ? "Money out recorded" : "Transfer recorded");
            onOpenChange(false);
        }
        catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : "Something went wrong.");
        }
        finally {
            setSaving(false);
        }
    };
    const noAccounts = accounts !== undefined && activeAccounts.length < (mode === "transfer" ? 2 : 1);
    const categoryOptions = categoriesFor(mode);
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "max-h-[92vh] overflow-y-auto sm:max-w-md", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Record money" }), _jsx(DialogDescription, { children: "Income, expenses and transfers all land in the same ledger \u2014 balances update instantly." })] }), _jsxs("form", { onSubmit: handleSubmit, className: "flex flex-col gap-4", children: [_jsx("div", { className: "bg-muted grid grid-cols-3 gap-1 rounded-lg p-1", children: MODES.map((option) => (_jsxs("button", { type: "button", onClick: () => switchMode(option.value), className: cn("flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition-all sm:text-sm", mode === option.value
                                    ? "bg-card shadow-[var(--shadow-soft)]"
                                    : "text-muted-foreground hover:text-foreground"), children: [_jsx(option.icon, { className: cn("size-4", mode === option.value && option.value === "in" && "text-positive", mode === option.value && option.value === "out" && "text-negative") }), option.label] }, option.value))) }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "transaction-amount", children: "Amount" }), _jsxs("div", { className: "relative", children: [_jsx("span", { className: "text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm", children: "$" }), _jsx(Input, { id: "transaction-amount", value: amount, onChange: (event) => setAmount(event.target.value), inputMode: "decimal", className: "h-11 pl-7 text-lg font-semibold tabular-nums", placeholder: "0.00", autoFocus: true })] })] }), mode === "transfer" ? (_jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { children: "From" }), _jsxs(Select, { value: accountId, onValueChange: setAccountId, disabled: noAccounts, children: [_jsx(SelectTrigger, { className: "w-full", children: _jsx(SelectValue, { placeholder: "From account" }) }), _jsx(SelectContent, { children: activeAccounts.map((account) => (_jsx(SelectItem, { value: account._id, children: account.name }, account._id))) })] })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { children: "To" }), _jsxs(Select, { value: transferAccountId, onValueChange: setTransferAccountId, disabled: noAccounts, children: [_jsx(SelectTrigger, { className: "w-full", children: _jsx(SelectValue, { placeholder: "To account" }) }), _jsx(SelectContent, { children: activeAccounts
                                                        .filter((account) => account._id !== accountId)
                                                        .map((account) => (_jsx(SelectItem, { value: account._id, children: account.name }, account._id))) })] })] })] })) : (_jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { children: "Account" }), _jsxs(Select, { value: accountId, onValueChange: setAccountId, disabled: noAccounts, children: [_jsx(SelectTrigger, { className: "w-full", children: _jsx(SelectValue, { placeholder: "Choose account" }) }), _jsx(SelectContent, { children: activeAccounts.map((account) => (_jsx(SelectItem, { value: account._id, children: account.name }, account._id))) })] })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { children: mode === "in" ? "Income source" : "Category" }), _jsxs(Select, { value: category, onValueChange: setCategory, children: [_jsx(SelectTrigger, { className: "w-full", children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: categoryOptions.map((option) => (_jsx(SelectItem, { value: option, children: option }, option))) })] })] })] })), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "transaction-description", children: "Description" }), _jsx(Input, { id: "transaction-description", value: description, onChange: (event) => setDescription(event.target.value), placeholder: mode === "in" ? "Salary" : mode === "transfer" ? "Move to savings" : "Weekly groceries" })] }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "transaction-merchant", children: "Merchant / payee" }), _jsx(Input, { id: "transaction-merchant", value: merchant, onChange: (event) => setMerchant(event.target.value), placeholder: "Optional" })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "transaction-date", children: "Date" }), _jsx(Input, { id: "transaction-date", type: "date", value: date, onChange: (event) => setDate(event.target.value) })] })] }), noAccounts && (_jsx("p", { className: "text-muted-foreground text-sm", children: mode === "transfer"
                                ? "You need at least two accounts before transferring money."
                                : "You need at least one account before recording money." })), error && _jsx("p", { className: "text-destructive text-sm", children: error }), _jsxs(DialogFooter, { className: "mt-2", children: [_jsx(Button, { type: "button", variant: "ghost", onClick: () => onOpenChange(false), disabled: saving, children: "Cancel" }), _jsxs(Button, { type: "submit", disabled: saving || noAccounts, children: [saving && _jsx(Loader2, { className: "animate-spin" }), mode === "transfer" ? "Transfer" : "Record"] })] })] })] }) }));
}
