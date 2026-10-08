import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import { centsToInput, dateInputToMs, msToDateInput, parseAmountToCents } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
export function GoalDialog({ open, onOpenChange, goal, }) {
    const accounts = useQuery(api.accounts.list, {});
    const createGoal = useMutation(api.goals.create);
    const updateGoal = useMutation(api.goals.update);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [targetAmount, setTargetAmount] = useState("");
    const [targetDate, setTargetDate] = useState("");
    const [accountId, setAccountId] = useState("");
    const [contributionAmount, setContributionAmount] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (!open)
            return;
        setName(goal?.name ?? "");
        setDescription(goal?.description ?? "");
        setTargetAmount(goal ? centsToInput(goal.targetAmount) : "");
        setTargetDate(goal?.targetDate ? msToDateInput(goal.targetDate) : "");
        setAccountId(goal?.linkedAccountId ?? "");
        setContributionAmount(goal?.contributionAmount ? centsToInput(goal.contributionAmount) : "");
        setError(null);
    }, [open, goal]);
    const handleSubmit = async (event) => {
        event.preventDefault();
        const target = parseAmountToCents(targetAmount);
        if (target === null) {
            setError("Enter a target amount greater than zero.");
            return;
        }
        if (name.trim().length === 0) {
            setError("Name the goal.");
            return;
        }
        const contribution = contributionAmount.trim() ? parseAmountToCents(contributionAmount) : null;
        if (contribution === null && contributionAmount.trim().length > 0) {
            setError("Enter a valid planned contribution.");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            if (goal) {
                await updateGoal({
                    goalId: goal._id,
                    name,
                    description,
                    targetAmount: target,
                    targetDate: targetDate ? dateInputToMs(targetDate) : undefined,
                    linkedAccountId: accountId ? accountId : undefined,
                    contributionAmount: contribution ?? undefined,
                });
                toast.success("Goal updated");
            }
            else {
                await createGoal({
                    name,
                    description: description.trim() || undefined,
                    targetAmount: target,
                    targetDate: targetDate ? dateInputToMs(targetDate) : undefined,
                    linkedAccountId: accountId ? accountId : undefined,
                    contributionAmount: contribution ?? undefined,
                });
                toast.success("Goal created");
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
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "max-h-[92vh] overflow-y-auto sm:max-w-md", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: goal ? "Edit goal" : "New savings goal" }), _jsx(DialogDescription, { children: "Record contributions from any account and progress builds automatically." })] }), _jsxs("form", { onSubmit: handleSubmit, className: "flex flex-col gap-4", children: [_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "goal-name", children: "Goal name" }), _jsx(Input, { id: "goal-name", value: name, onChange: (event) => setName(event.target.value), placeholder: "Emergency fund", autoFocus: true })] }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "goal-target", children: "Target amount" }), _jsxs("div", { className: "relative", children: [_jsx("span", { className: "text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm", children: "$" }), _jsx(Input, { id: "goal-target", value: targetAmount, onChange: (event) => setTargetAmount(event.target.value), inputMode: "decimal", className: "pl-7 tabular-nums", placeholder: "0.00" })] })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "goal-date", children: "Target date" }), _jsx(Input, { id: "goal-date", type: "date", value: targetDate, onChange: (event) => setTargetDate(event.target.value) })] })] }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { children: "Savings account" }), _jsxs(Select, { value: accountId, onValueChange: setAccountId, children: [_jsx(SelectTrigger, { className: "w-full", children: _jsx(SelectValue, { placeholder: "Optional" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "", children: "Not linked" }), (accounts ?? []).map((account) => (_jsx(SelectItem, { value: account._id, children: account.name }, account._id)))] })] })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "goal-contribution", children: "Planned / month" }), _jsxs("div", { className: "relative", children: [_jsx("span", { className: "text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm", children: "$" }), _jsx(Input, { id: "goal-contribution", value: contributionAmount, onChange: (event) => setContributionAmount(event.target.value), inputMode: "decimal", className: "pl-7 tabular-nums", placeholder: "Optional" })] })] })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "goal-description", children: "Notes" }), _jsx(Input, { id: "goal-description", value: description, onChange: (event) => setDescription(event.target.value), placeholder: "What is this goal for?" })] }), error && _jsx("p", { className: "text-destructive text-sm", children: error }), _jsxs(DialogFooter, { className: "mt-2", children: [_jsx(Button, { type: "button", variant: "ghost", onClick: () => onOpenChange(false), disabled: saving, children: "Cancel" }), _jsxs(Button, { type: "submit", disabled: saving, children: [saving && _jsx(Loader2, { className: "animate-spin" }), goal ? "Save changes" : "Create goal"] })] })] })] }) }));
}
