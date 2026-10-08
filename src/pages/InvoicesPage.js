import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BizPageHeader, useEnsureGHub } from "@/components/finance/BizParts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import { receivablesCents } from "@/lib/business";
import { formatMoney, formatDate } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
export default function InvoicesPage() {
    useEnsureGHub();
    const invoices = useQuery(api.businessSales.listInvoices, {});
    const recordPayment = useMutation(api.businessSales.recordInvoicePayment);
    const setEtims = useMutation(api.businessSales.setEtimsReference);
    const [payFor, setPayFor] = useState(null);
    const [payAmount, setPayAmount] = useState("");
    const [payMethod, setPayMethod] = useState("M-PESA");
    const [saving, setSaving] = useState(false);
    if (invoices === undefined) {
        return _jsx("div", { className: "text-muted-foreground text-sm", children: "Loading invoices\u2026" });
    }
    const receivables = receivablesCents(invoices.map((i) => ({
        amountCents: i.amountCents,
        paidCents: i.paidCents,
        status: i.status,
    })));
    const handlePay = async () => {
        if (!payFor)
            return;
        const cents = Math.round(Number.parseFloat(payAmount || "0") * 100);
        if (!Number.isFinite(cents) || cents <= 0) {
            toast.error("Enter a payment amount above zero.");
            return;
        }
        setSaving(true);
        try {
            await recordPayment({
                invoiceId: payFor._id,
                amountCents: cents,
                method: payMethod,
            });
            toast.success("Payment recorded");
            setPayFor(null);
            setPayAmount("");
        }
        catch {
            toast.error("Payment rejected — check the outstanding balance.");
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx(BizPageHeader, { title: "Invoices & Payments", subtitle: `Outstanding receivables: ${formatMoney(receivables)}` }), _jsx("p", { className: "text-muted-foreground text-xs", children: "Invoice records aren't submitted to KRA eTIMS automatically \u2014 references are stored manually for your own reconciliation. This is not eTIMS compliance." }), _jsx("div", { className: "surface-card overflow-x-auto rounded-xl border", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-border/70 text-muted-foreground border-b text-left text-xs uppercase tracking-wider", children: [_jsx("th", { className: "px-4 py-2.5", children: "Invoice" }), _jsx("th", { className: "px-4 py-2.5", children: "Client" }), _jsx("th", { className: "px-4 py-2.5", children: "Amount" }), _jsx("th", { className: "px-4 py-2.5", children: "Paid" }), _jsx("th", { className: "px-4 py-2.5", children: "Status" }), _jsx("th", { className: "px-4 py-2.5", children: "eTIMS" }), _jsx("th", { className: "px-4 py-2.5" })] }) }), _jsxs("tbody", { children: [invoices.map((invoice) => invoice).map((invoice) => (_jsxs("tr", { className: "border-border/60 border-b last:border-0", children: [_jsxs("td", { className: "px-4 py-3", children: [_jsx("div", { className: "font-medium", children: invoice.number }), _jsxs("div", { className: "text-muted-foreground text-xs", children: ["due ", formatDate(invoice.dueDate)] })] }), _jsx("td", { className: "px-4 py-3", children: invoice.clientName }), _jsx("td", { className: "px-4 py-3 tabular-nums", children: formatMoney(invoice.amountCents) }), _jsx("td", { className: "px-4 py-3 tabular-nums", children: formatMoney(invoice.paidCents) }), _jsx("td", { className: "px-4 py-3", children: _jsx(Badge, { variant: invoice.status === "paid" ? "default" : "secondary", children: invoice.status.replace(/_/g, " ") }) }), _jsxs("td", { className: "text-muted-foreground px-4 py-3 text-xs", children: [invoice.etimsRef ?? "—", invoice.etimsStatus ? ` (${invoice.etimsStatus})` : ""] }), _jsx("td", { className: "px-4 py-3 text-right", children: invoice.status !== "paid" && invoice.status !== "draft" && (_jsx(Button, { size: "sm", variant: "outline", onClick: () => {
                                                    setPayFor(invoice);
                                                    setPayAmount(((invoice.amountCents - invoice.paidCents) / 100).toFixed(2));
                                                }, children: "Record payment" })) })] }, invoice._id))), invoices.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 7, className: "text-muted-foreground px-4 py-10 text-center text-sm", children: "No invoices yet." }) }))] })] }) }), _jsx(Dialog, { open: payFor !== null, onOpenChange: (open) => !open && setPayFor(null), children: _jsxs(DialogContent, { className: "sm:max-w-sm", children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { children: ["Record payment \u2014 ", payFor?.number] }) }), _jsxs("form", { onSubmit: (event) => {
                                event.preventDefault();
                                void handlePay();
                            }, className: "flex flex-col gap-4", children: [_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "pay-amount", children: "Amount (KSh)" }), _jsx(Input, { id: "pay-amount", inputMode: "decimal", value: payAmount, onChange: (event) => setPayAmount(event.target.value), autoFocus: true })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "pay-method", children: "Method" }), _jsx(Input, { id: "pay-method", value: payMethod, onChange: (event) => setPayMethod(event.target.value) })] }), _jsx(DialogFooter, { children: _jsxs(Button, { type: "submit", disabled: saving, children: [saving && _jsx(Loader2, { className: "animate-spin" }), " Record"] }) })] })] }) })] }));
}
