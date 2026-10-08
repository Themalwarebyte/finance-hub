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
const DEBT_TYPES = [
    { value: "personal_loan", label: "Personal loan" },
    { value: "bank_loan", label: "Bank loan" },
    { value: "sacco_loan", label: "SACCO loan" },
    { value: "mortgage", label: "Mortgage" },
    { value: "car_loan", label: "Car loan" },
    { value: "credit_card", label: "Credit card" },
    { value: "student_loan", label: "Student loan" },
    { value: "family_loan", label: "Family loan" },
    { value: "business_loan", label: "Business loan" },
    { value: "other", label: "Other debt" },
];
export function DebtDialog({ open, onOpenChange, debt, }) {
    const accounts = useQuery(api.accounts.list, {});
    const createDebt = useMutation(api.debts.create);
    const updateDebt = useMutation(api.debts.update);
    const [name, setName] = useState("");
    const [type, setType] = useState("personal_loan");
    const [lender, setLender] = useState("");
    const [originalAmount, setOriginalAmount] = useState("");
    const [outstandingBalance, setOutstandingBalance] = useState("");
    const [rate, setRate] = useState("");
    const [monthlyPayment, setMonthlyPayment] = useState("");
    const [nextDueDate, setNextDueDate] = useState("");
    const [accountId, setAccountId] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (!open)
            return;
        setName(debt?.name ?? "");
        setType("personal_loan");
        setLender(debt?.lender ?? "");
        setOriginalAmount(debt ? centsToInput(debt.originalAmount ?? 0) : "");
        setOutstandingBalance(debt ? centsToInput(debt.outstandingBalance) : "");
        setRate(debt?.interestRatePct ? String(debt.interestRatePct) : "");
        setMonthlyPayment(debt ? centsToInput(debt.monthlyPayment) : "");
        setNextDueDate(debt?.nextDueDate ? msToDateInput(debt.nextDueDate) : "");
        setAccountId("");
        setError(null);
    }, [open, debt]);
    const handleSubmit = async (event) => {
        event.preventDefault();
        const original = parseAmountToCents(originalAmount);
        const balance = parseAmountToCents(outstandingBalance);
        const payment = parseAmountToCents(monthlyPayment);
        if (name.trim().length === 0) {
            setError("Name the debt.");
            return;
        }
        if (original === null) {
            setError("Enter the original amount.");
            return;
        }
        if (balance === null) {
            setError("Enter the outstanding balance.");
            return;
        }
        if (payment === null) {
            setError("Enter the monthly payment.");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            if (debt) {
                await updateDebt({
                    debtId: debt._id,
                    name,
                    lender,
                    outstandingBalance: balance,
                    interestRatePct: rate.trim() ? Number(rate) : undefined,
                    monthlyPayment: payment,
                    nextDueDate: nextDueDate ? dateInputToMs(nextDueDate) : undefined,
                });
                toast.success("Debt updated");
            }
            else {
                await createDebt({
                    name,
                    type,
                    lender: lender.trim() || undefined,
                    originalAmount: original,
                    outstandingBalance: balance,
                    interestRatePct: rate.trim() ? Number(rate) : undefined,
                    monthlyPayment: payment,
                    nextDueDate: nextDueDate ? dateInputToMs(nextDueDate) : undefined,
                    linkedAccountId: accountId ? accountId : undefined,
                });
                toast.success("Debt added");
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
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "max-h-[92vh] overflow-y-auto sm:max-w-md", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: debt ? "Edit debt" : "Add debt" }), _jsx(DialogDescription, { children: "Tally amortises the balance at the given rate to project payoff and interest." })] }), _jsxs("form", { onSubmit: handleSubmit, className: "flex flex-col gap-4", children: [_jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "debt-name", children: "Name" }), _jsx(Input, { id: "debt-name", value: name, onChange: (event) => setName(event.target.value), placeholder: "Car loan", autoFocus: true })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { children: "Type" }), _jsxs(Select, { value: type, onValueChange: (value) => setType(value), children: [_jsx(SelectTrigger, { className: "w-full", children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: DEBT_TYPES.map((option) => (_jsx(SelectItem, { value: option.value, children: option.label }, option.value))) })] })] })] }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "debt-lender", children: "Lender" }), _jsx(Input, { id: "debt-lender", value: lender, onChange: (event) => setLender(event.target.value), placeholder: "Optional" })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "debt-rate", children: "Interest rate % (annual)" }), _jsx(Input, { id: "debt-rate", value: rate, onChange: (event) => setRate(event.target.value), inputMode: "decimal", className: "tabular-nums", placeholder: "e.g. 13.5" })] })] }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "debt-original", children: "Original amount" }), _jsxs("div", { className: "relative", children: [_jsx("span", { className: "text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm", children: "$" }), _jsx(Input, { id: "debt-original", value: originalAmount, onChange: (event) => setOriginalAmount(event.target.value), inputMode: "decimal", className: "pl-7 tabular-nums", placeholder: "0.00" })] })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "debt-balance", children: "Outstanding balance" }), _jsxs("div", { className: "relative", children: [_jsx("span", { className: "text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm", children: "$" }), _jsx(Input, { id: "debt-balance", value: outstandingBalance, onChange: (event) => setOutstandingBalance(event.target.value), inputMode: "decimal", className: "pl-7 tabular-nums", placeholder: "0.00" })] })] })] }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "debt-payment", children: "Monthly payment" }), _jsxs("div", { className: "relative", children: [_jsx("span", { className: "text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm", children: "$" }), _jsx(Input, { id: "debt-payment", value: monthlyPayment, onChange: (event) => setMonthlyPayment(event.target.value), inputMode: "decimal", className: "pl-7 tabular-nums", placeholder: "0.00" })] })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "debt-due", children: "Next due date" }), _jsx(Input, { id: "debt-due", type: "date", value: nextDueDate, onChange: (event) => setNextDueDate(event.target.value) })] })] }), !debt && (_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { children: "Linked loan account" }), _jsxs(Select, { value: accountId, onValueChange: setAccountId, children: [_jsx(SelectTrigger, { className: "w-full", children: _jsx(SelectValue, { placeholder: "Optional" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "", children: "None" }), (accounts ?? []).map((account) => (_jsx(SelectItem, { value: account._id, children: account.name }, account._id)))] })] })] })), error && _jsx("p", { className: "text-destructive text-sm", children: error }), _jsxs(DialogFooter, { className: "mt-2", children: [_jsx(Button, { type: "button", variant: "ghost", onClick: () => onOpenChange(false), disabled: saving, children: "Cancel" }), _jsxs(Button, { type: "submit", disabled: saving, children: [saving && _jsx(Loader2, { className: "animate-spin" }), debt ? "Save changes" : "Add debt"] })] })] })] }) }));
}
