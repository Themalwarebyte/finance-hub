import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BizPageHeader } from "@/components/finance/BizParts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import { formatMoney, formatShortDate } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
const KINDS = [
    "purchase",
    "sale",
    "dividend",
    "interest",
    "fee",
    "contribution",
    "withdrawal",
    "split",
    "adjustment",
];
export default function InvestmentsTransactionsPage() {
    const txns = useQuery(api.invest.listTxns, {});
    const securities = useQuery(api.invest.listSecurities, {});
    const recordTxn = useMutation(api.invest.recordTxn);
    const [open, setOpen] = useState(false);
    const [kind, setKind] = useState("purchase");
    const [securityId, setSecurityId] = useState("");
    const [qty, setQty] = useState("");
    const [price, setPrice] = useState("");
    const [amount, setAmount] = useState("");
    const [fee, setFee] = useState("");
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);
    if (txns === undefined || securities === undefined) {
        return _jsx("div", { className: "text-muted-foreground text-sm", children: "Loading transactions\u2026" });
    }
    const needsQty = kind === "purchase" || kind === "sale" || kind === "split" || kind === "adjustment";
    const needsPrice = kind === "purchase" || kind === "sale";
    const needsAmount = ["dividend", "interest", "fee", "contribution", "withdrawal"].includes(kind);
    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!securityId) {
            toast.error("Choose a security.");
            return;
        }
        const priceCents = needsPrice ? Math.round(Number.parseFloat(price || "0") * 100) : undefined;
        if (needsPrice && (!priceCents || priceCents <= 0)) {
            toast.error("Enter a positive price.");
            return;
        }
        const amountCents = needsAmount ? Math.round(Number.parseFloat(amount || "0") * 100) : undefined;
        const feeCents = fee.trim() ? Math.round(Number.parseFloat(fee) * 100) : undefined;
        setSaving(true);
        try {
            await recordTxn({
                securityId: securityId,
                kind,
                qtyInput: needsQty && qty.trim() ? qty : undefined,
                priceCents: needsPrice ? priceCents : undefined,
                amountCents: needsAmount ? amountCents : undefined,
                feeCents,
                note: note.trim() || undefined,
            });
            toast.success("Transaction recorded");
            setOpen(false);
            setQty("");
            setPrice("");
            setAmount("");
            setFee("");
            setNote("");
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Couldn't record the transaction.");
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx(BizPageHeader, { title: "Investment Transactions", subtitle: "Purchases, sales, dividends, fees, splits and adjustments \u2014 all in integer cents.", children: _jsxs(Dialog, { open: open, onOpenChange: setOpen, children: [_jsx(DialogTrigger, { asChild: true, children: _jsxs(Button, { children: [_jsx(Plus, { className: "size-4" }), " Record transaction"] }) }), _jsxs(DialogContent, { className: "sm:max-w-md", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: "Record investment transaction" }) }), _jsxs("form", { onSubmit: handleSubmit, className: "flex flex-col gap-4", children: [_jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { children: "Type" }), _jsxs(Select, { value: kind, onValueChange: (next) => setKind(next), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: KINDS.map((option) => (_jsx(SelectItem, { value: option, children: option }, option))) })] })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { children: "Security" }), _jsxs(Select, { value: securityId, onValueChange: setSecurityId, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Choose" }) }), _jsx(SelectContent, { children: securities.map((security) => (_jsx(SelectItem, { value: security._id, children: security.symbol }, security._id))) })] })] })] }), needsQty && (_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "txn-qty", children: "Quantity (fractional allowed, e.g. 0.5)" }), _jsx(Input, { id: "txn-qty", value: qty, onChange: (event) => setQty(event.target.value), placeholder: "1" })] })), needsPrice && (_jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "txn-price", children: "Price (KSh)" }), _jsx(Input, { id: "txn-price", inputMode: "decimal", value: price, onChange: (event) => setPrice(event.target.value) })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "txn-fee", children: "Fee (KSh)" }), _jsx(Input, { id: "txn-fee", inputMode: "decimal", value: fee, onChange: (event) => setFee(event.target.value) })] })] })), needsAmount && (_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "txn-amount", children: "Amount (KSh)" }), _jsx(Input, { id: "txn-amount", inputMode: "decimal", value: amount, onChange: (event) => setAmount(event.target.value) })] })), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "txn-note", children: "Note" }), _jsx(Input, { id: "txn-note", value: note, onChange: (event) => setNote(event.target.value) })] }), _jsx(DialogFooter, { children: _jsxs(Button, { type: "submit", disabled: saving, children: [saving && _jsx(Loader2, { className: "animate-spin" }), " Record"] }) })] })] })] }) }), _jsx("div", { className: "surface-card overflow-x-auto rounded-xl border", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-border/70 text-muted-foreground border-b text-left text-xs uppercase tracking-wider", children: [_jsx("th", { className: "px-4 py-2.5", children: "Date" }), _jsx("th", { className: "px-4 py-2.5", children: "Type" }), _jsx("th", { className: "px-4 py-2.5", children: "Security" }), _jsx("th", { className: "px-4 py-2.5", children: "Qty" }), _jsx("th", { className: "px-4 py-2.5 text-right", children: "Cash effect" }), _jsx("th", { className: "px-4 py-2.5 text-right", children: "Realized gain" })] }) }), _jsxs("tbody", { children: [txns.map((txn) => (_jsxs("tr", { className: "border-border/60 border-b last:border-0", children: [_jsx("td", { className: "text-muted-foreground px-4 py-3 text-xs", children: formatShortDate(txn.date) }), _jsx("td", { className: "px-4 py-3", children: txn.kind }), _jsx("td", { className: "px-4 py-3 font-medium", children: txn.symbol }), _jsx("td", { className: "px-4 py-3 tabular-nums", children: txn.qtyMicro ? txn.qtyMicro / 1000000 : "—" }), _jsxs("td", { className: "px-4 py-3 text-right font-semibold tabular-nums", children: [txn.amountCents >= 0 ? "+" : "−", formatMoney(Math.abs(txn.amountCents))] }), _jsx("td", { className: "text-muted-foreground px-4 py-3 text-right tabular-nums", children: txn.realizedGainCents === undefined || txn.realizedGainCents === null
                                                ? "—"
                                                : formatMoney(txn.realizedGainCents) })] }, txn._id))), txns.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 6, className: "text-muted-foreground px-4 py-10 text-center text-sm", children: "No transactions yet." }) }))] })] }) })] }));
}
