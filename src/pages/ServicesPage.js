import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BizPageHeader, useEnsureGHub } from "@/components/finance/BizParts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import { formatMoney } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
const EMPTY_FORM = {
    name: "",
    description: "",
    priceMin: "",
    priceMax: "",
};
export default function ServicesPage() {
    useEnsureGHub();
    const services = useQuery(api.services.listServices, {});
    const seed = useMutation(api.services.seedDefaultServices);
    const createService = useMutation(api.services.createService);
    const updateService = useMutation(api.services.updateService);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    if (services === undefined) {
        return _jsx("div", { className: "text-muted-foreground text-sm", children: "Loading services\u2026" });
    }
    const rows = services;
    const openDialog = (service) => {
        setEditing(service);
        setForm(service
            ? {
                name: service.name,
                description: service.description ?? "",
                priceMin: (service.priceMinCents / 100).toFixed(0),
                priceMax: (service.priceMaxCents / 100).toFixed(0),
            }
            : EMPTY_FORM);
        setOpen(true);
    };
    const handleSave = async (event) => {
        event.preventDefault();
        const min = Math.round(Number.parseFloat(form.priceMin || "0") * 100);
        const max = Math.round(Number.parseFloat(form.priceMax || "0") * 100);
        if (!form.name.trim() || !Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max < min) {
            toast.error("Name and a valid price range (max ≥ min > 0) are required.");
            return;
        }
        setSaving(true);
        try {
            if (editing) {
                await updateService({
                    serviceId: editing._id,
                    name: form.name.trim(),
                    description: form.description.trim() || undefined,
                    priceMinCents: min,
                    priceMaxCents: max,
                    active: editing.active,
                });
                toast.success("Service updated");
            }
            else {
                await createService({
                    name: form.name.trim(),
                    description: form.description.trim() || undefined,
                    priceMinCents: min,
                    priceMaxCents: max,
                    active: true,
                });
                toast.success("Service added");
            }
            setOpen(false);
        }
        catch {
            toast.error("Couldn't save the service.");
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsxs(BizPageHeader, { title: "GHub Services Catalogue", subtitle: "Reference data for proposals \u2014 prices are ranges you quote from, not transactions.", children: [rows.length === 0 && (_jsxs(Button, { variant: "outline", onClick: () => void seed({})
                            .then(() => toast.success("Default services added"))
                            .catch(() => toast.error("Couldn't seed the catalogue.")), children: [_jsx(Sparkles, { className: "size-4" }), " Load the 5 default services"] })), _jsxs(Button, { onClick: () => openDialog(null), children: [_jsx(Plus, { className: "size-4" }), " Add service"] })] }), _jsx("section", { className: "surface-card rounded-xl border p-4", children: rows.length === 0 ? (_jsx("p", { className: "text-muted-foreground text-sm", children: "No services yet. Load the five default GHub services or add your own." })) : (_jsx("ul", { className: "divide-y", children: rows.map((service) => (_jsxs("li", { className: "flex items-center justify-between gap-3 py-3", children: [_jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("p", { className: "text-sm font-medium", children: service.name }), _jsx(Badge, { variant: service.active ? "default" : "secondary", children: service.active ? "Active" : "Inactive" })] }), service.description && (_jsx("p", { className: "text-muted-foreground mt-0.5 text-xs", children: service.description }))] }), _jsxs("div", { className: "flex shrink-0 items-center gap-2", children: [_jsxs("span", { className: "text-sm font-semibold tabular-nums", children: [formatMoney(service.priceMinCents, { cents: false }), " \u2013", " ", formatMoney(service.priceMaxCents, { cents: false })] }), _jsx(Button, { size: "sm", variant: "outline", onClick: () => openDialog(service), children: "Edit" }), _jsx(Button, { size: "sm", variant: "ghost", onClick: () => void updateService({
                                            serviceId: service._id,
                                            name: service.name,
                                            description: service.description ?? undefined,
                                            priceMinCents: service.priceMinCents,
                                            priceMaxCents: service.priceMaxCents,
                                            active: !service.active,
                                        })
                                            .then(() => toast.success(service.active ? "Service deactivated" : "Service activated"))
                                            .catch(() => toast.error("Update failed.")), children: service.active ? "Deactivate" : "Activate" })] })] }, service._id))) })) }), _jsx(Dialog, { open: open, onOpenChange: setOpen, children: _jsxs(DialogContent, { className: "sm:max-w-md", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: editing ? "Edit service" : "Add service" }) }), _jsxs("form", { onSubmit: handleSave, className: "flex flex-col gap-3", children: [_jsxs("div", { className: "flex flex-col gap-1", children: [_jsx(Label, { htmlFor: "service-name", children: "Name" }), _jsx(Input, { id: "service-name", value: form.name, onChange: (e) => setForm({ ...form, name: e.target.value }), autoFocus: true })] }), _jsxs("div", { className: "flex flex-col gap-1", children: [_jsx(Label, { htmlFor: "service-desc", children: "Description" }), _jsx(Input, { id: "service-desc", value: form.description, onChange: (e) => setForm({ ...form, description: e.target.value }) })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { className: "flex flex-col gap-1", children: [_jsx(Label, { htmlFor: "service-min", children: "Price from (KSh)" }), _jsx(Input, { id: "service-min", inputMode: "decimal", value: form.priceMin, onChange: (e) => setForm({ ...form, priceMin: e.target.value }) })] }), _jsxs("div", { className: "flex flex-col gap-1", children: [_jsx(Label, { htmlFor: "service-max", children: "Price to (KSh)" }), _jsx(Input, { id: "service-max", inputMode: "decimal", value: form.priceMax, onChange: (e) => setForm({ ...form, priceMax: e.target.value }) })] })] }), _jsx(DialogFooter, { children: _jsxs(Button, { type: "submit", disabled: saving, children: [saving && _jsx(Loader2, { className: "animate-spin" }), editing ? "Save changes" : "Add service"] }) })] })] }) })] }));
}
