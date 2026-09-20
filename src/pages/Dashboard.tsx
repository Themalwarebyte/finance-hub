import { PageHeader, MiniStat, ChangeBadge } from "@/components/finance/PageParts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { api } from "@/convex/_generated/api";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FunctionReturnType } from "convex/server";
import { useQuery } from "convex/react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  CalendarClock,
  CreditCard,
  Landmark,
  LineChart,
  PiggyBank,
  Plus,
  Receipt,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

export type DashboardData = NonNullable<FunctionReturnType<typeof api.finance.dashboard>>;

const PERIODS = [
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "3m", label: "Last 3 months" },
  { value: "6m", label: "Last 6 months" },
  { value: "ytd", label: "Year to date" },
  { value: "1y", label: "Last 12 months" },
];

const cashflowConfig = {
  income: { label: "Money in", color: "var(--chart-2)" },
  expenses: { label: "Money out", color: "var(--chart-5)" },
} satisfies ChartConfig;

const categoryColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "oklch(0.62 0.02 258)",
];

function CardShell({
  title,
  icon,
  action,
  children,
  className,
}: {
  title: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("surface-card flex flex-col p-5 sm:p-6", className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
          <span className="text-muted-foreground">{icon}</span>
          {title}
        </h2>
        {action}
      </div>
      <div className="mt-4 flex flex-1 flex-col">{children}</div>
    </section>
  );
}

function StatCard({
  label,
  value,
  change,
  invert,
  hint,
  accent,
  icon,
}: {
  label: string;
  value: string;
  change?: number | null;
  invert?: boolean;
  hint?: string;
  accent?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "surface-card flex flex-col gap-2 p-5",
        accent && "border-transparent bg-primary text-primary-foreground",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={cn(
            "text-[11px] font-semibold tracking-[0.14em] uppercase",
            accent ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          {label}
        </p>
        {icon && (
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-lg",
              accent ? "bg-primary-foreground/12 text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <p className="text-[24px] leading-none font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      <div className="flex items-center gap-2">
        {change !== undefined && <ChangeBadge pct={change} invert={invert} suffix="" />}
        {hint && (
          <p className={cn("text-xs", accent ? "text-primary-foreground/70" : "text-muted-foreground")}>
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [period, setPeriod] = useState("this_month");
  const data = useQuery(api.finance.dashboard, { period });

  if (data === undefined) {
    return (
      <div className="flex flex-col gap-6">
        <div className="bg-muted h-9 w-64 animate-pulse rounded-lg" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="bg-muted h-28 animate-pulse rounded-xl" />
          ))}
        </div>
        <div className="bg-muted h-72 animate-pulse rounded-xl" />
      </div>
    );
  }

  if (data === null || !data.hasData) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Your money, one view"
          subtitle="Add an account to start tracking balances, spending and goals."
        />
        <section className="surface-card flex flex-col items-center px-6 py-14 text-center">
          <span className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-xl">
            <Wallet className="size-6" />
          </span>
          <h2 className="mt-5 text-xl font-semibold tracking-tight">
            Welcome to Finance Hub
          </h2>
          <p className="text-muted-foreground mt-2 max-w-md text-sm leading-6">
            Add your first account from the Accounts page — checking, savings, M-PESA,
            investments — and the dashboard fills in from real records.
          </p>
          <Button asChild className="mt-7 gap-2">
            <a href="/accounts">
              <Plus className="size-4" />
              Add an account
            </a>
          </Button>
        </section>
      </div>
    );
  }

  const { cards } = data;
  const categoryPie = data.spendingByCategory.slice(0, 6).map((row, index) => ({
    ...row,
    fill: categoryColors[index % categoryColors.length],
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        subtitle={`Financial position for ${data.period.label.toLowerCase()}`}
        actions={
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {/* Financial alerts */}
      {data.alerts.length > 0 && (
        <div className="flex flex-col gap-2">
          {data.alerts.map((alert, index) => (
            <div
              key={index}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm",
                alert.severity === "danger"
                  ? "border-destructive/30 bg-destructive/5 text-destructive"
                  : "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400",
              )}
            >
              <AlertTriangle className="size-4 shrink-0" />
              {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          accent
          label="Net worth"
          value={formatMoney(cards.netWorth, { cents: false })}
          hint={`${formatMoney(cards.assets, { cents: false })} assets`}
          icon={<Landmark className="size-4" />}
        />
        <StatCard
          label="Total debt"
          value={formatMoney(cards.totalDebt, { cents: false })}
          hint={`${formatMoney(cards.debtPaymentsMonthly, { cents: false })}/mo payments`}
          icon={<CreditCard className="size-4" />}
        />
        <StatCard
          label={`Income · ${data.period.label.toLowerCase()}`}
          value={formatMoney(cards.income, { cents: false })}
          change={cards.changes.income}
          icon={<ArrowDownLeft className="size-4" />}
        />
        <StatCard
          label={`Expenses · ${data.period.label.toLowerCase()}`}
          value={formatMoney(cards.expenses, { cents: false })}
          change={cards.changes.expenses}
          invert
          icon={<ArrowUpRight className="size-4" />}
        />
        <StatCard
          label="Liquid cash"
          value={formatMoney(cards.cash, { cents: false })}
          hint={cards.mpesa > 0 ? `${formatMoney(cards.mpesa, { cents: false })} in M-PESA` : "Cash + mobile money"}
          icon={<Wallet className="size-4" />}
        />
        <StatCard
          label="Investments"
          value={formatMoney(cards.investments, { cents: false })}
          hint={`+${formatMoney(data.investments.estimatedReturn30, { cents: false })} est. next 30d`}
          icon={<TrendingUp className="size-4" />}
        />
        <StatCard
          label="Monthly savings"
          value={formatMoney(cards.savings, { cents: false })}
          hint={`${cards.savingsRate.toFixed(1)}% savings rate`}
          icon={<PiggyBank className="size-4" />}
        />
        <StatCard
          label="Budget remaining"
          value={
            cards.budgetRemaining === null
              ? "No budgets"
              : formatMoney(cards.budgetRemaining, { cents: false })
          }
          hint={`${formatMoney(cards.upcomingBillsTotal, { cents: false })} bills next 14d`}
          icon={<Target className="size-4" />}
        />
      </div>

      {/* Cash flow + category split */}
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <CardShell
          title="Cash-flow trend"
          icon={<LineChart className="size-4" />}
          action={
            <div className="text-muted-foreground flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="bg-chart-2 size-2 rounded-full" /> In
              </span>
              <span className="flex items-center gap-1.5">
                <span className="bg-chart-5 size-2 rounded-full" /> Out
              </span>
            </div>
          }
        >
          <ChartContainer config={cashflowConfig} className="aspect-auto h-[240px] w-full">
            <BarChart data={data.cashflow} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={54}
                tickFormatter={(value: number) => formatMoney(value, { cents: false }).replace(/\.00$/, "")}
              />
              <ChartTooltip
                content={<ChartTooltipContent labelKey="label" />}
              />
              <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardShell>

        <CardShell title="Spending by category" icon={<Receipt className="size-4" />}>
          {categoryPie.length === 0 ? (
            <p className="text-muted-foreground text-sm">No spending recorded this period.</p>
          ) : (
            <>
              <ChartContainer
                config={Object.fromEntries(
                  categoryPie.map((row) => [row.category, { label: row.category, color: row.fill }]),
                )}
                className="aspect-auto h-[200px] w-full"
              >
                <PieChart>
                  <Pie data={categoryPie} dataKey="amount" nameKey="category" innerRadius={58} outerRadius={88} paddingAngle={2}>
                    {categoryPie.map((row) => (
                      <Cell key={row.category} fill={row.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent labelKey="category" />} />
                </PieChart>
              </ChartContainer>
              <ul className="mt-3 flex flex-col gap-2">
                {categoryPie.map((row) => (
                  <li key={row.category} className="flex items-center gap-2 text-sm">
                    <span className="size-2 rounded-full" style={{ background: row.fill }} />
                    <span className="flex-1 truncate">{row.category}</span>
                    <span className="tabular-nums">{formatMoney(row.amount, { cents: false })}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardShell>
      </div>

      {/* Budgets + goals + bills */}
      <div className="grid gap-6 lg:grid-cols-3">
        <CardShell
          title="Budget usage"
          icon={<PiggyBank className="size-4" />}
          action={
            <Button asChild variant="ghost" size="sm">
              <a href="/budgets">Manage</a>
            </Button>
          }
        >
          {data.budgets.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No budgets yet — create one on the Budgets page.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {data.budgets.slice(0, 4).map((budget) => (
                <li key={budget._id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate font-medium">{budget.name}</span>
                    <span className="text-muted-foreground tabular-nums text-xs">
                      {formatMoney(budget.spent, { cents: false })} / {formatMoney(budget.amount, { cents: false })}
                    </span>
                  </div>
                  <Progress
                    className="mt-2 h-2"
                    value={Math.min(100, budget.usedPct)}
                  />
                  <p
                    className={cn(
                      "mt-1 text-xs",
                      budget.remaining < 0 ? "text-negative" : "text-muted-foreground",
                    )}
                  >
                    {budget.remaining < 0
                      ? `${formatMoney(Math.abs(budget.remaining))} over`
                      : `${formatMoney(budget.remaining)} left`}{" "}
                    · {Math.round(budget.usedPct)}% used
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardShell>

        <CardShell
          title="Savings goals"
          icon={<Target className="size-4" />}
          action={
            <Button asChild variant="ghost" size="sm">
              <a href="/goals">Manage</a>
            </Button>
          }
        >
          {data.goals.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No goals yet — set one on the Goals page.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {data.goals.map((goal) => (
                <li key={goal._id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate font-medium">{goal.name}</span>
                    <span className="text-muted-foreground tabular-nums text-xs">
                      {Math.round(goal.progressPct)}%
                    </span>
                  </div>
                  <Progress className="mt-2 h-2" value={goal.progressPct} />
                  <p className="text-muted-foreground mt-1 text-xs tabular-nums">
                    {formatMoney(goal.saved, { cents: false })} of{" "}
                    {formatMoney(goal.targetAmount, { cents: false })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardShell>

        <CardShell
          title="Upcoming bills"
          icon={<CalendarClock className="size-4" />}
          action={
            <Button asChild variant="ghost" size="sm">
              <a href="/bills">Manage</a>
            </Button>
          }
        >
          {data.upcomingBills.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No scheduled money out in the next 14 days.
            </p>
          ) : (
            <ul className="flex flex-col">
              {data.upcomingBills.map((bill, index) => (
                <li key={bill._id}>
                  <div className="flex items-center gap-3 py-2.5">
                    <span className="bg-negative/10 text-negative flex size-8 shrink-0 items-center justify-center rounded-lg">
                      <ArrowUpRight className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{bill.description}</p>
                      <p className="text-muted-foreground text-xs">
                        {new Date(bill.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}{" "}
                        · {bill.accountName}
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatMoney(bill.amount)}
                    </span>
                  </div>
                  {index < data.upcomingBills.length - 1 && <Separator className="opacity-60" />}
                </li>
              ))}
            </ul>
          )}
        </CardShell>
      </div>

      {/* Debt + income sources + recent */}
      <div className="grid gap-6 lg:grid-cols-3">
        <CardShell
          title="Debt summary"
          icon={<CreditCard className="size-4" />}
          action={
            <Button asChild variant="ghost" size="sm">
              <a href="/debts">Manage</a>
            </Button>
          }
        >
          {data.debts.count === 0 ? (
            <p className="text-muted-foreground text-sm">No debts tracked — that's great!</p>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex gap-6">
                <MiniStat label="Total owed" value={formatMoney(data.debts.total, { cents: false })} tone="negative" />
                <MiniStat label="Monthly payments" value={formatMoney(data.debts.monthly, { cents: false })} />
              </div>
              <ul className="flex flex-col gap-2">
                {data.debts.top.map((debt) => (
                  <li key={debt._id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{debt.name}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {formatMoney(debt.outstandingBalance, { cents: false })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardShell>

        <CardShell title="Income by source" icon={<ArrowDownLeft className="size-4" />}>
          {data.incomeBySource.length === 0 ? (
            <p className="text-muted-foreground text-sm">No income recorded this period.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {data.incomeBySource.map((row) => (
                <li key={row.source} className="flex items-center justify-between text-sm">
                  <span className="truncate">{row.source}</span>
                  <span className="text-positive tabular-nums font-medium">
                    {formatMoney(row.amount, { cents: false })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardShell>

        <CardShell
          title="Recent activity"
          icon={<Receipt className="size-4" />}
          action={
            <Button asChild variant="ghost" size="sm">
              <a href="/transactions">View all</a>
            </Button>
          }
        >
          {data.recentTransactions.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nothing recorded yet.</p>
          ) : (
            <ul className="flex flex-col">
              {data.recentTransactions.map((t, index) => (
                <li key={t._id}>
                  <div className="flex items-center gap-3 py-2.5">
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-lg",
                        t.direction === "in"
                          ? "bg-positive/10 text-positive"
                          : t.direction === "out"
                            ? "bg-negative/10 text-negative"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {t.direction === "in" ? (
                        <ArrowDownLeft className="size-4" />
                      ) : t.direction === "out" ? (
                        <ArrowUpRight className="size-4" />
                      ) : (
                        <ArrowRightLeft className="size-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t.description}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}{" "}
                        · {t.category}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-sm font-semibold tabular-nums",
                        t.direction === "in" && "text-positive",
                      )}
                    >
                      {t.direction === "transfer" ? "" : t.direction === "in" ? "+" : "−"}
                      {formatMoney(t.amount)}
                    </span>
                  </div>
                  {index < data.recentTransactions.length - 1 && <Separator className="opacity-60" />}
                </li>
              ))}
            </ul>
          )}
        </CardShell>
      </div>
    </div>
  );
}
