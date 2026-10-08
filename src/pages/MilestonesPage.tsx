import { BizPageHeader, BizStatCard } from "@/components/finance/BizParts";
import { api } from "@/convex/_generated/api";
import {
  NSE_PLAN_MONTHS,
  SCENARIOS,
  fiveYearCheckpoints,
  milestoneProgress,
  planNse,
} from "@/lib/forecast";
import { ROADMAP_END, ROADMAP_START } from "@/lib/business";
import { formatDate, formatMoney } from "@/lib/format";
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
  const portfolio = useQuery(api.invest.portfolio, {});

  if (roadmap === undefined || portfolio === undefined) {
    return <div className="text-muted-foreground text-sm">Loading milestones…</div>;
  }

  const now = Date.now();
  const elapsed = Math.max(0, now - ROADMAP_START);
  const total = ROADMAP_END - ROADMAP_START;

  const rows = (roadmap as unknown as Row[]).map((row) => ({
    ...row,
    progress: milestoneProgress(
      row.actualCents,
      row.targetCents,
      Math.max(elapsed, 0),
      total,
      ROADMAP_START,
    ),
  }));

  const behindCount = rows.filter((row) => row.progress.status === "behind").length;

  // ---- Personal NSE five-year checkpoints (projection vs actual) ----------
  // The projection uses the base (hypothetical) scenario; the actual is the
  // real recorded portfolio value. Nothing here writes any forecast data.
  const startBalance = portfolio.totals.marketValueCents;
  const nsePlan = planNse({
    startBalanceCents: startBalance,
    monthlyBudgetCents: 100_000, // KSh 1,000 default; editable on Roadmaps
    contributionGrowthPctPerYear: 5,
    scenario: "base",
    annualFeePct: 1.2,
    dividendYieldPct: 4,
    reinvestDividends: true,
  });
  const checkpoints = fiveYearCheckpoints(nsePlan);

  const statusStyles: Record<string, string> = {
    ahead: "text-positive",
    on_track: "text-amber-600",
    behind: "text-destructive",
  };

  return (
    <div className="flex flex-col gap-6">
      <BizPageHeader
        title="Financial Milestones"
        subtitle="Targets respond automatically to recorded actuals. Status: ahead (>110% of expected pace), on track (90–110%), behind (<90%). Estimated completion assumes linear pace."
      />

      {behindCount > 0 && (
        <BizStatCard
          label="Behind pace"
          value={behindCount}
          hint="Milestones below 90% of expected progress"
          tone="negative"
        />
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
              <th className="py-2 pr-4">Time remaining</th>
              <th className="py-2 pr-4">Pace</th>
              <th className="py-2 pr-4">Est. completion</th>
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
                  {row.progress.timeRemainingMs > 0
                    ? `${Math.round(row.progress.timeRemainingMs / (30.44 * 86_400_000))} mo`
                    : "—"}
                </td>
                <td className="py-2.5 pr-4 tabular-nums">
                  {row.progress.paceRatio === null
                    ? "—"
                    : `${(row.progress.paceRatio * 100).toFixed(0)}% of pace`}
                </td>
                <td className="py-2.5 pr-4 tabular-nums">
                  {row.progress.estimatedCompletionMs === null
                    ? "—"
                    : formatDate(row.progress.estimatedCompletionMs)}
                  {row.progress.estimatedOverrun && (
                    <span className="text-destructive ml-1 text-xs">(late)</span>
                  )}
                </td>
                <td className={`py-2.5 font-medium ${statusStyles[row.progress.status]}`}>
                  {row.progress.status.replace("_", " ")}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="text-muted-foreground py-8 text-center text-sm">
                  Open the GHub roadmap page once to seed Year-1 targets.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="surface-card overflow-x-auto rounded-xl border p-4">
        <h2 className="text-sm font-semibold">Personal NSE five-year checkpoints (30-year plan)</h2>
        <p className="text-muted-foreground mt-1 text-xs">
          Projected at the base scenario ({SCENARIOS.base.annualReturnPct}%/yr return,{" "}
          {SCENARIOS.base.annualInflationPct}% inflation) over the {NSE_PLAN_MONTHS}-month engine,
          starting from the actual portfolio value. Hypothetical projection — not actual
          performance. Actual:{" "}
          <strong className="tabular-nums">{formatMoney(startBalance)}</strong>
        </p>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-left text-xs uppercase">
              <th className="py-2 pr-4">Checkpoint</th>
              <th className="py-2 pr-4">Projected nominal</th>
              <th className="py-2 pr-4">Projected real (today's KSh)</th>
              <th className="py-2 pr-4">Cumulative contributions</th>
              <th className="py-2">Progress vs Year-30 target</th>
            </tr>
          </thead>
          <tbody>
            {checkpoints.map((row) => {
              const finalBalance = nsePlan.yearly[nsePlan.yearly.length - 1]?.endBalanceCents ?? 0;
              const pct =
                finalBalance > 0
                  ? Math.min(100, (row.endBalanceCents / finalBalance) * 100)
                  : 0;
              return (
                <tr key={row.year} className="border-border/60 border-b last:border-0">
                  <td className="py-2.5 pr-4 font-medium">Year {row.year}</td>
                  <td className="py-2.5 pr-4 tabular-nums">{formatMoney(row.endBalanceCents)}</td>
                  <td className="py-2.5 pr-4 tabular-nums">{formatMoney(row.realBalanceCents)}</td>
                  <td className="py-2.5 pr-4 tabular-nums">
                    {formatMoney(
                      nsePlan.yearly
                        .slice(0, row.year)
                        .reduce((s, y) => s + y.contributionsCents, 0),
                    )}
                  </td>
                  <td className="py-2.5 tabular-nums">{pct.toFixed(0)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
