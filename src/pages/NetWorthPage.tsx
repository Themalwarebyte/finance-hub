import { AppShell } from "@/components/finance/AppShell";
import { PageHeader } from "@/components/finance/PageParts";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Separator } from "@/components/ui/separator";
import { api } from "@/convex/_generated/api";
import { KIND_LABELS } from "@/lib/finance";
import { formatCompactMoney, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { Camera, Landmark, TrendingUp } from "lucide-react";
import { useEffect } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

const chartConfig = {
  netWorth: { label: "Net worth", color: "var(--chart-1)" },
} satisfies ChartConfig;

export default function NetWorthPage() {
  const summary = useQuery(api.networth.summary, {});
  const history = useQuery(api.networth.history, { limit: 90 });
  const ensureSnapshot = useMutation(api.networth.ensureSnapshot);

  // Record today's position once per visit so the trend builds itself.
  useEffect(() => {
    if (summary !== undefined && summary !== null) {
      void ensureSnapshot({}).catch(() => undefined);
    }
  }, [summary, ensureSnapshot]);

  if (summary === undefined) {
    return (
      <AppShell>
        <div className="flex flex-col gap-6">
          <div className="bg-muted h-9 w-56 animate-pulse rounded-lg" />
          <div className="bg-muted h-64 animate-pulse rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (summary === null || summary.rows.length === 0) {
    return (
      <AppShell>
        <PageHeader title="Net worth" subtitle="Assets minus liabilities, from your accounts." />
        <div className="surface-card text-muted-foreground p-10 text-center text-sm">
          Add accounts to see your net worth — every balance contributes automatically.
        </div>
      </AppShell>
    );
  }

  const assetRows = summary.rows.filter((row) => !row.isLiability);
  const liabilityRows = summary.rows.filter((row) => row.isLiability);
  const historyPoints = (history ?? []).map((row) => ({
    label: new Date(row.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    netWorth: row.netWorth,
  }));

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Net worth"
          subtitle="Everything you hold, minus everything you owe."
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="border-transparent bg-primary text-primary-foreground surface-card p-5">
            <p className="text-primary-foreground/70 text-[11px] font-semibold tracking-[0.14em] uppercase">
              Net worth
            </p>
            <p className="mt-2 text-[28px] font-semibold tracking-tight tabular-nums">
              {formatMoney(summary.netWorth, { cents: false })}
            </p>
          </div>
          <div className="surface-card p-5">
            <p className="text-muted-foreground text-xs">Total assets</p>
            <p className="text-positive mt-2 text-2xl font-semibold tabular-nums">
              {formatMoney(summary.assets, { cents: false })}
            </p>
          </div>
          <div className="surface-card p-5">
            <p className="text-muted-foreground text-xs">Total liabilities</p>
            <p className="text-negative mt-2 text-2xl font-semibold tabular-nums">
              {formatMoney(summary.liabilities, { cents: false })}
            </p>
          </div>
        </div>

        {historyPoints.length > 1 && (
          <section className="surface-card p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
              <TrendingUp className="text-muted-foreground size-4" />
              Net-worth trend
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              A snapshot is recorded each time you visit — watch it grow over time.
            </p>
            <ChartContainer config={chartConfig} className="mt-4 aspect-auto h-[220px] w-full">
              <AreaChart data={historyPoints} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="netWorthFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-net-worth)" stopOpacity={0.26} />
                    <stop offset="100%" stopColor="var(--color-net-worth)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} minTickGap={40} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={58}
                  tickFormatter={(value: number) => formatCompactMoney(value)}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelKey="label"
                      formatter={(value) => (
                        <span className="font-medium tabular-nums">{formatMoney(Number(value))}</span>
                      )}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="netWorth"
                  stroke="var(--color-net-worth)"
                  strokeWidth={2.25}
                  fill="url(#netWorthFill)"
                  dot={false}
                />
              </AreaChart>
            </ChartContainer>
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="surface-card p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
              <Landmark className="text-muted-foreground size-4" />
              Assets
            </h2>
            <ul className="mt-3 flex flex-col">
              {assetRows.map((row, index) => (
                <li key={row._id}>
                  <div className="flex items-center gap-3 py-2.5">
                    <span className={cn("size-2.5 shrink-0 rounded-full", "bg-positive/60")} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{row.name}</p>
                      <p className="text-muted-foreground text-xs">{KIND_LABELS[row.kind]}</p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatMoney(row.balance, { cents: false })}
                    </span>
                  </div>
                  {index < assetRows.length - 1 && <Separator className="opacity-60" />}
                </li>
              ))}
            </ul>
          </section>

          <section className="surface-card p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
              <Camera className="text-muted-foreground size-4 rotate-180" />
              Liabilities
            </h2>
            {liabilityRows.length === 0 ? (
              <p className="text-muted-foreground mt-3 text-sm">No liabilities — debt free!</p>
            ) : (
              <ul className="mt-3 flex flex-col">
                {liabilityRows.map((row, index) => (
                  <li key={row._id}>
                    <div className="flex items-center gap-3 py-2.5">
                      <span className="bg-negative/60 size-2.5 shrink-0 rounded-full" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{row.name}</p>
                        <p className="text-muted-foreground text-xs">{KIND_LABELS[row.kind]}</p>
                      </div>
                      <span className="text-negative text-sm font-semibold tabular-nums">
                        {formatMoney(Math.abs(row.balance), { cents: false })}
                      </span>
                    </div>
                    {index < liabilityRows.length - 1 && <Separator className="opacity-60" />}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
