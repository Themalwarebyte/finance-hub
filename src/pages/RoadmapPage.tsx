import { BizPageHeader, BizStatCard, useEnsureGHub } from "@/components/finance/BizParts";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatMoney } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";

export default function RoadmapPage() {
  useEnsureGHub();
  const seed = useMutation(api.business.seedMilestones);
  const roadmap = useQuery(api.business.roadmapProgress, {});
  const updateTarget = useMutation(api.business.updateMilestoneTarget);

  useEffect(() => {
    void seed({}).catch(() => undefined);
  }, [seed]);

  if (roadmap === undefined) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" /> Loading roadmap…
      </div>
    );
  }
  if (roadmap === null) {
    return <div className="surface-card rounded-xl p-8 text-sm">Roadmap unavailable.</div>;
  }

  const annual = roadmap.find((row) => row.kind === "revenue" && row.quarter === null);
  const quarters = roadmap
    .filter((row) => row.kind === "revenue" && row.quarter !== null)
    .sort((a, b) => (a.quarter ?? 0) - (b.quarter ?? 0));
  const others = roadmap.filter(
    (row) => row.kind !== "revenue" || row.quarter === null,
  );

  const handleRetarget = async (
    milestoneId: string,
    current: number,
    event: React.FocusEvent<HTMLInputElement>,
  ) => {
    const value = Math.round(Number.parseFloat(event.target.value || "0") * 100);
    if (!Number.isFinite(value) || value === current) return;
    try {
      await updateTarget({ milestoneId: milestoneId as Id<"milestones">, targetCents: value });
      toast.success("Target updated");
    } catch {
      toast.error("Only the owner can edit targets.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <BizPageHeader
        title="Business Roadmap — Year 1"
        subtitle="Oct 2026 → Sep 2027. Targets are editable goals; actuals come only from recorded data."
      />

      <p className="text-muted-foreground text-xs">
        Projected outcomes assume a straight-line run-rate from realised revenue to date — a
        documented Phase-1 assumption, not a forecast model.
      </p>

      {annual && (
        <div className="grid gap-3 sm:grid-cols-3">
          <BizStatCard label="Annual revenue target" value={formatMoney(annual.targetCents)} hint="Target" />
          <BizStatCard label="Actual to date" value={formatMoney(annual.actualCents)} hint={`${Math.round(annual.progressPct)}% of target`} />
          <BizStatCard
            label="Projected year-end"
            value={formatMoney(annual.projectedEndCents)}
            hint={`Pace ${Math.round(annual.progressPct)}% vs expected ${Math.round(annual.expectedPct)}%`}
          />
        </div>
      )}

      <section className="surface-card rounded-xl border p-4">
        <h2 className="text-sm font-semibold">Quarterly revenue targets</h2>
        <ul className="mt-3 divide-y">
          {quarters.map((row) => (
            <li key={row._id} className="py-2.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium">{row.label}</span>
                <span className="tabular-nums">
                  {formatMoney(row.actualCents)} / {formatMoney(row.targetCents)}
                </span>
              </div>
              <div className="bg-muted mt-1.5 h-2 overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full transition-all"
                  style={{ width: `${Math.round(row.progressPct)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="surface-card rounded-xl border p-4">
        <h2 className="text-sm font-semibold">Other Year-1 milestones</h2>
        <ul className="mt-3 divide-y">
          {others.map((row) => (
            <li key={row._id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
              <div>
                <p className="font-medium">{row.label}</p>
                <p className="text-muted-foreground text-xs">
                  {Math.round(row.progressPct)}% · projected {formatMoney(row.projectedEndCents)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs tabular-nums">
                  actual {formatMoney(row.actualCents)}
                </span>
                <input
                  type="number"
                  className="border-border w-24 rounded-md border px-2 py-1 text-right text-xs tabular-nums"
                  defaultValue={(row.targetCents / 100).toFixed(0)}
                  onBlur={(event) => void handleRetarget(row._id, row.targetCents, event)}
                  aria-label={`${row.label} target`}
                />
              </div>
            </li>
          ))}
          {others.length === 0 && (
            <li className="text-muted-foreground py-6 text-center text-sm">
              Roadmap seeds appear the first time the owner opens this page.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
