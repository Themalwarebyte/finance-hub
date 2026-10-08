import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import { parseAmountToCents } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
export function DebtPayDialog({ debt, onOpenChange, }) {
    const accounts = useQuery(api.accounts.list, {});
    const payDebt = useMutation(api.debts.pay);
    const [amount, setAmount] = useState("");
    const [interestPortion, setInterestPortion] = useState("");
    const [accountId, setAccountId] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const activeAccounts = accounts ?? [];
    useEffect(() => {
        if (!debt)
            return;
        setAmount(debt.monthlyPayment ? (debt.monthlyPayment / 100).toFixed(2) : "");
        setInterestPortion("");
        setError(null);
        if (activeAccounts.length > 0) {
            setAccountId(activeAccounts.find((a) => a.kind !== "credit")?._id ?? activeAccounts[0]._id);
        }
    }, [debt, activeAccounts]);
    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!debt)
            return;
        const cents = parseAmountToCents(amount);
        if (cents === null) {
            setError("Enter an amount greater than zero.");
            return;
        }
        const interest = interestPortion.trim() ? parseAmountToCents(interestPortion) : 0;
        if (interest === null) {
            setError("Enter a valid interest portion.");
            return;
        }
        if (!accountId) {
            setError("Add an account first.");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await payDebt({
                debtId: debt._id,
                accountId: accountId,
                amount: cents,
                interestPortion: interest ?? 0,
            });
            toast.success("Payment recorded");
            onOpenChange(false);
        }
        catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : "Something went wrong.");
        }
        finally {
            setSaving(false);
        }
    };
    const noAccounts = accounts !== undefined && activeAccounts.length === 0;
    return (_jsx(Dialog, { open: debt !== null, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "sm:max-w-md", children: [_jsxs(DialogHeader, { children: [_jsxs(DialogTitle, { children: ["Pay ", debt?.name ?? "debt"] }), _jsx(DialogDescription, { children: "Records a Debt Payments transaction and reduces the tracked balance." })] }), _jsxs("form", { onSubmit: handleSubmit, className: "flex flex-col gap-4", children: [_jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "debt-pay-amount", children: "Amount" }), _jsxs("div", { className: "relative", children: [_jsx("span", { className: "text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm", children: "$" }), _jsx(Input, { id: "debt-pay-amount", value: amount, onChange: (event) => setAmount(event.target.value), inputMode: "decimal", className: "pl-7 text-lg font-semibold tabular-nums", placeholder: "0.00", autoFocus: true })] })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "debt-pay-interest", children: "Interest portion" }), _jsxs("div", { className: "relative", children: [_jsx("span", { className: "text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm", children: "$" }), _jsx(Input, { id: "debt-pay-interest", value: interestPortion, onChange: (event) => setInterestPortion(event.target.value), inputMode: "decimal", className: "pl-7 tabular-nums", placeholder: "0.00" })] })] })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { children: "From account" }), _jsxs(Select, { value: accountId, onValueChange: setAccountId, disabled: noAccounts, children: [_jsx(SelectTrigger, { className: "w-full", children: _jsx(SelectValue, { placeholder: "Choose account" }) }), _jsx(SelectContent, { children: activeAccounts.map((account) => (_jsx(SelectItem, { value: account._id, children: account.name }, account._id))) })] })] }), noAccounts && (_jsx("p", { className: "text-muted-foreground text-sm", children: "You need at least one account to record a payment." })), error && _jsx("p", { className: "text-destructive text-sm", children: error }), _jsxs(DialogFooter, { className: "mt-2", children: [_jsx(Button, { type: "button", variant: "ghost", onClick: () => onOpenChange(false), disabled: saving, children: "Cancel" }), _jsxs(Button, { type: "submit", disabled: saving || noAccounts, children: [saving && _jsx(Loader2, { className: "animate-spin" }), "Record payment"] })] })] })] }) }));
}
