import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Separator } from "@/components/ui/separator";
import type { api } from "@/convex/_generated/api";
import { KIND_LABELS, colorMeta, WINDOW_OPTIONS } from "@/lib/finance";
import {
  formatCompactMoney,
  formatMoney,
  formatRelativeDay,
  formatShortDate,
  formatSignedMoney,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FunctionReturnType } from "convex/server";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  Clock,
  Landmark,
  LineChart,
  Plus,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";

export type OverviewData = NonNullable<
  FunctionReturnType<typeof api.finance.overview>
>;

const chartConfig = {
  balance: { label: "Projected balance", color: "var(--chart-1)" },
} satisfies ChartConfig;

function StatCard({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "surface-card flex flex-col gap-3 p-5",
        accent && "bg-primary text-primary-foreground border-transparent",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className={cn(
            "text-[11px] font-semibold tracking-[0.14em] uppercase",
            accent ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          {label}
        </p>
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg",
            accent
              ? "bg-primary-foreground/12 text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {icon}
        </span>
      </div>
      <p className="text-[26px] leading-none font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      <p
        className={cn(
          "text-xs leading-5",
          accent ? "text-primary-foreground/70" : "text-muted-foreground",
        )}
      >
        {hint}
      </p>
    </div>
  );
}

function EmptyState({
  onAddAccount,
  onLoadSample,
  loadingSample,
}: {
  onAddAccount: () => void;
  onLoadSample: () => void;
  loadingSample: boolean;
}) {
  return (
    <div className="surface-card flex flex-col items-center px-6 py-14 text-center">
      <span className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-xl">
        <Wallet className="size-6" />
      </span>
      <h2 className="mt-5 text-xl font-semibold tracking-tight">
        Add your accounts to see everything in one place
      </h2>
      <p className="text-muted-foreground mt-2 max-w-md text-sm leading-6">
        Balances, money in, money out and next month&apos;s projection all build
        from your accounts. Start with checking and savings.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={onAddAccount} className="gap-2">
          <Plus className="size-4" />
          Add an account
        </Button>
        <Button
          variant="outline"
          onClick={onLoadSample}
          disabled={loadingSample}
          className="gap-2"
        >
          <Sparkles className="size-4" />
          {loadingSample ? "Loading example data…" : "Load example data"}
        </Button>
      </div>
    </div>
  );
}

export function OverviewTab({
  data,
  onAddAccount,
  onAddTransaction,
  onLoadSample,
  loadingSample,
  onWindowDaysChange,
  onGoToAccounts,
}: {
  data: OverviewData;
  onAddAccount: () => void;
  onAddTransaction: () => void;
  onLoadSample: () => void;
  loadingSample: boolean;
  onWindowDaysChange: (days: number) => void;
  onGoToAccounts: () => void;
}) {
  if (!data.hasData) {
    return (
      <EmptyState
        onAddAccount={onAddAccount}
        onLoadSample={onLoadSample}
        loadingSample={loadingSample}
      />
    );
  }

  const { projection } = data;
  const changePositive = projection.change >= 0;
  const net30 = data.moneyIn30 - data.moneyOut30;
  const maxUpcoming = data.upcoming.slice(0, 7);
  const finalPoint = projection.points[projection.points.length - 1];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          accent
          label="Total balance"
          value={formatMoney(data.totalBalance, { cents: false })}
          hint={`${data.accountCount} account${data.accountCount === 1 ? "" : "s"} · ${formatMoney(data.assets, { cents: false })} assets, ${formatMoney(Math.abs(data.liabilities), { cents: false })} owed`}
          icon={<Landmark className="size-4" />}
        />
        <StatCard
          label={`Projected · ${data.windowDays}d`}
          value={formatMoney(projection.endBalance, { cents: false })}
          hint={
            data.investments.estimatedReturn !== 0
              ? `${changePositive ? "+" : "\u2212"}${formatMoney(Math.abs(projection.change), { cents: false })} · incl. ${formatMoney(data.investments.estimatedReturn, { cents: false })} est. returns`
              : `${changePositive ? "+" : "\u2212"}${formatMoney(Math.abs(projection.change), { cents: false })} from scheduled money`
          }
          icon={
            changePositive ? (
              <TrendingUp className="size-4" />
            ) : (
              <TrendingDown className="size-4" />
            )
          }
        />
        <StatCard
          label="Money in · 30d"
          value={formatMoney(data.moneyIn30, { cents: false })}
          hint={`Scheduled next ${data.windowDays}d: ${formatMoney(projection.scheduledIn, { cents: false })}`}
          icon={<ArrowDownLeft className="size-4" />}
        />
        <StatCard
          label="Money out · 30d"
          value={formatMoney(data.moneyOut30, { cents: false })}
          hint={`Net ${net30 >= 0 ? "+" : "\u2212"}${formatMoney(Math.abs(net30), { cents: false })} · ${formatMoney(projection.scheduledOut, { cents: false })} scheduled out`}
          icon={<ArrowUpRight className="size-4" />}
        />
      </div>

      {/* All balances in one view */}
      <section className="surface-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
              <Wallet className="text-muted-foreground size-4" />
              All balances
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Every account you and your partner share, side by side.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onGoToAccounts}>
            Manage accounts
          </Button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.accounts.map((account) => {
            const meta = colorMeta(account.color);
            const negative = account.balance < 0;
            return (
              <div
                key={account._id}
                className="border-border/70 hover:border-border hover:shadow-[var(--shadow-soft)] flex flex-col gap-3 rounded-xl border p-4 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <span className={cn("size-2.5 shrink-0 rounded-full", meta.dot)} />
                  <p className="truncate text-sm font-medium">{account.name}</p>
                </div>
                <p
                  className={cn(
                    "text-xl font-semibold tracking-tight tabular-nums",
                    negative && "text-negative",
                  )}
                >
                  {formatMoney(account.balance)}
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  {KIND_LABELS[account.kind]}
                  {account.institution ? ` · ${account.institution}` : ""}
                </p>
              </div>
            );
          })}
        </div>

        <Separator className="my-5" />
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground text-xs">Money you hold</p>
            <p className="mt-1 text-sm font-semibold tabular-nums">
              {formatMoney(data.assets)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Money you owe</p>
            <p className="mt-1 text-sm font-semibold tabular-nums">
              {formatMoney(Math.abs(data.liabilities))}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Net position</p>
            <p className="text-positive mt-1 text-sm font-semibold tabular-nums">
              {formatMoney(data.totalBalance)}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.65fr_1fr]">
        {/* Projection */}
        <div className="surface-card flex flex-col p-6">
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
            <Select
              value={String(data.windowDays)}
              onValueChange={(value) => onWindowDaysChange(Number(value))}
            >
              <SelectTrigger size="sm" className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WINDOW_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-6 flex flex-wrap items-end gap-x-6 gap-y-3">
            <div>
              <p className="text-muted-foreground text-xs">
                Balance on {finalPoint?.label ?? "today"}
              </p>
              <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
                {formatMoney(projection.endBalance)}
              </p>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "gap-1 border-transparent tabular-nums",
                changePositive
                  ? "bg-positive/10 text-positive"
                  : "bg-negative/10 text-negative",
              )}
            >
              {changePositive ? (
                <TrendingUp className="size-3" />
              ) : (
                <TrendingDown className="size-3" />
              )}
              {changePositive ? "+" : "\u2212"}
              {formatMoney(Math.abs(projection.change))} over {data.windowDays} days
            </Badge>
          </div>

          <ChartContainer
            config={chartConfig}
            className="mt-5 aspect-auto h-[248px] w-full"
          >
            <AreaChart
              data={projection.points}
              margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="tallyBalanceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--color-balance)"
                    stopOpacity={0.26}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--color-balance)"
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                minTickGap={32}
              />
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
                      <span className="font-medium tabular-nums">
                        {formatMoney(Number(value))}
                      </span>
                    )}
                  />
                }
              />
              <ReferenceLine
                y={projection.startBalance}
                stroke="var(--border)"
                strokeDasharray="4 4"
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="var(--color-balance)"
                strokeWidth={2.25}
                fill="url(#tallyBalanceFill)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
              />
            </AreaChart>
          </ChartContainer>

          <div className="border-border/70 mt-4 grid gap-4 border-t pt-4 sm:grid-cols-2 lg:grid-cols-4">
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
                {"\u2212"}
                {formatMoney(projection.scheduledOut)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Est. investment return</p>
              <p
                className={cn(
                  "mt-1 text-sm font-semibold tabular-nums",
                  data.investments.estimatedReturn > 0 && "text-positive",
                  data.investments.estimatedReturn < 0 && "text-negative",
                )}
              >
                {data.investments.count === 0
                  ? "No investments yet"
                  : `${data.investments.estimatedReturn >= 0 ? "+" : "\u2212"}${formatMoney(Math.abs(data.investments.estimatedReturn))}`}
              </p>
            </div>
          </div>
        </div>

        {/* Upcoming money */}
        <div className="surface-card flex flex-col p-6">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
              <CalendarClock className="text-muted-foreground size-4" />
              Upcoming money
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {projection.scheduledCount} scheduled item
              {projection.scheduledCount === 1 ? "" : "s"} in the next{" "}
              {data.windowDays} days.
            </p>
          </div>

          <div className="mt-4 flex flex-1 flex-col">
            {maxUpcoming.length === 0 ? (
              <div className="border-border/70 text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center text-sm">
                <CalendarClock className="size-5" />
                <p>No scheduled money yet.</p>
                <p className="text-xs">
                  Add recurring items to see the projection fill in.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col">
                {maxUpcoming.map((item, index) => (
                  <li key={item._id}>
                    <div className="flex items-center gap-3 py-3">
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
                        <p className="truncate text-sm font-medium">
                          {item.description}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">
                          {formatRelativeDay(item.date)} · {item.accountName}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 text-sm font-semibold tabular-nums",
                          item.direction === "in" ? "text-positive" : "text-foreground",
                        )}
                      >
                        {formatSignedMoney(item.amount, item.direction)}
                      </span>
                    </div>
                    {index < maxUpcoming.length - 1 && (
                      <Separator className="opacity-60" />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Recent activity */}
      <section className="surface-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
              <Clock className="text-muted-foreground size-4" />
              Recent activity
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              The latest money in and out across all accounts.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onAddTransaction} className="gap-2">
            <Plus className="size-4" />
            Record money
          </Button>
        </div>

        {data.recentTransactions.length === 0 ? (
          <p className="text-muted-foreground mt-5 text-sm">
            Nothing recorded yet — add your first entry.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col">
            {data.recentTransactions.map((item, index) => (
              <li key={item._id}>
                <div className="flex items-center gap-3 py-3">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg",
                      item.direction === "in"
                        ? "bg-positive/10 text-positive"
                        : "bg-negative/10 text-negative",
                    )}
                  >
                    {item.direction === "in" ? (
                      <ArrowDownLeft className="size-4" />
                    ) : (
                      <ArrowUpRight className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {item.description}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {formatShortDate(item.date)} · {item.category} ·{" "}
                      {item.accountName}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-sm font-semibold tabular-nums",
                      item.direction === "in" ? "text-positive" : "text-foreground",
                    )}
                  >
                    {formatSignedMoney(item.amount, item.direction)}
                  </span>
                </div>
                {index < data.recentTransactions.length - 1 && (
                  <Separator className="opacity-60" />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
