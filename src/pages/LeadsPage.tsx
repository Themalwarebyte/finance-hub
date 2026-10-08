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
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  SALES_STAGES,
  followUpState,
  type PipelineMetrics,
} from "@/lib/business";
import { formatMoney, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

type Lead = {
  _id: string;
  businessName: string;
  contactPerson: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  category: string;
  source: string;
  serviceRequired: string;
  estimatedValueCents: number;
  probability?: number | null;
  stage: string;
  location?: string | null;
  notes?: string | null;
  isClient: boolean;
  lastContactDate?: number | null;
  nextFollowUp?: number | null;
  createdBy: string;
  createdAt: number;
};

const FOLLOW_UP_BADGE: Record<string, string> = {
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
    return <div className="text-muted-foreground text-sm">Loading pipeline…</div>;
  }

  const rows = leads as Lead[];
  const openLeads = rows.filter(
    (row) => !row.isClient && row.stage !== "Won" && row.stage !== "Lost",
  );
  const followUpCounts = {
    overdue: openLeads.filter((row) => followUpState(row.nextFollowUp, Date.now()) === "overdue").length,
    today: openLeads.filter((row) => followUpState(row.nextFollowUp, Date.now()) === "today").length,
  };
  const weekAlert =
    followUpCounts.overdue + followUpCounts.today > 0
      ? `${followUpCounts.overdue + followUpCounts.today} lead(s) require follow-up this week (${followUpCounts.overdue} overdue, ${followUpCounts.today} today).`
      : null;

  const moveStage = (lead: Lead, direction: -1 | 1) => {
    const index = SALES_STAGES.indexOf(lead.stage as (typeof SALES_STAGES)[number]);
    const next = SALES_STAGES[Math.min(SALES_STAGES.length - 1, Math.max(0, (index === -1 ? 0 : index) + direction))];
    void setStage({ leadId: lead._id as Id<"clients">, stage: next })
      .then(() => toast.success(`${lead.businessName} → ${next}`))
      .catch(() => toast.error("Stage update failed."));
  };

  const handleCreate = async (event: React.FormEvent) => {
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
    } catch {
      toast.error("Couldn't add the lead.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <BizPageHeader
        title="Lead Pipeline"
        subtitle="CRM pipeline: New Lead through Won/Lost. Drag-free by design — use the stage arrows on each card."
      >
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" /> New lead
        </Button>
      </BizPageHeader>

      {weekAlert && (
        <div className="border-amber-500/40 bg-amber-500/5 flex items-center gap-2 rounded-xl border p-3 text-sm">
          <span className="text-amber-600 font-semibold">Follow-ups:</span>
          {weekAlert}
        </div>
      )}

      {/* ------------------------------------------------- Analytics ------ */}
      <section className="surface-card rounded-xl border p-4">
        <h2 className="text-sm font-semibold">Pipeline analytics</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Total leads" value={(metrics as PipelineMetrics).totalLeads} />
          <Metric label="Active opportunities" value={(metrics as PipelineMetrics).activeOpportunities} />
          <Metric label="Pipeline value" value={formatMoney((metrics as PipelineMetrics).pipelineValueCents)} />
          <Metric
            label="Weighted pipeline"
            value={formatMoney((metrics as PipelineMetrics).weightedPipelineValueCents)}
            hint="Value × win probability"
          />
          <Metric
            label="Conversion rate"
            value={
              (metrics as PipelineMetrics).conversionRatePct === null
                ? "—"
                : `${(metrics as PipelineMetrics).conversionRatePct}%`
            }
            hint="Won ÷ (won + lost)"
          />
          <Metric
            label="Average deal size"
            value={
              (metrics as PipelineMetrics).averageDealSizeCents === null
                ? "—"
                : formatMoney((metrics as PipelineMetrics).averageDealSizeCents as number)
            }
          />
          <Metric
            label="Average sales cycle"
            value={
              (metrics as PipelineMetrics).averageSalesCycleMs === null
                ? "—"
                : `${Math.round(((metrics as PipelineMetrics).averageSalesCycleMs as number) / 86_400_000)} days`
            }
          />
          <Metric
            label="Won revenue this month"
            value={formatMoney((metrics as PipelineMetrics).wonRevenueThisMonthCents)}
          />
          <Metric label="Won (all time)" value={(metrics as PipelineMetrics).wonCount} />
          <Metric label="Lost opportunities" value={(metrics as PipelineMetrics).lostCount} />
        </div>
      </section>

      {/* ------------------------------------------------- Board ---------- */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3" style={{ minWidth: "max-content" }}>
          {SALES_STAGES.map((stage) => {
            const stageLeads = rows.filter(
              (row) => !row.isClient && row.stage === stage,
            );
            return (
              <div key={stage} className="bg-muted/30 w-64 shrink-0 rounded-xl border p-2">
                <div className="flex items-center justify-between px-1 py-1.5">
                  <span className="text-xs font-semibold">{stage}</span>
                  <Badge variant="secondary">{stageLeads.length}</Badge>
                </div>
                <div className="flex flex-col gap-2">
                  {stageLeads.map((lead) => {
                    const fu = followUpState(lead.nextFollowUp, Date.now());
                    return (
                      <div key={lead._id} className="surface-card rounded-lg border p-2.5 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{lead.businessName}</p>
                            <p className="text-muted-foreground truncate">
                              {lead.contactPerson} · {lead.contactEmail ?? lead.contactPhone ?? "no contact"}
                            </p>
                          </div>
                          <span className="shrink-0 font-semibold tabular-nums">
                            {formatMoney(lead.estimatedValueCents, { cents: false })}
                          </span>
                        </div>
                        <div className="text-muted-foreground mt-1 flex flex-wrap gap-1">
                          <span>{lead.source}</span>
                          <span>·</span>
                          <span>{lead.serviceRequired}</span>
                        </div>
                        {fu && (
                          <span className={cn("mt-1.5 inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium", FOLLOW_UP_BADGE[fu])}>
                            {fu === "overdue"
                              ? "Follow-up overdue"
                              : fu === "today"
                                ? "Follow-up today"
                                : `Follow-up ${formatShortDate(lead.nextFollowUp as number)}`}
                          </span>
                        )}
                        {lead.notes && (
                          <p className="text-muted-foreground mt-1.5 line-clamp-2 italic">{lead.notes}</p>
                        )}
                        <div className="mt-2 flex items-center gap-1">
                          {stage !== "New Lead" && (
                            <Button size="sm" variant="ghost" className="h-7 px-2" aria-label={`Move ${lead.businessName} back`} onClick={() => moveStage(lead, -1)}>
                              <ArrowLeft className="size-3.5" />
                            </Button>
                          )}
                          {stage !== "Lost" && stage !== "Won" && (
                            <Button size="sm" variant="ghost" className="h-7 px-2" aria-label={`Move ${lead.businessName} forward`} onClick={() => moveStage(lead, 1)}>
                              <ArrowRight className="size-3.5" />
                            </Button>
                          )}
                          {stage === "Won" && (
                            <Button
                              size="sm"
                              className="h-7"
                              onClick={() =>
                                void convert({
                                  leadId: lead._id as Id<"clients">,
                                  contract: {
                                    title: `${lead.businessName} — ${lead.serviceRequired}`,
                                    startDate: Date.now(),
                                    billingFrequency: "monthly",
                                    billingAmountCents: lead.estimatedValueCents,
                                    isRetainer: true,
                                  },
                                })
                                  .then(() => toast.success(`${lead.businessName} converted to client with contract.`))
                                  .catch(() => toast.error("Conversion failed (owner only)."))
                              }
                            >
                              Convert
                            </Button>
                          )}
                          {stage !== "Lost" && stage !== "Won" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive ml-auto h-7 px-2"
                              onClick={() =>
                                void recordFollowUp({
                                  leadId: lead._id as Id<"clients">,
                                  nextFollowUp: Date.now() + 7 * 86_400_000,
                                })
                                  .then(() => toast.success("Follow-up logged, next set +7 days"))
                                  .catch(() => toast.error("Couldn't log follow-up."))
                              }
                            >
                              Follow-up done
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {stageLeads.length === 0 && (
                    <p className="text-muted-foreground px-1 py-3 text-center text-[11px]">Empty</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------- New lead ------- */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3">
            <Field label="Business name *">
              <Input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} autoFocus />
            </Field>
            <Field label="Contact person *">
              <Input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Industry / category">
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Retail, Hospitality…" />
            </Field>
            <Field label="Location">
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Nairobi…" />
            </Field>
            <Field label="Lead source">
              <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Referral, cold outreach…" />
            </Field>
            <Field label="Service interest">
              <Input value={form.serviceRequired} onChange={(e) => setForm({ ...form, serviceRequired: e.target.value })} placeholder="Website Development…" />
            </Field>
            <Field label="Estimated value (KSh) *">
              <Input inputMode="decimal" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="0" />
            </Field>
            <Field label="Probability % (optional)">
              <Input inputMode="numeric" value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })} placeholder="Stage default" />
            </Field>
            <div className="col-span-2 flex flex-col gap-1">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Context, decision makers, timing…" />
            </div>
            <DialogFooter className="col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Adding…" : "Add lead"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="border-border/60 rounded-lg border p-2.5">
      <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-muted-foreground mt-0.5 text-[10px]">{hint}</p>}
    </div>
  );
}
