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
export function GoalContributeDialog({ goal, onOpenChange, }) {
    const accounts = useQuery(api.accounts.list, {});
    const contribute = useMutation(api.goals.contribute);
    const [amount, setAmount] = useState("");
    const [accountId, setAccountId] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const activeAccounts = accounts ?? [];
    useEffect(() => {
        if (!goal)
            return;
        setAmount("");
        setError(null);
        if (activeAccounts.length > 0) {
            const preferred = activeAccounts.find((a) => a.kind === "savings") ?? activeAccounts[0];
            setAccountId(preferred._id);
        }
    }, [goal, activeAccounts]);
    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!goal)
            return;
        const cents = parseAmountToCents(amount);
        if (cents === null) {
            setError("Enter an amount greater than zero.");
            return;
        }
        if (!accountId) {
            setError("Add an account first.");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await contribute({
                goalId: goal._id,
                accountId: accountId,
                amount: cents,
            });
            toast.success("Contribution recorded");
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
    return (_jsx(Dialog, { open: goal !== null, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "sm:max-w-md", children: [_jsxs(DialogHeader, { children: [_jsxs(DialogTitle, { children: ["Contribute to ", goal?.name ?? "goal"] }), _jsx(DialogDescription, { children: "This records a real money-out transaction tagged to the goal." })] }), _jsxs("form", { onSubmit: handleSubmit, className: "flex flex-col gap-4", children: [_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "contribution-amount", children: "Amount" }), _jsxs("div", { className: "relative", children: [_jsx("span", { className: "text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm", children: "$" }), _jsx(Input, { id: "contribution-amount", value: amount, onChange: (event) => setAmount(event.target.value), inputMode: "decimal", className: "pl-7 text-lg font-semibold tabular-nums", placeholder: "0.00", autoFocus: true })] })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { children: "From account" }), _jsxs(Select, { value: accountId, onValueChange: setAccountId, disabled: noAccounts, children: [_jsx(SelectTrigger, { className: "w-full", children: _jsx(SelectValue, { placeholder: "Choose account" }) }), _jsx(SelectContent, { children: activeAccounts.map((account) => (_jsx(SelectItem, { value: account._id, children: account.name }, account._id))) })] })] }), noAccounts && (_jsx("p", { className: "text-muted-foreground text-sm", children: "You need at least one account to record a contribution." })), error && _jsx("p", { className: "text-destructive text-sm", children: error }), _jsxs(DialogFooter, { className: "mt-2", children: [_jsx(Button, { type: "button", variant: "ghost", onClick: () => onOpenChange(false), disabled: saving, children: "Cancel" }), _jsxs(Button, { type: "submit", disabled: saving || noAccounts, children: [saving && _jsx(Loader2, { className: "animate-spin" }), "Record contribution"] })] })] })] }) }));
}
