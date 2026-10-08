import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api } from "@/convex/_generated/api";
import { CATEGORIES } from "@/lib/finance";
import { centsToInput, dateInputToMs, parseAmountToCents } from "@/lib/format";
import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
export function BudgetDialog({ open, onOpenChange, budget, }) {
    const createBudget = useMutation(api.budgets.create);
    const updateBudget = useMutation(api.budgets.update);
    const [name, setName] = useState("");
    const [category, setCategory] = useState("Groceries");
    const [period, setPeriod] = useState("monthly");
    const [amount, setAmount] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [rollover, setRollover] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (!open)
            return;
        setName(budget?.name ?? "");
        setCategory(budget?.category ?? "Groceries");
        setPeriod(budget?.period ?? "monthly");
        setAmount(budget ? centsToInput(budget.amount) : "");
        setError(null);
    }, [open, budget]);
    const handleSubmit = async (event) => {
        event.preventDefault();
        const cents = parseAmountToCents(amount);
        if (cents === null) {
            setError("Enter a budget amount greater than zero.");
            return;
        }
        if (name.trim().length === 0) {
            setError("Name the budget.");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            if (budget) {
                await updateBudget({ budgetId: budget._id, name, amount: cents });
                toast.success("Budget updated");
            }
            else {
                await createBudget({
                    name,
                    category,
                    period,
                    amount: cents,
                    rollover,
                    startDate: period === "custom" && startDate ? dateInputToMs(startDate) : undefined,
                    endDate: period === "custom" && endDate ? dateInputToMs(endDate) : undefined,
                });
                toast.success("Budget created");
            }
            onOpenChange(false);
        }
        catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : "Something went wrong.");
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "max-h-[92vh] overflow-y-auto sm:max-w-md", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: budget ? "Edit budget" : "New budget" }), _jsx(DialogDescription, { children: "Budgets measure real spending in a category for the chosen period." })] }), _jsxs("form", { onSubmit: handleSubmit, className: "flex flex-col gap-4", children: [_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "budget-name", children: "Name" }), _jsx(Input, { id: "budget-name", value: name, onChange: (event) => setName(event.target.value), placeholder: "Monthly groceries", autoFocus: true })] }), !budget && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { children: "Category" }), _jsxs(Select, { value: category, onValueChange: setCategory, children: [_jsx(SelectTrigger, { className: "w-full", children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: CATEGORIES.filter((option) => option !== "Transfer").map((option) => (_jsx(SelectItem, { value: option, children: option }, option))) })] })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { children: "Period" }), _jsxs(Select, { value: period, onValueChange: (value) => setPeriod(value), children: [_jsx(SelectTrigger, { className: "w-full", children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "monthly", children: "Monthly" }), _jsx(SelectItem, { value: "annual", children: "Annual" }), _jsx(SelectItem, { value: "custom", children: "Custom dates" })] })] })] })] }), period === "custom" && (_jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "budget-start", children: "Start" }), _jsx(Input, { id: "budget-start", type: "date", value: startDate, onChange: (event) => setStartDate(event.target.value) })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "budget-end", children: "End" }), _jsx(Input, { id: "budget-end", type: "date", value: endDate, onChange: (event) => setEndDate(event.target.value) })] })] })), _jsxs("label", { className: "flex items-center justify-between gap-3 rounded-lg border px-3.5 py-3", children: [_jsxs("span", { children: [_jsx("span", { className: "text-sm font-medium", children: "Rollover" }), _jsx("span", { className: "text-muted-foreground block text-xs", children: "Unused budget carries into the next period." })] }), _jsx(Switch, { checked: rollover, onCheckedChange: setRollover })] })] })), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "budget-amount", children: "Amount per period" }), _jsxs("div", { className: "relative", children: [_jsx("span", { className: "text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm", children: "$" }), _jsx(Input, { id: "budget-amount", value: amount, onChange: (event) => setAmount(event.target.value), inputMode: "decimal", className: "pl-7 tabular-nums", placeholder: "0.00" })] })] }), error && _jsx("p", { className: "text-destructive text-sm", children: error }), _jsxs(DialogFooter, { className: "mt-2", children: [_jsx(Button, { type: "button", variant: "ghost", onClick: () => onOpenChange(false), disabled: saving, children: "Cancel" }), _jsxs(Button, { type: "submit", disabled: saving, children: [saving && _jsx(Loader2, { className: "animate-spin" }), budget ? "Save changes" : "Create budget"] })] })] })] }) }));
}
