import { BizPageHeader, BizStatCard, useEnsureGHub } from "@/components/finance/BizParts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { INITIAL_TARGETS } from "@/lib/business";
import { milestoneProgress } from "@/lib/forecast";
import { formatMoney } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const ACTIVITY_LABELS: Record<string, string> = {
  businesses_researched: "Businesses researched",
  new_contacts: "New contacts made",
  follow_ups_completed: "Follow-ups completed",
  discovery_meetings: "Discovery meetings",
  proposals_sent: "Proposals sent",
  contracts_won: "Contracts won",
};

type ActivityRow = {
  kind: string;
  count: number;
  target: number;
  isDefaultTarget: boolean;
  pct: number;
  status: string;
};

type ObjectiveRow = {
  label: string;
  targetCents: number;
  actualCents: number;
};

function statusTone(status: string): string {
  if (status === "ahead") return "text-positive";
  if (status === "behind") return "text-destructive";
  return "text-amber-600";
}

export default function CommandCenterPage() {
  useEnsureGHub();
  const overview = useQuery(api.business.overview, {});
  const cc = useQuery(api.ceo.commandCenter, {});
  const roadmap = useQuery(api.business.roadmapProgress, {});
  const activity = useQuery(api.ceo.activitySummary, {});

  const logActivity = useMutation(api.ceo.logActivity);
  const setTarget = useMutation(api.ceo.setActivityTarget);
  const [targetDraft, setTargetDraft] = useState<Record<string, string>>({});

  if (
    overview === undefined ||
    cc === undefined ||
    roadmap === undefined ||
    activity === undefined
  ) {
    return <div className="text-muted-foreground text-sm">Loading command center…</div>;
  }

  // --- Section B: Year-1 mission control. Targets are clearly labelled ---
  // editable values (from the seeded roadmap); actuals come from records.
  const actualByKind = new Map<string, number>();
  for (const row of roadmap) {
    actualByKind.set(row.kind, row.actualCents);
  }
  const monthlyAvgTargetCents = Math.round(INITIAL_TARGETS.annualRevenueCents / 12);
  const objectives: ObjectiveRow[] = [
    {
      label: "Annual revenue (target KSh 120,000)",
      targetCents: INITIAL_TARGETS.annualRevenueCents,
      actualCents: actualByKind.get("revenue") ?? cc.revenueYtdCents,
    },
    {
      label: "Monthly average (target KSh 10,000)",
      targetCents: monthlyAvgTargetCents,
      actualCents: cc.revenueThisMonthCents,
    },
    {
      label: "Recurring revenue (target KSh 6,000/month)",
      targetCents: INITIAL_TARGETS.monthlyRecurringRevenueCents,
      actualCents: overview.mrrCents,
    },
    {
      label: "Year-end net worth (target KSh 15,000)",
      targetCents: INITIAL_TARGETS.yearEndNetWorthCents,
      actualCents: actualByKind.get("net_worth") ?? 0,
    },
  ];

  const activityRows = activity as ActivityRow[];
  const behindActivities = activityRows.filter((r) => r.status === "behind").length;

  return (
    <div className="flex flex-col gap-6">
      <BizPageHeader
        title="GHub CEO Command Center"
        subtitle="Daily operating dashboard. Actuals come from recorded business data; targets are editable goals, clearly separated from performance."
      />

      {/* ------------------------------------------------ Section A ------- */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Business performance (actuals)</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <BizStatCard
            label="Revenue this month"
            value={formatMoney(cc.revenueThisMonthCents)}
            hint="Non-draft invoices issued this month"
          />
          <BizStatCard
            label="Revenue year-to-date"
            value={formatMoney(cc.revenueYtdCents)}
            hint="All issued invoices"
          />
          <BizStatCard
            label="Cash collected"
            value={formatMoney(cc.cashCollectedCents)}
            hint="Payments received against invoices"
          />
          <BizStatCard
            label="Outstanding receivables"
            value={formatMoney(cc.receivablesCents)}
            hint="Unpaid issued invoices"
          />
          <BizStatCard
            label="Operating expenses"
            value={formatMoney(overview.operatingExpenses)}
            hint="YTD, excludes owner movements"
          />
          <BizStatCard
            label="Net operating profit"
            value={formatMoney(overview.netOperatingProfit)}
            tone={overview.netOperatingProfit >= 0 ? "positive" : "negative"}
          />
          <BizStatCard label="Active clients" value={cc.activeClients} />
          <BizStatCard label="Active contracts" value={cc.activeContracts} />
          <BizStatCard
            label="Monthly recurring revenue"
            value={formatMoney(overview.mrrCents)}
            hint={`${overview.activeRetainerClients} active retainer client(s)`}
          />
          <BizStatCard
            label="Open leads"
            value={cc.openLeads}
            hint="Opportunities still in the pipeline"
          />
        </div>
      </section>

      {/* ------------------------------------------------ Section B ------- */}
      <section className="surface-card rounded-xl border p-4">
        <h2 className="text-sm font-semibold">
          Year 1 Mission Control — targets (editable vision, not actuals)
        </h2>
        <p className="text-muted-foreground mt-1 text-xs">
          Targets are the seeded Year-1 objectives; edit them on the{" "}
          <a href="/ghub/roadmap" className="underline">
            Business roadmap
          </a>{" "}
          page. Status uses the shared milestone thresholds (ahead &gt;110% of expected pace,
          on track 90–110%, behind &lt;90%), compared against elapsed Year-1 time.
        </p>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-left text-xs uppercase">
              <th className="py-2 pr-4">Objective</th>
              <th className="py-2 pr-4">Target</th>
              <th className="py-2 pr-4">Actual</th>
              <th className="py-2 pr-4">Gap</th>
              <th className="py-2 pr-4">Complete</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {objectives.map((objective) => {
              const gap = objective.actualCents - objective.targetCents;
              const pct =
                objective.targetCents > 0
                  ? Math.min(100, (objective.actualCents / objective.targetCents) * 100)
                  : 0;
              const start = Date.UTC(2026, 9, 1);
              const end = Date.UTC(2027, 8, 30, 23, 59, 59, 999);
              const now = Date.now();
              const progress = milestoneProgress(
                objective.actualCents,
                objective.targetCents,
                Math.max(0, now - start),
                end - start,
                start,
              );
              const beforeRoadmap = now < start;
              const status = beforeRoadmap
                ? "on_track"
                : progress.status.replace("_", " ");
              return (
                <tr key={objective.label} className="border-border/60 border-b last:border-0">
                  <td className="py-2.5 pr-4 font-medium">{objective.label}</td>
                  <td className="py-2.5 pr-4 tabular-nums">{formatMoney(objective.targetCents)}</td>
                  <td className="py-2.5 pr-4 tabular-nums">{formatMoney(objective.actualCents)}</td>
                  <td className={`py-2.5 pr-4 tabular-nums ${gap >= 0 ? "text-positive" : "text-destructive"}`}>
                    {gap >= 0 ? "+" : ""}
                    {formatMoney(gap)}
                  </td>
                  <td className="py-2.5 pr-4 tabular-nums">{pct.toFixed(0)}%</td>
                  <td className={`py-2.5 font-medium capitalize ${statusTone(progress.status)}`}>
                    {status}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* ------------------------------------------------ Section C ------- */}
      <section className="surface-card rounded-xl border p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold">Weekly CEO activity tracker</h2>
          {behindActivities > 0 && (
            <span className="text-destructive text-xs font-semibold">
              {behindActivities} activity goal(s) behind pace
            </span>
          )}
        </div>
        <p className="text-muted-foreground mt-1 text-xs">
          Activity goals — not financial transactions. Counts log into the current week
          (Monday-based). Suggested targets are prefilled; owners can edit each one.
        </p>
        <ul className="mt-3 flex flex-col gap-3">
          {activityRows.map((row) => (
            <li key={row.kind} className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{ACTIVITY_LABELS[row.kind] ?? row.kind}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {row.count} / {row.target} per week
                    {row.isDefaultTarget ? " (suggested)" : ""}
                  </span>
                  <span className={`text-xs font-semibold ${statusTone(row.status)}`}>
                    {row.status.replace("_", " ")} · {row.pct.toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    className="h-8 w-20 tabular-nums"
                    inputMode="numeric"
                    placeholder="target"
                    value={targetDraft[row.kind] ?? ""}
                    onChange={(e) =>
                      setTargetDraft((draft) => ({ ...draft, [row.kind]: e.target.value }))
                    }
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const value = Number.parseInt(targetDraft[row.kind] ?? "", 10);
                      if (!Number.isFinite(value) || value < 0) {
                        toast.error("Enter a non-negative whole number.");
                        return;
                      }
                      void setTarget({ kind: row.kind, targetPerWeek: value })
                        .then(() => toast.success("Target updated"))
                        .catch(() => toast.error("Only the owner can edit targets."))
                        .finally(() =>
                          setTargetDraft((draft) => ({ ...draft, [row.kind]: "" })),
                        );
                    }}
                  >
                    Set
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      void logActivity({ kind: row.kind, count: 1 })
                        .catch(() => toast.error("Couldn't log the activity."))
                    }
                  >
                    <Plus className="size-4" /> Log 1
                  </Button>
                </div>
              </div>
              <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full transition-[width]"
                  style={{ width: `${row.pct}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
