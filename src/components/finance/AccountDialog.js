import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import { ACCOUNT_KINDS, COLORS, colorMeta, RETURN_BASES, } from "@/lib/finance";
import { centsToInput } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
function signedCents(input) {
    const cleaned = input.replace(/[^0-9.]/g, "");
    const value = Number.parseFloat(cleaned);
    if (!Number.isFinite(value))
        return 0;
    const negative = input.trim().startsWith("-");
    return Math.round((negative ? -Math.abs(value) : value) * 100);
}
export function AccountDialog({ open, onOpenChange, account, }) {
    const createAccount = useMutation(api.accounts.create);
    const updateAccount = useMutation(api.accounts.update);
    const [saving, setSaving] = useState(false);
    const [name, setName] = useState("");
    const [kind, setKind] = useState("checking");
    const [institution, setInstitution] = useState("");
    const [balance, setBalance] = useState("");
    const [color, setColor] = useState("teal");
    const [returnPct, setReturnPct] = useState("");
    const [returnBasis, setReturnBasis] = useState("annual");
    const [error, setError] = useState(null);
    useEffect(() => {
        if (!open)
            return;
        setName(account?.name ?? "");
        setKind(account?.kind ?? "checking");
        setInstitution(account?.institution ?? "");
        setBalance(centsToInput(account?.openingBalance ?? 0));
        setColor(account?.color ?? "teal");
        setReturnPct(account?.estimatedReturnPct !== null &&
            account?.estimatedReturnPct !== undefined
            ? String(account.estimatedReturnPct)
            : "");
        setReturnBasis(account?.returnBasis ?? "annual");
        setError(null);
    }, [open, account]);
    const handleSubmit = async (event) => {
        event.preventDefault();
        if (name.trim().length === 0) {
            setError("Give this account a name.");
            return;
        }
        let estimatedReturnPct;
        if (returnPct.trim().length > 0) {
            const cleaned = returnPct.replace(/[^0-9.\-]/g, "");
            const value = Number.parseFloat(cleaned);
            if (!Number.isFinite(value) || Math.abs(value) > 100) {
                setError("Return estimate must be between -100% and 100%.");
                return;
            }
            estimatedReturnPct = value;
        }
        setSaving(true);
        setError(null);
        try {
            const openingBalance = signedCents(balance);
            if (account) {
                await updateAccount({
                    accountId: account._id,
                    name,
                    kind,
                    institution,
                    openingBalance,
                    color,
                    estimatedReturnPct,
                    returnBasis: estimatedReturnPct === undefined ? undefined : returnBasis,
                });
                toast.success("Account updated");
            }
            else {
                await createAccount({
                    name,
                    kind,
                    institution,
                    openingBalance,
                    color,
                    estimatedReturnPct,
                    returnBasis: estimatedReturnPct === undefined ? undefined : returnBasis,
                });
                toast.success("Account added");
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
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "sm:max-w-md", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: account ? "Edit account" : "Add an account" }), _jsx(DialogDescription, { children: "Every account you add shows up in your balances view and in projections." })] }), _jsxs("form", { onSubmit: handleSubmit, className: "flex flex-col gap-4", children: [_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "account-name", children: "Name" }), _jsx(Input, { id: "account-name", value: name, onChange: (event) => setName(event.target.value), placeholder: "Everyday Checking", autoFocus: true })] }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { children: "Type" }), _jsxs(Select, { value: kind, onValueChange: (value) => setKind(value), children: [_jsx(SelectTrigger, { className: "w-full", children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: ACCOUNT_KINDS.map((option) => (_jsx(SelectItem, { value: option.value, children: option.label }, option.value))) })] })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "account-institution", children: "Institution" }), _jsx(Input, { id: "account-institution", value: institution, onChange: (event) => setInstitution(event.target.value), placeholder: "Optional" })] })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "account-balance", children: "Current balance" }), _jsxs("div", { className: "relative", children: [_jsx("span", { className: "text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm", children: "$" }), _jsx(Input, { id: "account-balance", value: balance, onChange: (event) => setBalance(event.target.value), inputMode: "decimal", className: "pl-7 tabular-nums", placeholder: "0.00" })] }), _jsx("p", { className: "text-muted-foreground text-xs", children: "Use a minus sign for money you owe, like a card balance." })] }), kind === "investment" && (_jsxs("div", { className: "bg-muted/40 border-border/70 rounded-xl border p-3.5", children: [_jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "account-return", children: "Estimated return %" }), _jsxs("div", { className: "relative", children: [_jsx(Input, { id: "account-return", value: returnPct, onChange: (event) => setReturnPct(event.target.value), inputMode: "decimal", className: "pr-8 tabular-nums", placeholder: "e.g. 7" }), _jsx("span", { className: "text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm", children: "%" })] })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { children: "Rate is" }), _jsxs(Select, { value: returnBasis, onValueChange: (value) => setReturnBasis(value), children: [_jsx(SelectTrigger, { className: "w-full", children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: RETURN_BASES.map((option) => (_jsx(SelectItem, { value: option.value, children: option.label }, option.value))) })] })] })] }), _jsx("p", { className: "text-muted-foreground mt-2.5 text-xs leading-5", children: "Compounds daily into the balance projection for this account. Negative rates are allowed." })] })), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { children: "Colour" }), _jsx("div", { className: "flex gap-2", children: COLORS.map((option) => {
                                        const meta = colorMeta(option);
                                        return (_jsx("button", { type: "button", "aria-label": meta.label, onClick: () => setColor(option), className: cn("size-7 rounded-full transition-transform", meta.dot, color === option
                                                ? "ring-ring ring-2 ring-offset-2 ring-offset-[var(--card)]"
                                                : "hover:scale-110") }, option));
                                    }) })] }), error && _jsx("p", { className: "text-destructive text-sm", children: error }), _jsxs(DialogFooter, { className: "mt-2", children: [_jsx(Button, { type: "button", variant: "ghost", onClick: () => onOpenChange(false), disabled: saving, children: "Cancel" }), _jsxs(Button, { type: "submit", disabled: saving, children: [saving && _jsx(Loader2, { className: "animate-spin" }), account ? "Save changes" : "Add account"] })] })] })] }) }));
}
