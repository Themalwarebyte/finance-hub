import { BizPageHeader, BizStatCard } from "@/components/finance/BizParts";
import { api } from "@/convex/_generated/api";
import { NSE_PLAN_MONTHS, milestoneProgress } from "@/lib/forecast";
import { ROADMAP_END, ROADMAP_START } from "@/lib/business";
import { formatMoney } from "@/lib/format";
import { useQuery } from "convex/react";

type Row = {
  _id: string;
  label: string;
  kind: string;
  quarter: number | null;
  targetCents: number;
  actualCents: number;
};

export default function MilestonesPage() {
  const roadmap = useQuery(api.business.roadmapProgress, {});

  if (roadmap === undefined) {
    return <div className="text-muted-foreground text-sm">Loading milestones…</div>;
  }

  const now = Date.now();
  const elapsed = Math.max(0, now - ROADMAP_START);
  const total = ROADMAP_END - ROADMAP_START;

  const rows = (roadmap as unknown as Row[]).map((row) => ({
    ...row,
    progress: milestoneProgress(row.actualCents, row.targetCents, elapsed, total),
  }));

  const behindCount = rows.filter((row) => row.progress.status === "behind").length;

  // NSE five-year personal investment checkpoints (projection targets from
  // the roadmap engine at the base scenario; actual = portfolio value).
  const nseActual = roadmap === null ? 0 : rows.find((row) => row.kind === "revenue" && row.quarter === null)?.actualCents ?? 0;

  const statusStyles: Record<string, string> = {
    ahead: "text-positive",
    on_track: "text-amber-600",
    behind: "text-destructive",
  };

  return (
    <div className="flex flex-col gap-6">
      <BizPageHeader
        title="Financial Milestones"
        subtitle="Targets respond automatically to recorded actuals. Status: ahead (>110% of expected pace), on track (90–110%), behind (<90%)."
      />

      {behindCount > 0 && (
        <BizStatCard label="Behind pace" value={behindCount} hint="Milestones below 90% of expected progress" tone="negative" />
      )}

      <section className="surface-card overflow-x-auto rounded-xl border p-4">
        <h2 className="text-sm font-semibold">GHub Year-1 roadmap (actual vs target)</h2>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-left text-xs uppercase">
              <th className="py-2 pr-4">Milestone</th>
              <th className="py-2 pr-4">Target</th>
              <th className="py-2 pr-4">Actual</th>
              <th className="py-2 pr-4">Progress</th>
              <th className="py-2 pr-4">Remaining</th>
              <th className="py-2 pr-4">Pace</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row._id} className="border-border/60 border-b last:border-0">
                <td className="py-2.5 pr-4 font-medium">{row.label}</td>
                <td className="py-2.5 pr-4 tabular-nums">{formatMoney(row.targetCents)}</td>
                <td className="py-2.5 pr-4 tabular-nums">{formatMoney(row.actualCents)}</td>
                <td className="py-2.5 pr-4 tabular-nums">{row.progress.pct.toFixed(0)}%</td>
                <td className="py-2.5 pr-4 tabular-nums">{formatMoney(row.progress.remainingCents)}</td>
                <td className="py-2.5 pr-4 tabular-nums">
                  {row.progress.paceRatio === null ? "—" : `${(row.progress.paceRatio * 100).toFixed(0)}% of pace`}
                </td>
                <td className={`py-2.5 font-medium ${statusStyles[row.progress.status]}`}>
                  {row.progress.status.replace("_", " ")}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="text-muted-foreground py-8 text-center text-sm">
                  Open the GHub roadmap page once to seed Year-1 targets.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="surface-card rounded-xl border p-4">
        <h2 className="text-sm font-semibold">Personal NSE checkpoints (30-year plan)</h2>
        <p className="text-muted-foreground mt-1 text-xs">
          The five-year checkpoints are projected in the Roadmaps page against a{" "}
          {NSE_PLAN_MONTHS}-month engine. Current portfolio value (actual):{" "}
          <strong className="tabular-nums">{formatMoney(nseActual === 0 ? 0 : nseActual)}</strong>{" "}
          — see Roadmaps for scenario-based projections.
        </p>
      </section>
    </div>
  );
}
