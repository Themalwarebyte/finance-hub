import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import { FREQUENCIES, categoriesFor, } from "@/lib/finance";
import { dateInputToMs, msToDateInput, parseAmountToCents } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { ArrowDownLeft, ArrowUpRight, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
export function RecurringDialog({ open, onOpenChange, defaultDirection = "out", }) {
    const accounts = useQuery(api.accounts.list, {});
    const createRecurring = useMutation(api.recurring.create);
    const [direction, setDirection] = useState(defaultDirection);
    const [amount, setAmount] = useState("");
    const [accountId, setAccountId] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("Housing");
    const [frequency, setFrequency] = useState("monthly");
    const [nextDate, setNextDate] = useState(msToDateInput(Date.now()));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (!open)
            return;
        setDirection(defaultDirection);
        setAmount("");
        setDescription("");
        setCategory(defaultDirection === "in" ? "Income" : "Housing");
        setFrequency("monthly");
        setNextDate(msToDateInput(Date.now()));
        setError(null);
    }, [open, defaultDirection]);
    useEffect(() => {
        if (!open)
            return;
        if (accounts && accounts.length > 0 && !accounts.some((a) => a._id === accountId)) {
            setAccountId(accounts[0]._id);
        }
    }, [accounts, accountId, open]);
    const switchDirection = (next) => {
        setDirection(next);
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
        if (description.trim().length === 0) {
            setError("Add a short description.");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await createRecurring({
                accountId: accountId,
                direction,
                amount: cents,
                description,
                category,
                frequency,
                nextDate: dateInputToMs(nextDate),
            });
            toast.success("Added to your projection");
            onOpenChange(false);
        }
        catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : "Something went wrong.");
        }
        finally {
            setSaving(false);
        }
    };
    const noAccounts = accounts !== undefined && accounts.length === 0;
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "sm:max-w-md", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Schedule repeating money" }), _jsx(DialogDescription, { children: "Rent, paychecks, subscriptions \u2014 anything predictable used to project balances ahead." })] }), _jsxs("form", { onSubmit: handleSubmit, className: "flex flex-col gap-4", children: [_jsxs("div", { className: "bg-muted grid grid-cols-2 gap-1 rounded-lg p-1", children: [_jsxs("button", { type: "button", onClick: () => switchDirection("in"), className: cn("flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-all", direction === "in"
                                        ? "bg-card text-positive shadow-[var(--shadow-soft)]"
                                        : "text-muted-foreground hover:text-foreground"), children: [_jsx(ArrowDownLeft, { className: "size-4" }), "Money in"] }), _jsxs("button", { type: "button", onClick: () => switchDirection("out"), className: cn("flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-all", direction === "out"
                                        ? "bg-card text-negative shadow-[var(--shadow-soft)]"
                                        : "text-muted-foreground hover:text-foreground"), children: [_jsx(ArrowUpRight, { className: "size-4" }), "Money out"] })] }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "recurring-amount", children: "Amount" }), _jsxs("div", { className: "relative", children: [_jsx("span", { className: "text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm", children: "$" }), _jsx(Input, { id: "recurring-amount", value: amount, onChange: (event) => setAmount(event.target.value), inputMode: "decimal", className: "pl-7 tabular-nums", placeholder: "0.00", autoFocus: true })] })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { children: "Repeats" }), _jsxs(Select, { value: frequency, onValueChange: (value) => setFrequency(value), children: [_jsx(SelectTrigger, { className: "w-full", children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: FREQUENCIES.map((option) => (_jsx(SelectItem, { value: option.value, children: option.label }, option.value))) })] })] })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "recurring-description", children: "Description" }), _jsx(Input, { id: "recurring-description", value: description, onChange: (event) => setDescription(event.target.value), placeholder: direction === "in" ? "Paycheck" : "Rent" })] }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { children: "Account" }), _jsxs(Select, { value: accountId, onValueChange: setAccountId, disabled: noAccounts, children: [_jsx(SelectTrigger, { className: "w-full", children: _jsx(SelectValue, { placeholder: "Choose account" }) }), _jsx(SelectContent, { children: (accounts ?? []).map((account) => (_jsx(SelectItem, { value: account._id, children: account.name }, account._id))) })] })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { children: "Category" }), _jsxs(Select, { value: category, onValueChange: setCategory, children: [_jsx(SelectTrigger, { className: "w-full", children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: categoriesFor(direction).map((option) => (_jsx(SelectItem, { value: option, children: option }, option))) })] })] })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "recurring-date", children: "Next date" }), _jsx(Input, { id: "recurring-date", type: "date", value: nextDate, onChange: (event) => setNextDate(event.target.value) })] }), noAccounts && (_jsx("p", { className: "text-muted-foreground text-sm", children: "You need at least one account before scheduling money." })), error && _jsx("p", { className: "text-destructive text-sm", children: error }), _jsxs(DialogFooter, { className: "mt-2", children: [_jsx(Button, { type: "button", variant: "ghost", onClick: () => onOpenChange(false), disabled: saving, children: "Cancel" }), _jsxs(Button, { type: "submit", disabled: saving || noAccounts, children: [saving && _jsx(Loader2, { className: "animate-spin" }), "Add to projection"] })] })] })] }) }));
}
