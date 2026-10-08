import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BizPageHeader, BizStatCard, useEnsureGHub } from "@/components/finance/BizParts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import { consolidatedExpensesCents, consolidatedIncomeCents, operatingExpensesCents, OWNER_MOVEMENT_CATEGORIES, } from "@/lib/business";
import { formatMoney, formatShortDate, parseAmountToCents } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
const OUT_CATEGORIES = [
    "Operating Expense",
    "Salaries",
    "Rent",
    "Software",
    "Transport",
    "Money Market Fund",
    "Owner Drawings",
];
const IN_CATEGORIES = [
    "Client Payment",
    "Other Income",
    "Owner Capital",
];
export default function BusinessFinancialsPage() {
    useEnsureGHub();
    const ledger = useQuery(api.business.listLedger, {});
    const overview = useQuery(api.business.overview, {});
    const addEntry = useMutation(api.business.addLedgerEntry);
    const removeEntry = useMutation(api.business.removeLedgerEntry);
    const [open, setOpen] = useState(false);
    const [direction, setDirection] = useState("out");
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("Operating Expense");
    const [description, setDescription] = useState("");
    const [saving, setSaving] = useState(false);
    if (ledger === undefined) {
        return _jsx("div", { className: "text-muted-foreground text-sm", children: "Loading ledger\u2026" });
    }
    const rows = [...ledger].sort((a, b) => b.date - a.date);
    const opex = operatingExpensesCents(rows.map((row) => ({ direction: row.direction, amount: row.amount, category: row.category })));
    const externalIncome = consolidatedIncomeCents(rows);
    const ownerOut = rows
        .filter((row) => row.direction === "out" && OWNER_MOVEMENT_CATEGORIES.includes(row.category))
        .reduce((sum, row) => sum + row.amount, 0);
    const ordinaryConsumption = consolidatedExpensesCents(rows);
    const handleSubmit = async (event) => {
        event.preventDefault();
        const cents = parseAmountToCents(amount);
        if (cents === null) {
            toast.error("Enter a valid amount.");
            return;
        }
        setSaving(true);
        try {
            await addEntry({
                direction,
                amount: cents,
                category,
                description: description.trim() || category,
                date: Date.now(),
            });
            toast.success("Ledger entry recorded");
            setOpen(false);
            setAmount("");
            setDescription("");
        }
        catch {
            toast.error("Could not record the entry.");
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx(BizPageHeader, { title: "Business Financials", subtitle: "Separate business ledger \u2014 never mixes with household transactions.", children: _jsxs(Button, { onClick: () => setOpen(true), children: [_jsx(Plus, { className: "size-4" }), " Record entry"] }) }), overview && (_jsxs("div", { className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-4", children: [_jsx(BizStatCard, { label: "Revenue YTD", value: formatMoney(overview.revenueYtd) }), _jsx(BizStatCard, { label: "Operating expenses", value: formatMoney(opex) }), _jsx(BizStatCard, { label: "Owner drawings", value: formatMoney(ownerOut), hint: "Not a business expense" }), _jsx(BizStatCard, { label: "Ordinary consumption (consolidated basis)", value: formatMoney(ordinaryConsumption), hint: "Transfers and owner moves excluded" })] })), _jsx("div", { className: "surface-card overflow-x-auto rounded-xl border", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-border/70 text-muted-foreground border-b text-left text-xs uppercase tracking-wider", children: [_jsx("th", { className: "px-4 py-2.5", children: "Date" }), _jsx("th", { className: "px-4 py-2.5", children: "Description" }), _jsx("th", { className: "px-4 py-2.5", children: "Category" }), _jsx("th", { className: "px-4 py-2.5 text-right", children: "Amount" }), _jsx("th", { className: "px-4 py-2.5" })] }) }), _jsxs("tbody", { children: [rows.map((row) => (_jsxs("tr", { className: "border-border/60 border-b last:border-0", children: [_jsx("td", { className: "text-muted-foreground px-4 py-3 text-xs", children: formatShortDate(row.date) }), _jsx("td", { className: "px-4 py-3", children: row.description }), _jsx("td", { className: "text-muted-foreground px-4 py-3 text-xs", children: row.category }), _jsxs("td", { className: `px-4 py-3 text-right font-semibold tabular-nums ${row.direction === "in" ? "text-positive" : ""}`, children: [row.direction === "in" ? "+" : "\u2212", formatMoney(row.amount)] }), _jsx("td", { className: "px-4 py-3 text-right", children: _jsx(Button, { variant: "ghost", size: "icon-sm", "aria-label": "Delete entry", onClick: () => void removeEntry({ entryId: row._id })
                                                    .then(() => toast.success("Entry removed"))
                                                    .catch(() => toast.error("Only the owner can delete entries.")), className: "text-muted-foreground hover:text-destructive", children: _jsx(Trash2, { className: "size-3.5" }) }) })] }, row._id))), rows.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "text-muted-foreground px-4 py-10 text-center text-sm", children: "No ledger entries yet." }) }))] })] }) }), _jsx(Dialog, { open: open, onOpenChange: setOpen, children: _jsxs(DialogContent, { className: "sm:max-w-md", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: "Record business entry" }) }), _jsxs("form", { onSubmit: handleSubmit, className: "flex flex-col gap-4", children: [_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { children: "Direction" }), _jsxs(Select, { value: direction, onValueChange: (next) => {
                                                setDirection(next);
                                                setCategory(next === "in" ? "Client Payment" : "Operating Expense");
                                            }, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "in", children: "Money in (revenue / capital)" }), _jsx(SelectItem, { value: "out", children: "Money out (expense / drawing)" })] })] })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { children: "Category" }), _jsxs(Select, { value: category, onValueChange: setCategory, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: (direction === "in" ? IN_CATEGORIES : OUT_CATEGORIES).map((option) => (_jsx(SelectItem, { value: option, children: option }, option))) })] })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "ledger-amount", children: "Amount (KSh)" }), _jsx(Input, { id: "ledger-amount", inputMode: "decimal", value: amount, onChange: (event) => setAmount(event.target.value), placeholder: "0.00", autoFocus: true })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "ledger-desc", children: "Description" }), _jsx(Input, { id: "ledger-desc", value: description, onChange: (event) => setDescription(event.target.value) })] }), _jsx(DialogFooter, { children: _jsxs(Button, { type: "submit", disabled: saving, children: [saving && _jsx(Loader2, { className: "animate-spin" }), " Record"] }) })] })] }) })] }));
}
