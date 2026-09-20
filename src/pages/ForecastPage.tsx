import { AppShell } from "@/components/finance/AppShell";
import { PageHeader } from "@/components/finance/PageParts";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import { formatCompactMoney, formatMoney, formatRelativeDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, LineChart } from "lucide-react";
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";

const chartConfig = {
  balance: { label: "Projected balance", color: "var(--chart-1)" },
} satisfies ChartConfig;

const WINDOWS = [
  { value: 7, label: "Next 7 days" },
  { value: 30, label: "Next 30 days" },
  { value: 60, label: "Next 60 days" },
  { value: 90, label: "Next 90 days" },
];

export default function ForecastPage() {
  const [windowDays, setWindowDays] = useState(30);
  const data = useQuery(api.finance.overview, { windowDays });

  if (data === undefined) {
    return (
      <AppShell>
        <div className="flex flex-col gap-6">
          <div className="bg-muted h-9 w-56 animate-pulse rounded-lg" />
          <div className="bg-muted h-80 animate-pulse rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (data === null || !data.hasData) {
    return (
      <AppShell>
        <PageHeader title="Forecast" subtitle="Add accounts to project your balance forward." />
        <div className="surface-card text-muted-foreground p-10 text-center text-sm">
          Add an account first — the forecast needs a starting balance.
        </div>
      </AppShell>
    );
  }

  const { projection } = data;
  const positive = projection.change >= 0;

  // Lowest point in the window — flag it if it dips near or below zero.
  const lowPoint = projection.points.reduce(
    (lowest, point) => (point.balance < lowest.balance ? point : lowest),
    projection.points[0],
  );
  const lowWarning = lowPoint && lowPoint.balance < 50_000;

  const milestones = WINDOWS.map((w) => {
    const point = projection.points[Math.min(w.value, projection.points.length - 1)];
    return { days: w.value, balance: point?.balance ?? projection.startBalance };
  });

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Forecast"
          subtitle="Projected balances from recurring money and investment returns."
          actions={
            <Select value={String(windowDays)} onValueChange={(value) => setWindowDays(Number(value))}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WINDOWS.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />

        {lowWarning && (
          <div className="border-destructive/30 bg-destructive/5 text-destructive flex items-center gap-3 rounded-xl border px-4 py-3 text-sm">
            <AlertTriangle className="size-4 shrink-0" />
            Projected low balance on {lowPoint.label}: {formatMoney(lowPoint.balance)}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          {milestones.map((milestone) => (
            <div key={milestone.days} className="surface-card p-5">
              <p className="text-muted-foreground text-xs">Balance in {milestone.days} days</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {formatMoney(milestone.balance, { cents: false })}
              </p>
            </div>
          ))}
        </div>

        <section className="surface-card flex flex-col p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
                <LineChart className="text-muted-foreground size-4" />
                Balance projection
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Scheduled money plus estimated investment returns, day by day.
              </p>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "gap-1 border-transparent tabular-nums",
                positive ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative",
              )}
            >
              {positive ? "+" : "−"}
              {formatMoney(Math.abs(projection.change))} over {windowDays} days
            </Badge>
          </div>

          <ChartContainer config={chartConfig} className="mt-5 aspect-auto h-[280px] w-full">
            <AreaChart data={projection.points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-balance)" stopOpacity={0.26} />
                  <stop offset="100%" stopColor="var(--color-balance)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} minTickGap={32} />
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
              <ReferenceLine y={projection.startBalance} stroke="var(--border)" strokeDasharray="4 4" />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="var(--color-balance)"
                strokeWidth={2.25}
                fill="url(#forecastFill)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
              />
            </AreaChart>
          </ChartContainer>

          <div className="border-border/70 mt-4 grid gap-4 border-t pt-4 sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground text-xs">Starting balance</p>
              <p className="mt-1 text-sm font-semibold tabular-nums">
                {formatMoney(projection.startBalance)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Scheduled in</p>
              <p className="text-positive mt-1 text-sm font-semibold tabular-nums">
                +{formatMoney(projection.scheduledIn)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Scheduled out</p>
              <p className="text-negative mt-1 text-sm font-semibold tabular-nums">
                −{formatMoney(projection.scheduledOut)}
              </p>
            </div>
          </div>
        </section>

        <section className="surface-card p-6">
          <h2 className="text-base font-semibold tracking-tight">Upcoming money</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {projection.scheduledCount} scheduled item{projection.scheduledCount === 1 ? "" : "s"} in the next {windowDays} days.
          </p>
          {data.upcoming.length === 0 ? (
            <p className="text-muted-foreground mt-4 text-sm">
              Nothing scheduled — add recurring items on the Bills page.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col">
              {data.upcoming.slice(0, 10).map((item) => (
                <li key={item._id} className="flex items-center gap-3 py-2.5">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg",
                      item.direction === "in"
                        ? "bg-positive/10 text-positive"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {item.direction === "in" ? (
                      <ArrowDownLeft className="size-4" />
                    ) : (
                      <ArrowUpRight className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.description}</p>
                    <p className="text-muted-foreground text-xs">
                      {formatRelativeDay(item.date)} · {item.accountName}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">
                    {item.direction === "in" ? "+" : "−"}
                    {formatMoney(item.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
