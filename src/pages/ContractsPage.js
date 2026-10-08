import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BizPageHeader, useEnsureGHub } from "@/components/finance/BizParts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import { formatMoney, formatDate } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
export default function ContractsPage() {
    useEnsureGHub();
    const proposals = useQuery(api.businessSales.listProposals, {});
    const contracts = useQuery(api.businessSales.listContracts, {});
    const services = useQuery(api.services.listServices, {});
    const clients = useQuery(api.businessSales.listLeads, {});
    const setStatus = useMutation(api.businessSales.setProposalStatus);
    const setContractStatus = useMutation(api.businessSales.setContractStatus);
    const createProposal = useMutation(api.businessSales.createProposal);
    const [proposalOpen, setProposalOpen] = useState(false);
    const [clientId, setClientId] = useState("");
    const [title, setTitle] = useState("");
    const [serviceId, setServiceId] = useState("");
    const [description, setDescription] = useState("");
    const [unitPrice, setUnitPrice] = useState("");
    const [qty, setQty] = useState("1");
    const [items, setItems] = useState([]);
    const [saving, setSaving] = useState(false);
    if (proposals === undefined || contracts === undefined || services === undefined || clients === undefined) {
        return _jsx("div", { className: "text-muted-foreground text-sm", children: "Loading proposals and contracts\u2026" });
    }
    const serviceRows = services;
    const clientRows = clients.filter((row) => row.isClient);
    const totalCents = items.reduce((s, item) => s + item.qty * item.unitPriceCents, 0);
    const pickService = (id) => {
        setServiceId(id);
        const service = serviceRows.find((s) => s._id === id);
        if (service) {
            setDescription(service.description ?? service.name);
            // Prefill the price range midpoint; the user can adjust before adding.
            setUnitPrice(((service.priceMinCents + service.priceMaxCents) / 200).toFixed(0));
        }
    };
    const addItem = () => {
        const price = Math.round(Number.parseFloat(unitPrice || "0") * 100);
        const quantity = Number.parseInt(qty || "1", 10);
        if (!description.trim() || !Number.isFinite(price) || price <= 0 || !Number.isFinite(quantity) || quantity <= 0) {
            toast.error("Provide a description, positive quantity and price.");
            return;
        }
        setItems((current) => [
            ...current,
            { description: description.trim(), qty: quantity, unitPriceCents: price },
        ]);
        setDescription("");
        setUnitPrice("");
        setQty("1");
        setServiceId("");
    };
    const handleCreateProposal = async (event) => {
        event.preventDefault();
        if (!clientId || !title.trim() || items.length === 0) {
            toast.error("Pick a client, add a title and at least one item.");
            return;
        }
        setSaving(true);
        try {
            await createProposal({
                clientId: clientId,
                title: title.trim(),
                items,
            });
            toast.success("Proposal created as a draft");
            setProposalOpen(false);
            setTitle("");
            setItems([]);
        }
        catch {
            toast.error("Couldn't create the proposal.");
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx(BizPageHeader, { title: "Proposals & Contracts", subtitle: "Quotations become contracts; retainers feed monthly recurring revenue.", children: _jsxs(Button, { onClick: () => setProposalOpen(true), children: [_jsx(Plus, { className: "size-4" }), " New proposal"] }) }), _jsxs("section", { className: "surface-card rounded-xl border p-4", children: [_jsxs("h2", { className: "text-sm font-semibold", children: ["Quotations (", proposals.length, ")"] }), proposals.length === 0 ? (_jsx("p", { className: "text-muted-foreground mt-2 text-sm", children: "No quotations yet. Create one from a converted client using the services catalogue." })) : (_jsx("ul", { className: "mt-3 divide-y", children: proposals.map((proposal) => {
                            const clientName = clientRows.find((c) => c._id === proposal.clientId)?.businessName ?? "—";
                            return (_jsxs("li", { className: "flex items-center justify-between gap-3 py-2.5", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium", children: proposal.title }), _jsxs("p", { className: "text-muted-foreground text-xs", children: [clientName, " \u00B7 ", proposal.items.length, " items"] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-sm font-semibold tabular-nums", children: formatMoney(proposal.totalCents) }), _jsx(Badge, { variant: proposal.status === "accepted" ? "default" : "secondary", children: proposal.status }), proposal.status === "draft" && (_jsx(Button, { size: "sm", variant: "outline", onClick: () => void setStatus({
                                                    proposalId: proposal._id,
                                                    status: "sent",
                                                })
                                                    .then(() => toast.success("Marked as sent"))
                                                    .catch(() => toast.error("Update failed")), children: "Send" }))] })] }, proposal._id));
                        }) }))] }), _jsxs("section", { className: "surface-card rounded-xl border p-4", children: [_jsxs("h2", { className: "text-sm font-semibold", children: ["Contracts (", contracts.length, ")"] }), contracts.length === 0 ? (_jsx("p", { className: "text-muted-foreground mt-2 text-sm", children: "No contracts yet. Convert a Won lead to create one automatically." })) : (_jsx("ul", { className: "mt-3 divide-y", children: contracts.map((contract) => (_jsxs("li", { className: "flex items-center justify-between gap-3 py-2.5", children: [_jsxs("div", { children: [_jsxs("p", { className: "text-sm font-medium", children: [contract.title, " ", contract.isRetainer && (_jsx(Badge, { variant: "outline", className: "ml-1", children: "Retainer" }))] }), _jsxs("p", { className: "text-muted-foreground text-xs", children: ["Starts ", formatDate(contract.startDate), " \u00B7 ", contract.billingFrequency, " \u00B7", " ", contract.status] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-sm font-semibold tabular-nums", children: formatMoney(contract.billingAmountCents) }), contract.status === "active" ? (_jsx(Button, { size: "sm", variant: "outline", onClick: () => void setContractStatus({
                                                contractId: contract._id,
                                                status: "ended",
                                            })
                                                .then(() => toast.success("Contract ended"))
                                                .catch(() => toast.error("Update failed")), children: "End" })) : (_jsx("span", { className: "text-muted-foreground text-xs", children: contract.status }))] })] }, contract._id))) }))] }), _jsx(Dialog, { open: proposalOpen, onOpenChange: setProposalOpen, children: _jsxs(DialogContent, { className: "max-h-[85vh] overflow-y-auto sm:max-w-lg", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: "New proposal" }) }), _jsxs("form", { onSubmit: handleCreateProposal, className: "flex flex-col gap-3", children: [_jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { className: "flex flex-col gap-1", children: [_jsx(Label, { children: "Client" }), _jsxs(Select, { value: clientId, onValueChange: setClientId, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Choose client" }) }), _jsx(SelectContent, { children: clientRows.map((client) => (_jsx(SelectItem, { value: client._id, children: client.businessName }, client._id))) })] })] }), _jsxs("div", { className: "flex flex-col gap-1", children: [_jsx(Label, { htmlFor: "proposal-title", children: "Title" }), _jsx(Input, { id: "proposal-title", value: title, onChange: (e) => setTitle(e.target.value), placeholder: "Website + maintenance package" })] })] }), _jsxs("div", { className: "border-border/60 rounded-lg border p-3", children: [_jsx("p", { className: "text-xs font-semibold", children: "Add items (from the services catalogue)" }), _jsxs("div", { className: "mt-2 flex flex-col gap-2", children: [_jsxs(Select, { value: serviceId, onValueChange: pickService, children: [_jsx(SelectTrigger, { className: "h-9", children: _jsx(SelectValue, { placeholder: "Select a service to prefill" }) }), _jsx(SelectContent, { children: serviceRows.filter((s) => s.active).map((service) => (_jsx(SelectItem, { value: service._id, children: service.name }, service._id))) })] }), _jsx(Input, { value: description, onChange: (e) => setDescription(e.target.value), placeholder: "Item description" }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsx(Input, { inputMode: "decimal", value: unitPrice, onChange: (e) => setUnitPrice(e.target.value), placeholder: "Unit price (KSh)" }), _jsx(Input, { inputMode: "numeric", value: qty, onChange: (e) => setQty(e.target.value), placeholder: "Qty" })] }), _jsxs(Button, { type: "button", size: "sm", variant: "outline", onClick: addItem, children: [_jsx(Plus, { className: "size-4" }), " Add item"] })] }), items.length > 0 && (_jsx("ul", { className: "mt-3 divide-y", children: items.map((item, index) => (_jsxs("li", { className: "flex items-center justify-between py-1.5 text-xs", children: [_jsxs("span", { className: "truncate", children: [item.description, " \u00D7 ", item.qty] }), _jsxs("span", { className: "flex items-center gap-2 tabular-nums", children: [formatMoney(item.qty * item.unitPriceCents), _jsx("button", { type: "button", className: "text-destructive", onClick: () => setItems((current) => current.filter((_, i) => i !== index)), children: "remove" })] })] }, `${item.description}-${index}`))) })), items.length > 0 && (_jsxs("p", { className: "mt-2 text-right text-sm font-semibold tabular-nums", children: ["Total: ", formatMoney(totalCents)] }))] }), _jsx(DialogFooter, { children: _jsxs(Button, { type: "submit", disabled: saving, children: [saving && _jsx(Loader2, { className: "animate-spin" }), "Create proposal"] }) })] })] }) })] }));
}
