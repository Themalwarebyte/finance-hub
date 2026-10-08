import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BizPageHeader, useEnsureGHub } from "@/components/finance/BizParts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import { SALES_STAGES, pipelineValue } from "@/lib/business";
import { formatMoney, formatShortDate } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Plus, Repeat } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
export default function ClientsPage() {
    useEnsureGHub();
    const leads = useQuery(api.businessSales.listLeads, {});
    const createLead = useMutation(api.businessSales.createLead);
    const setLeadStage = useMutation(api.businessSales.setLeadStage);
    const convert = useMutation(api.businessSales.convertToClient);
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [contact, setContact] = useState("");
    const [value, setValue] = useState("");
    const [newLeadStage, setNewLeadStage] = useState("New");
    const [saving, setSaving] = useState(false);
    if (leads === undefined) {
        return _jsx("div", { className: "text-muted-foreground text-sm", children: "Loading clients and leads\u2026" });
    }
    const rows = [...leads].sort((a, b) => (b.nextFollowUp ?? 0) - (a.nextFollowUp ?? 0));
    const pipeline = pipelineValue(rows.map((row) => ({ stage: row.stage, estimatedValueCents: row.estimatedValueCents })));
    const handleSubmit = async (event) => {
        event.preventDefault();
        const cents = Math.round(Number.parseFloat(value || "0") * 100);
        if (!name.trim() || !contact.trim() || !Number.isFinite(cents) || cents <= 0) {
            toast.error("Fill in the business name, contact and a value.");
            return;
        }
        setSaving(true);
        try {
            await createLead({
                businessName: name.trim(),
                contactPerson: contact.trim(),
                category: "General",
                source: "Direct",
                serviceRequired: "Service",
                estimatedValueCents: cents,
                stage: newLeadStage,
            });
            toast.success("Lead added");
            setOpen(false);
            setName("");
            setContact("");
            setValue("");
            setNewLeadStage("New");
        }
        catch {
            toast.error("Couldn't add the lead.");
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx(BizPageHeader, { title: "Clients & Leads", subtitle: `Pipeline value ${formatMoney(pipeline)} · ${rows.length} records`, children: _jsxs(Button, { onClick: () => setOpen(true), children: [_jsx(Plus, { className: "size-4" }), " New lead"] }) }), _jsx("div", { className: "surface-card overflow-x-auto rounded-xl border", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-border/70 text-muted-foreground border-b text-left text-xs uppercase tracking-wider", children: [_jsx("th", { className: "px-4 py-2.5", children: "Business" }), _jsx("th", { className: "px-4 py-2.5", children: "Contact" }), _jsx("th", { className: "px-4 py-2.5", children: "Value" }), _jsx("th", { className: "px-4 py-2.5", children: "Stage" }), _jsx("th", { className: "px-4 py-2.5", children: "Follow-up" })] }) }), _jsxs("tbody", { children: [rows.map((row) => (_jsxs("tr", { className: "border-border/60 border-b last:border-0", children: [_jsxs("td", { className: "px-4 py-3", children: [_jsx("div", { className: "font-medium", children: row.businessName }), _jsx("div", { className: "text-muted-foreground text-xs", children: row.serviceRequired })] }), _jsxs("td", { className: "px-4 py-3", children: [_jsx("div", { children: row.contactPerson }), _jsx("div", { className: "text-muted-foreground text-xs", children: row.contactEmail ?? row.contactPhone ?? "—" })] }), _jsx("td", { className: "px-4 py-3 tabular-nums", children: formatMoney(row.estimatedValueCents) }), _jsx("td", { className: "px-4 py-3", children: row.isClient ? (_jsxs(Badge, { variant: "secondary", children: [_jsx(Repeat, { className: "size-3" }), " Client"] })) : (_jsxs(Select, { value: row.stage, onValueChange: (next) => {
                                                    void setLeadStage({ leadId: row._id, stage: next })
                                                        .then(() => toast.success(`Stage → ${next}`))
                                                        .catch(() => toast.error("Stage update failed."));
                                                }, children: [_jsx(SelectTrigger, { className: "h-8 w-36 text-xs", children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: SALES_STAGES.map((option) => (_jsx(SelectItem, { value: option, children: option }, option))) })] })) }), _jsxs("td", { className: "px-4 py-3 text-muted-foreground text-xs", children: [row.isClient
                                                    ? "—"
                                                    : row.nextFollowUp
                                                        ? formatShortDate(row.nextFollowUp)
                                                        : "Not scheduled", row.isClient && row.stage === "Won" && (_jsx(Button, { variant: "ghost", size: "sm", className: "text-primary", onClick: () => {
                                                        void convert({
                                                            leadId: row._id,
                                                            contract: {
                                                                title: `${row.businessName} service contract`,
                                                                startDate: Date.now(),
                                                                billingFrequency: "monthly",
                                                                billingAmountCents: row.estimatedValueCents,
                                                                isRetainer: true,
                                                            },
                                                        })
                                                            .then(() => toast.success("Converted to client with retainer."))
                                                            .catch(() => toast.error("Conversion failed."));
                                                    }, children: "Convert" }))] })] }, row._id))), rows.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "text-muted-foreground px-4 py-10 text-center text-sm", children: "No leads yet \u2014 add your first opportunity." }) }))] })] }) }), _jsx(Dialog, { open: open, onOpenChange: setOpen, children: _jsxs(DialogContent, { className: "sm:max-w-md", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: "New lead" }) }), _jsxs("form", { onSubmit: handleSubmit, className: "flex flex-col gap-4", children: [_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "lead-name", children: "Business name" }), _jsx(Input, { id: "lead-name", value: name, onChange: (e) => setName(e.target.value), autoFocus: true })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "lead-contact", children: "Contact person" }), _jsx(Input, { id: "lead-contact", value: contact, onChange: (e) => setContact(e.target.value) })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "lead-value", children: "Est. value (KSh)" }), _jsx(Input, { id: "lead-value", inputMode: "decimal", value: value, onChange: (e) => setValue(e.target.value), placeholder: "0" })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { children: "Stage" }), _jsxs(Select, { value: newLeadStage, onValueChange: setNewLeadStage, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: SALES_STAGES.filter((s) => s !== "Won" && s !== "Lost").map((option) => (_jsx(SelectItem, { value: option, children: option }, option))) })] })] })] }), _jsx(DialogFooter, { children: _jsxs(Button, { type: "submit", disabled: saving, children: [saving && _jsx(Loader2, { className: "animate-spin" }), " Add lead"] }) })] })] }) })] }));
}
