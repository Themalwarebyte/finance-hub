import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BizPageHeader, useEnsureGHub } from "@/components/finance/BizParts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import { SALES_STAGES, followUpState, } from "@/lib/business";
import { formatMoney, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
const FOLLOW_UP_BADGE = {
    overdue: "border-destructive/40 bg-destructive/10 text-destructive",
    today: "border-amber-500/40 bg-amber-500/10 text-amber-600",
    upcoming: "border-border text-muted-foreground",
};
export default function LeadsPage() {
    useEnsureGHub();
    const leads = useQuery(api.businessSales.listLeads, {});
    const metrics = useQuery(api.businessSales.pipelineMetrics, {});
    const createLead = useMutation(api.businessSales.createLead);
    const setStage = useMutation(api.businessSales.setLeadStage);
    const recordFollowUp = useMutation(api.businessSales.recordFollowUp);
    const convert = useMutation(api.businessSales.convertToClient);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({
        businessName: "",
        contactPerson: "",
        phone: "",
        email: "",
        category: "",
        location: "",
        source: "",
        serviceRequired: "",
        value: "",
        probability: "",
        notes: "",
    });
    const [saving, setSaving] = useState(false);
    if (leads === undefined || metrics === undefined) {
        return _jsx("div", { className: "text-muted-foreground text-sm", children: "Loading pipeline\u2026" });
    }
    const rows = leads;
    const openLeads = rows.filter((row) => !row.isClient && row.stage !== "Won" && row.stage !== "Lost");
    const followUpCounts = {
        overdue: openLeads.filter((row) => followUpState(row.nextFollowUp, Date.now()) === "overdue").length,
        today: openLeads.filter((row) => followUpState(row.nextFollowUp, Date.now()) === "today").length,
    };
    const weekAlert = followUpCounts.overdue + followUpCounts.today > 0
        ? `${followUpCounts.overdue + followUpCounts.today} lead(s) require follow-up this week (${followUpCounts.overdue} overdue, ${followUpCounts.today} today).`
        : null;
    const moveStage = (lead, direction) => {
        const index = SALES_STAGES.indexOf(lead.stage);
        const next = SALES_STAGES[Math.min(SALES_STAGES.length - 1, Math.max(0, (index === -1 ? 0 : index) + direction))];
        void setStage({ leadId: lead._id, stage: next })
            .then(() => toast.success(`${lead.businessName} → ${next}`))
            .catch(() => toast.error("Stage update failed."));
    };
    const handleCreate = async (event) => {
        event.preventDefault();
        const cents = Math.round(Number.parseFloat(form.value || "0") * 100);
        if (!form.businessName.trim() || !form.contactPerson.trim() || !Number.isFinite(cents) || cents <= 0) {
            toast.error("Business name, contact person and a positive value are required.");
            return;
        }
        const probability = Number.parseInt(form.probability || "", 10);
        setSaving(true);
        try {
            await createLead({
                businessName: form.businessName.trim(),
                contactPerson: form.contactPerson.trim(),
                contactPhone: form.phone.trim() || undefined,
                contactEmail: form.email.trim() || undefined,
                category: form.category.trim() || "General",
                location: form.location.trim() || undefined,
                source: form.source.trim() || "Direct",
                serviceRequired: form.serviceRequired.trim() || "Website Development",
                estimatedValueCents: cents,
                probability: Number.isFinite(probability) ? Math.min(100, Math.max(0, probability)) : undefined,
                notes: form.notes.trim() || undefined,
                stage: "New Lead",
            });
            toast.success("Lead added to the pipeline");
            setOpen(false);
            setForm({
                businessName: "", contactPerson: "", phone: "", email: "", category: "",
                location: "", source: "", serviceRequired: "", value: "", probability: "", notes: "",
            });
        }
        catch {
            toast.error("Couldn't add the lead.");
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx(BizPageHeader, { title: "Lead Pipeline", subtitle: "CRM pipeline: New Lead through Won/Lost. Drag-free by design \u2014 use the stage arrows on each card.", children: _jsxs(Button, { onClick: () => setOpen(true), children: [_jsx(Plus, { className: "size-4" }), " New lead"] }) }), weekAlert && (_jsxs("div", { className: "border-amber-500/40 bg-amber-500/5 flex items-center gap-2 rounded-xl border p-3 text-sm", children: [_jsx("span", { className: "text-amber-600 font-semibold", children: "Follow-ups:" }), weekAlert] })), _jsxs("section", { className: "surface-card rounded-xl border p-4", children: [_jsx("h2", { className: "text-sm font-semibold", children: "Pipeline analytics" }), _jsxs("div", { className: "mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5", children: [_jsx(Metric, { label: "Total leads", value: metrics.totalLeads }), _jsx(Metric, { label: "Active opportunities", value: metrics.activeOpportunities }), _jsx(Metric, { label: "Pipeline value", value: formatMoney(metrics.pipelineValueCents) }), _jsx(Metric, { label: "Weighted pipeline", value: formatMoney(metrics.weightedPipelineValueCents), hint: "Value \u00D7 win probability" }), _jsx(Metric, { label: "Conversion rate", value: metrics.conversionRatePct === null
                                    ? "—"
                                    : `${metrics.conversionRatePct}%`, hint: "Won \u00F7 (won + lost)" }), _jsx(Metric, { label: "Average deal size", value: metrics.averageDealSizeCents === null
                                    ? "—"
                                    : formatMoney(metrics.averageDealSizeCents) }), _jsx(Metric, { label: "Average sales cycle", value: metrics.averageSalesCycleMs === null
                                    ? "—"
                                    : `${Math.round(metrics.averageSalesCycleMs / 86400000)} days` }), _jsx(Metric, { label: "Won revenue this month", value: formatMoney(metrics.wonRevenueThisMonthCents) }), _jsx(Metric, { label: "Won (all time)", value: metrics.wonCount }), _jsx(Metric, { label: "Lost opportunities", value: metrics.lostCount })] })] }), _jsx("div", { className: "overflow-x-auto pb-2", children: _jsx("div", { className: "flex gap-3", style: { minWidth: "max-content" }, children: SALES_STAGES.map((stage) => {
                        const stageLeads = rows.filter((row) => !row.isClient && row.stage === stage);
                        return (_jsxs("div", { className: "bg-muted/30 w-64 shrink-0 rounded-xl border p-2", children: [_jsxs("div", { className: "flex items-center justify-between px-1 py-1.5", children: [_jsx("span", { className: "text-xs font-semibold", children: stage }), _jsx(Badge, { variant: "secondary", children: stageLeads.length })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [stageLeads.map((lead) => {
                                            const fu = followUpState(lead.nextFollowUp, Date.now());
                                            return (_jsxs("div", { className: "surface-card rounded-lg border p-2.5 text-xs", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "truncate text-sm font-medium", children: lead.businessName }), _jsxs("p", { className: "text-muted-foreground truncate", children: [lead.contactPerson, " \u00B7 ", lead.contactEmail ?? lead.contactPhone ?? "no contact"] })] }), _jsx("span", { className: "shrink-0 font-semibold tabular-nums", children: formatMoney(lead.estimatedValueCents, { cents: false }) })] }), _jsxs("div", { className: "text-muted-foreground mt-1 flex flex-wrap gap-1", children: [_jsx("span", { children: lead.source }), _jsx("span", { children: "\u00B7" }), _jsx("span", { children: lead.serviceRequired })] }), fu && (_jsx("span", { className: cn("mt-1.5 inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium", FOLLOW_UP_BADGE[fu]), children: fu === "overdue"
                                                            ? "Follow-up overdue"
                                                            : fu === "today"
                                                                ? "Follow-up today"
                                                                : `Follow-up ${formatShortDate(lead.nextFollowUp)}` })), lead.notes && (_jsx("p", { className: "text-muted-foreground mt-1.5 line-clamp-2 italic", children: lead.notes })), _jsxs("div", { className: "mt-2 flex items-center gap-1", children: [stage !== "New Lead" && (_jsx(Button, { size: "sm", variant: "ghost", className: "h-7 px-2", "aria-label": `Move ${lead.businessName} back`, onClick: () => moveStage(lead, -1), children: _jsx(ArrowLeft, { className: "size-3.5" }) })), stage !== "Lost" && stage !== "Won" && (_jsx(Button, { size: "sm", variant: "ghost", className: "h-7 px-2", "aria-label": `Move ${lead.businessName} forward`, onClick: () => moveStage(lead, 1), children: _jsx(ArrowRight, { className: "size-3.5" }) })), stage === "Won" && (_jsx(Button, { size: "sm", className: "h-7", onClick: () => void convert({
                                                                    leadId: lead._id,
                                                                    contract: {
                                                                        title: `${lead.businessName} — ${lead.serviceRequired}`,
                                                                        startDate: Date.now(),
                                                                        billingFrequency: "monthly",
                                                                        billingAmountCents: lead.estimatedValueCents,
                                                                        isRetainer: true,
                                                                    },
                                                                })
                                                                    .then(() => toast.success(`${lead.businessName} converted to client with contract.`))
                                                                    .catch(() => toast.error("Conversion failed (owner only).")), children: "Convert" })), stage !== "Lost" && stage !== "Won" && (_jsx(Button, { size: "sm", variant: "ghost", className: "text-destructive ml-auto h-7 px-2", onClick: () => void recordFollowUp({
                                                                    leadId: lead._id,
                                                                    nextFollowUp: Date.now() + 7 * 86400000,
                                                                })
                                                                    .then(() => toast.success("Follow-up logged, next set +7 days"))
                                                                    .catch(() => toast.error("Couldn't log follow-up.")), children: "Follow-up done" }))] })] }, lead._id));
                                        }), stageLeads.length === 0 && (_jsx("p", { className: "text-muted-foreground px-1 py-3 text-center text-[11px]", children: "Empty" }))] })] }, stage));
                    }) }) }), _jsx(Dialog, { open: open, onOpenChange: setOpen, children: _jsxs(DialogContent, { className: "max-h-[85vh] overflow-y-auto sm:max-w-lg", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: "New lead" }) }), _jsxs("form", { onSubmit: handleCreate, className: "grid grid-cols-2 gap-3", children: [_jsx(Field, { label: "Business name *", children: _jsx(Input, { value: form.businessName, onChange: (e) => setForm({ ...form, businessName: e.target.value }), autoFocus: true }) }), _jsx(Field, { label: "Contact person *", children: _jsx(Input, { value: form.contactPerson, onChange: (e) => setForm({ ...form, contactPerson: e.target.value }) }) }), _jsx(Field, { label: "Phone", children: _jsx(Input, { value: form.phone, onChange: (e) => setForm({ ...form, phone: e.target.value }) }) }), _jsx(Field, { label: "Email", children: _jsx(Input, { type: "email", value: form.email, onChange: (e) => setForm({ ...form, email: e.target.value }) }) }), _jsx(Field, { label: "Industry / category", children: _jsx(Input, { value: form.category, onChange: (e) => setForm({ ...form, category: e.target.value }), placeholder: "Retail, Hospitality\u2026" }) }), _jsx(Field, { label: "Location", children: _jsx(Input, { value: form.location, onChange: (e) => setForm({ ...form, location: e.target.value }), placeholder: "Nairobi\u2026" }) }), _jsx(Field, { label: "Lead source", children: _jsx(Input, { value: form.source, onChange: (e) => setForm({ ...form, source: e.target.value }), placeholder: "Referral, cold outreach\u2026" }) }), _jsx(Field, { label: "Service interest", children: _jsx(Input, { value: form.serviceRequired, onChange: (e) => setForm({ ...form, serviceRequired: e.target.value }), placeholder: "Website Development\u2026" }) }), _jsx(Field, { label: "Estimated value (KSh) *", children: _jsx(Input, { inputMode: "decimal", value: form.value, onChange: (e) => setForm({ ...form, value: e.target.value }), placeholder: "0" }) }), _jsx(Field, { label: "Probability % (optional)", children: _jsx(Input, { inputMode: "numeric", value: form.probability, onChange: (e) => setForm({ ...form, probability: e.target.value }), placeholder: "Stage default" }) }), _jsxs("div", { className: "col-span-2 flex flex-col gap-1", children: [_jsx(Label, { children: "Notes" }), _jsx(Input, { value: form.notes, onChange: (e) => setForm({ ...form, notes: e.target.value }), placeholder: "Context, decision makers, timing\u2026" })] }), _jsx(DialogFooter, { className: "col-span-2", children: _jsx(Button, { type: "submit", disabled: saving, children: saving ? "Adding…" : "Add lead" }) })] })] }) })] }));
}
function Field({ label, children }) {
    return (_jsxs("div", { className: "flex flex-col gap-1", children: [_jsx(Label, { className: "text-xs", children: label }), children] }));
}
function Metric({ label, value, hint }) {
    return (_jsxs("div", { className: "border-border/60 rounded-lg border p-2.5", children: [_jsx("p", { className: "text-muted-foreground text-[10px] font-semibold uppercase tracking-wider", children: label }), _jsx("p", { className: "mt-1 text-sm font-semibold tabular-nums", children: value }), hint && _jsx("p", { className: "text-muted-foreground mt-0.5 text-[10px]", children: hint })] }));
}
