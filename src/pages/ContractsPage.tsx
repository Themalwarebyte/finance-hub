import { BizPageHeader, useEnsureGHub } from "@/components/finance/BizParts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatMoney, formatDate } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type QuoteItem = {
  description: string;
  qty: number;
  unitPriceCents: number;
};

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
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [saving, setSaving] = useState(false);

  if (proposals === undefined || contracts === undefined || services === undefined || clients === undefined) {
    return <div className="text-muted-foreground text-sm">Loading proposals and contracts…</div>;
  }

  const serviceRows = services as { _id: string; name: string; description?: string | null; priceMinCents: number; priceMaxCents: number; active: boolean }[];
  const clientRows = (clients as { _id: string; isClient: boolean; businessName: string }[]).filter(
    (row) => row.isClient,
  );
  const totalCents = items.reduce((s, item) => s + item.qty * item.unitPriceCents, 0);

  const pickService = (id: string) => {
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

  const handleCreateProposal = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!clientId || !title.trim() || items.length === 0) {
      toast.error("Pick a client, add a title and at least one item.");
      return;
    }
    setSaving(true);
    try {
      await createProposal({
        clientId: clientId as Id<"clients">,
        title: title.trim(),
        items,
      });
      toast.success("Proposal created as a draft");
      setProposalOpen(false);
      setTitle("");
      setItems([]);
    } catch {
      toast.error("Couldn't create the proposal.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <BizPageHeader
        title="Proposals & Contracts"
        subtitle="Quotations become contracts; retainers feed monthly recurring revenue."
      >
        <Button onClick={() => setProposalOpen(true)}>
          <Plus className="size-4" /> New proposal
        </Button>
      </BizPageHeader>

      <section className="surface-card rounded-xl border p-4">
        <h2 className="text-sm font-semibold">Quotations ({proposals.length})</h2>
        {proposals.length === 0 ? (
          <p className="text-muted-foreground mt-2 text-sm">
            No quotations yet. Create one from a converted client using the services catalogue.
          </p>
        ) : (
          <ul className="mt-3 divide-y">
            {proposals.map((proposal) => {
              const clientName =
                clientRows.find((c) => c._id === proposal.clientId)?.businessName ?? "—";
              return (
                <li key={proposal._id} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">{proposal.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {clientName} · {proposal.items.length} items
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums">
                      {formatMoney(proposal.totalCents)}
                    </span>
                    <Badge variant={proposal.status === "accepted" ? "default" : "secondary"}>
                      {proposal.status}
                    </Badge>
                    {proposal.status === "draft" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void setStatus({
                            proposalId: proposal._id as Id<"proposals">,
                            status: "sent",
                          })
                            .then(() => toast.success("Marked as sent"))
                            .catch(() => toast.error("Update failed"))
                        }
                      >
                        Send
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="surface-card rounded-xl border p-4">
        <h2 className="text-sm font-semibold">Contracts ({contracts.length})</h2>
        {contracts.length === 0 ? (
          <p className="text-muted-foreground mt-2 text-sm">
            No contracts yet. Convert a Won lead to create one automatically.
          </p>
        ) : (
          <ul className="mt-3 divide-y">
            {contracts.map((contract) => (
              <li key={contract._id} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">
                    {contract.title}{" "}
                    {contract.isRetainer && (
                      <Badge variant="outline" className="ml-1">
                        Retainer
                      </Badge>
                    )}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Starts {formatDate(contract.startDate)} · {contract.billingFrequency} ·{" "}
                    {contract.status}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold tabular-nums">
                    {formatMoney(contract.billingAmountCents)}
                  </span>
                  {contract.status === "active" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void setContractStatus({
                          contractId: contract._id as Id<"contracts">,
                          status: "ended",
                        })
                          .then(() => toast.success("Contract ended"))
                          .catch(() => toast.error("Update failed"))
                      }
                    >
                      End
                    </Button>
                  ) : (
                    <span className="text-muted-foreground text-xs">{contract.status}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ------------------------------------------- New proposal dialog -- */}
      <Dialog open={proposalOpen} onOpenChange={setProposalOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New proposal</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateProposal} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label>Client</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger><SelectValue placeholder="Choose client" /></SelectTrigger>
                  <SelectContent>
                    {clientRows.map((client) => (
                      <SelectItem key={client._id} value={client._id}>
                        {client.businessName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="proposal-title">Title</Label>
                <Input
                  id="proposal-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Website + maintenance package"
                />
              </div>
            </div>

            <div className="border-border/60 rounded-lg border p-3">
              <p className="text-xs font-semibold">Add items (from the services catalogue)</p>
              <div className="mt-2 flex flex-col gap-2">
                <Select value={serviceId} onValueChange={pickService}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select a service to prefill" /></SelectTrigger>
                  <SelectContent>
                    {serviceRows.filter((s) => s.active).map((service) => (
                      <SelectItem key={service._id} value={service._id}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Item description"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    inputMode="decimal"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    placeholder="Unit price (KSh)"
                  />
                  <Input
                    inputMode="numeric"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    placeholder="Qty"
                  />
                </div>
                <Button type="button" size="sm" variant="outline" onClick={addItem}>
                  <Plus className="size-4" /> Add item
                </Button>
              </div>
              {items.length > 0 && (
                <ul className="mt-3 divide-y">
                  {items.map((item, index) => (
                    <li key={`${item.description}-${index}`} className="flex items-center justify-between py-1.5 text-xs">
                      <span className="truncate">
                        {item.description} × {item.qty}
                      </span>
                      <span className="flex items-center gap-2 tabular-nums">
                        {formatMoney(item.qty * item.unitPriceCents)}
                        <button
                          type="button"
                          className="text-destructive"
                          onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
                        >
                          remove
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {items.length > 0 && (
                <p className="mt-2 text-right text-sm font-semibold tabular-nums">
                  Total: {formatMoney(totalCents)}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="animate-spin" />}
                Create proposal
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
