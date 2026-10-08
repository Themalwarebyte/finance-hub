import { BizPageHeader, BizStatCard, useEnsureGHub } from "@/components/finance/BizParts";
import { api } from "@/convex/_generated/api";
import { formatMoney } from "@/lib/format";
import { useQuery } from "convex/react";
import { Building2, Loader2 } from "lucide-react";

export default function GHubDashboard() {
  useEnsureGHub();
  const overview = useQuery(api.business.overview, {});
  const roadmap = useQuery(api.business.roadmapProgress, {});

  if (overview === undefined || roadmap === undefined) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" /> Loading GHub dashboard…
      </div>
    );
  }

  if (overview === null || roadmap === null) {
    return (
      <div className="surface-card flex items-center gap-3 rounded-xl border p-6 text-sm">
        <Building2 className="size-8 shrink-0" />
        <div>
          <p className="font-medium">GHub Technology Solutions isn't set up yet.</p>
          <p className="text-muted-foreground">Sign in with the owner account to bootstrap it.</p>
        </div>
      </div>
    );
  }

  const mrrRow = roadmap.find((row) => row.kind === "mrr");
  const revenueRow = roadmap.find((row) => row.kind === "revenue" && row.quarter === null);

  return (
    <div className="flex flex-col gap-6">
      <BizPageHeader
        title="GHub — Dashboard"
        subtitle="All amounts are KES and come only from recorded business data."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <BizStatCard
          label="Revenue YTD"
          value={formatMoney(overview.revenueYtd)}
          hint={`Invoiced ${formatMoney(overview.invoicedRevenueYtd)} · earned basis`}
        />
        <BizStatCard label="Cash collected" value={formatMoney(overview.cashCollected)} />
        <BizStatCard label="Operating expenses" value={formatMoney(overview.operatingExpenses)} tone="neutral" />
        <BizStatCard
          label="Net operating profit"
          value={formatMoney(overview.netOperatingProfit)}
          tone={overview.netOperatingProfit >= 0 ? "positive" : "negative"}
        />
        <BizStatCard label="Available business cash" value={formatMoney(overview.availableCash)} />
        <BizStatCard label="Outstanding receivables" value={formatMoney(overview.receivables)} />
        <BizStatCard
          label="Monthly recurring revenue"
          value={formatMoney(overview.mrrCents)}
          hint={
            mrrRow
              ? `${Math.round(mrrRow.progressPct)}% of the KSh 6,000 goal`
              : undefined
          }
        />
        <BizStatCard
          label="Active retainer clients"
          value={overview.activeRetainerClients}
          hint={`${overview.openLeadCount} open leads in the pipeline`}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <BizStatCard
          label="Business runway"
          value={
            overview.runwayMonths === Number.POSITIVE_INFINITY
              ? "Open-ended"
              : `${overview.runwayMonths} months`
          }
          hint={overview.assumptions.runway}
        />
        <BizStatCard
          label="Milestone pace"
          value={revenueRow ? `Revenue ${Math.round(revenueRow.progressPct)}%` : "—"}
          hint={revenueRow ? `Expected pace ${Math.round(revenueRow.expectedPct)}% of the year` : undefined}
        />
      </div>

      <p className="text-muted-foreground text-xs">
        Earned-revenue basis: {overview.assumptions.earned}
      </p>
    </div>
  );
}
