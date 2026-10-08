import { BizPageHeader, useEnsureGHub } from "@/components/finance/BizParts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
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
    return <div className="text-muted-foreground text-sm">Loading clients and leads…</div>;
  }

  const rows = [...leads].sort((a, b) => (b.nextFollowUp ?? 0) - (a.nextFollowUp ?? 0));
  const pipeline = pipelineValue(
    rows.map((row) => ({ stage: row.stage, estimatedValueCents: row.estimatedValueCents })),
  );

  const handleSubmit = async (event: React.FormEvent) => {
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
    } catch {
      toast.error("Couldn't add the lead.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <BizPageHeader
        title="Clients & Leads"
        subtitle={`Pipeline value ${formatMoney(pipeline)} · ${rows.length} records`}
      >
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" /> New lead
        </Button>
      </BizPageHeader>

      <div className="surface-card overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border/70 text-muted-foreground border-b text-left text-xs uppercase tracking-wider">
              <th className="px-4 py-2.5">Business</th>
              <th className="px-4 py-2.5">Contact</th>
              <th className="px-4 py-2.5">Value</th>
              <th className="px-4 py-2.5">Stage</th>
              <th className="px-4 py-2.5">Follow-up</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row._id} className="border-border/60 border-b last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium">{row.businessName}</div>
                  <div className="text-muted-foreground text-xs">{row.serviceRequired}</div>
                </td>
                <td className="px-4 py-3">
                  <div>{row.contactPerson}</div>
                  <div className="text-muted-foreground text-xs">
                    {row.contactEmail ?? row.contactPhone ?? "—"}
                  </div>
                </td>
                <td className="px-4 py-3 tabular-nums">{formatMoney(row.estimatedValueCents)}</td>
                <td className="px-4 py-3">
                  {row.isClient ? (
                    <Badge variant="secondary">
                      <Repeat className="size-3" /> Client
                    </Badge>
                  ) : (
                    <Select
                      value={row.stage}
                      onValueChange={(next) => {
                        void setLeadStage({ leadId: row._id as Id<"clients">, stage: next })
                          .then(() => toast.success(`Stage → ${next}`))
                          .catch(() => toast.error("Stage update failed."));
                      }}
                    >
                      <SelectTrigger className="h-8 w-36 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SALES_STAGES.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {row.isClient
                    ? "—"
                    : row.nextFollowUp
                      ? formatShortDate(row.nextFollowUp)
                      : "Not scheduled"}
                  {row.isClient && row.stage === "Won" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary"
                      onClick={() => {
                        void convert({
                          leadId: row._id as Id<"clients">,
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
                      }}
                    >
                      Convert
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="text-muted-foreground px-4 py-10 text-center text-sm">
                  No leads yet — add your first opportunity.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="lead-name">Business name</Label>
              <Input id="lead-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="lead-contact">Contact person</Label>
              <Input id="lead-contact" value={contact} onChange={(e) => setContact(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="lead-value">Est. value (KSh)</Label>
                <Input
                  id="lead-value"
                  inputMode="decimal"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Stage</Label>
                <Select value={newLeadStage} onValueChange={setNewLeadStage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SALES_STAGES.filter((s) => s !== "Won" && s !== "Lost").map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="animate-spin" />} Add lead
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
