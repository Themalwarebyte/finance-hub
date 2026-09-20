import { v } from "convex/values";
import { query } from "./_generated/server";
import { balancesByAccount, isLiabilityKind } from "./accounts";
import {
  DAY,
  buildProjection,
  estimatedReturnTotal,
  expandSchedule,
  getViewer,
  type GrowthAccount,
  type ProjectionPoint,
  type ScheduledEvent,
} from "./lib";
import { monthRange, resolvePeriod } from "./periods";

export const DEFAULT_WINDOW_DAYS = 30;

type MonthBucket = { label: string; income: number; expenses: number };

function monthLabel(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

/** Aggregate transactions into calendar-month income/expense buckets. */
function monthlyBuckets(
  transactions: { direction: string; amount: number; date: number }[],
  months: number,
  now: number,
): MonthBucket[] {
  const buckets: MonthBucket[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    const start = new Date(d.getFullYear(), d.getMonth() - i, 1).getTime();
    const end = new Date(d.getFullYear(), d.getMonth() - i + 1, 1).getTime();
    const inRange = transactions.filter((t) => t.date >= start && t.date < end);
    buckets.push({
      label: monthLabel(start),
      income: inRange.filter((t) => t.direction === "in").reduce((s, t) => s + t.amount, 0),
      expenses: inRange.filter((t) => t.direction === "out").reduce((s, t) => s + t.amount, 0),
    });
  }
  return buckets;
}

/**
 * Everything the main screen needs in one reactive subscription:
 * all balances, money in / money out, and the projected balance curve.
 */
export const overview = query({
  args: { windowDays: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    if (!viewer) return null;

    const windowDays = Math.min(
      Math.max(Math.round(args.windowDays ?? DEFAULT_WINDOW_DAYS), 7),
      120,
    );

    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
      .collect();

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
      .collect();

    const recurring = await ctx.db
      .query("recurring")
      .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
      .collect();

    const balances = balancesByAccount(accounts, transactions);

    // Investment accounts grow the projection by their estimated return.
    const growthAccounts: GrowthAccount[] = accounts
      .filter(
        (account): account is typeof account & { estimatedReturnPct: number } =>
          account.kind === "investment" &&
          !account.archived &&
          account.estimatedReturnPct !== undefined &&
          account.estimatedReturnPct !== 0,
      )
      .map((account) => ({
        balance: balances.get(account._id) ?? 0,
        annualBps: Math.round(
          account.estimatedReturnPct *
            100 *
            (account.returnBasis === "monthly" ? 12 : 1),
        ),
      }));

    const now = Date.now();
    const since = now - 30 * DAY;
    let moneyIn30 = 0;
    let moneyOut30 = 0;
    for (const transaction of transactions) {
      if (transaction.date < since) continue;
      if (transaction.direction === "in") moneyIn30 += transaction.amount;
      else if (transaction.direction === "out") moneyOut30 += transaction.amount;
    }

    const openAccounts = accounts.filter((account) => !account.archived);
    const accountRows = openAccounts
      .sort((a, b) => {
        const aCredit = isLiabilityKind(a.kind) ? 1 : 0;
        const bCredit = isLiabilityKind(b.kind) ? 1 : 0;
        if (aCredit !== bCredit) return aCredit - bCredit;
        return b.createdAt - a.createdAt;
      })
      .map((account) => {
        const balance = balances.get(account._id) ?? 0;
        return {
          _id: account._id,
          name: account.name,
          kind: account.kind,
          institution: account.institution ?? null,
          color: account.color,
          setupBalance: account.openingBalance,
          balance,
          estimatedReturnPct: account.estimatedReturnPct ?? null,
          returnBasis: account.returnBasis ?? null,
        };
      });

    const assets = accountRows
      .filter((account) => !isLiabilityKind(account.kind))
      .reduce((sum, account) => sum + account.balance, 0);
    const liabilities = accountRows
      .filter((account) => isLiabilityKind(account.kind))
      .reduce((sum, account) => sum + account.balance, 0);

    const totalBalance = assets + liabilities;

    const events = expandSchedule(recurring, now, windowDays);
    const points: ProjectionPoint[] = buildProjection(
      events,
      totalBalance,
      now,
      windowDays,
      growthAccounts,
    );
    const estimatedReturn = estimatedReturnTotal(growthAccounts, windowDays);

    const accountNames = new Map(accounts.map((a) => [a._id, a.name]));

    const scheduledIn = events
      .filter((event) => event.signed > 0)
      .reduce((sum, event) => sum + event.signed, 0);
    const scheduledOut = events
      .filter((event) => event.signed < 0)
      .reduce((sum, event) => sum + Math.abs(event.signed), 0);

    let running = totalBalance;
    const upcoming: {
      _id: string;
      date: number;
      description: string;
      amount: number;
      direction: "in" | "out" | "transfer";
      category: string;
      frequency: string;
      accountName: string;
      runningBalance: number;
    }[] = [];

    for (const event of events.slice(0, 40)) {
      running += event.signed;
      upcoming.push({
        _id: `${event.item._id}:${event.date}`,
        date: event.date,
        description: event.item.description,
        amount: event.item.amount,
        direction: event.item.direction,
        category: event.item.category,
        frequency: event.item.frequency,
        accountName: accountNames.get(event.item.accountId) ?? "Removed account",
        runningBalance: running,
      });
    }

    const recentTransactions = [...transactions]
      .sort((a, b) => b.date - a.date || b.createdAt - a.createdAt)
      .slice(0, 6)
      .map((transaction) => ({
        _id: transaction._id,
        date: transaction.date,
        description: transaction.description,
        amount: transaction.amount,
        direction: transaction.direction,
        category: transaction.category,
        accountName: accountNames.get(transaction.accountId) ?? "Removed account",
      }));

    const lastPoint = points[points.length - 1] ?? {
      balance: totalBalance,
      date: now,
      label: "",
      net: 0,
    };

    return {
      windowDays,
      generatedAt: now,
      hasData: accounts.length > 0,
      currency: "USD",
      totalBalance,
      assets,
      liabilities,
      accountCount: accountRows.length,
      moneyIn30,
      moneyOut30,
      accounts: accountRows,
      investments: {
        count: accountRows.filter((account) => account.kind === "investment").length,
        investedBalance: accountRows
          .filter((account) => account.kind === "investment")
          .reduce((sum, account) => sum + account.balance, 0),
        estimatedReturn,
      },
      projection: {
        points,
        startBalance: totalBalance,
        endBalance: lastPoint.balance,
        change: lastPoint.balance - totalBalance,
        scheduledIn,
        scheduledOut,
        scheduledCount: events.length,
        estimatedReturn,
      },
      upcoming,
      recentTransactions,
    };
  },
});

/**
 * The full dashboard aggregation: summary cards, breakdowns, trends,
 * budget usage, upcoming bills, goals, debts, investments and alerts.
 */
export const dashboard = query({
  args: {
    period: v.optional(v.string()),
    customStart: v.optional(v.number()),
    customEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    if (!viewer) return null;

    const now = Date.now();
    const period = resolvePeriod(
      args.period ?? "this_month",
      now,
      args.customStart,
      args.customEnd,
    );

    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
      .collect();
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
      .collect();
    const recurring = await ctx.db
      .query("recurring")
      .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
      .collect();
    const budgets = await ctx.db
      .query("budgets")
      .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
      .collect();
    const goals = await ctx.db
      .query("goals")
      .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
      .collect();
    const debts = await ctx.db
      .query("debts")
      .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
      .collect();

    const balances = balancesByAccount(accounts, transactions);
    const open = accounts.filter((a) => !a.archived);
    const accountNames = new Map(accounts.map((a) => [a._id, a.name]));

    // ---- Net worth ----
    const netWorthRows = open.filter((a) => a.includeInNetWorth !== false);
    const assets = netWorthRows
      .filter((a) => !isLiabilityKind(a.kind))
      .reduce((sum, a) => sum + Math.max(0, balances.get(a._id) ?? 0), 0);
    const liabilities = netWorthRows
      .filter((a) => isLiabilityKind(a.kind))
      .reduce((sum, a) => sum + Math.abs(Math.min(0, balances.get(a._id) ?? 0)), 0);
    const netWorth = assets - liabilities;

    const bankKinds = ["checking", "savings", "current"];
    const liquidKinds = [...bankKinds, "cash", "mpesa", "mobile_money", "sacco"];
    const investKinds = ["investment", "brokerage", "pension", "money_market", "crypto"];
    const debtKinds = ["credit", "loan", "mortgage"];

    const sumKinds = (kinds: string[]) =>
      open
        .filter((a) => kinds.includes(a.kind) && a.includeInNetWorth !== false)
        .reduce((sum, a) => sum + (balances.get(a._id) ?? 0), 0);

    const cash = open
      .filter((a) => ["cash", "mpesa", "mobile_money"].includes(a.kind))
      .reduce((sum, a) => sum + (balances.get(a._id) ?? 0), 0);
    const mpesa = open
      .filter((a) => a.kind === "mpesa")
      .reduce((sum, a) => sum + (balances.get(a._id) ?? 0), 0);

    // ---- Period flows ----
    const inPeriod = transactions.filter(
      (t) => t.date >= period.start && t.date < period.end && t.status !== "pending",
    );
    const income = inPeriod
      .filter((t) => t.direction === "in")
      .reduce((s, t) => s + t.amount, 0);
    const expenses = inPeriod
      .filter((t) => t.direction === "out")
      .reduce((s, t) => s + t.amount, 0);
    const savings = inPeriod
      .filter((t) => t.direction === "out" && t.goalId)
      .reduce((s, t) => s + t.amount, 0);
    const monthlySavings = savings || Math.max(0, income - expenses);
    const savingsRate = income > 0 ? (monthlySavings / income) * 100 : 0;

    // Previous period for % changes.
    const prevSpan = period.end - period.start;
    const prevIn = transactions.filter(
      (t) => t.date >= period.start - prevSpan && t.date < period.start && t.status !== "pending",
    );
    const prevIncome = prevIn.filter((t) => t.direction === "in").reduce((s, t) => s + t.amount, 0);
    const prevExpenses = prevIn.filter((t) => t.direction === "out").reduce((s, t) => s + t.amount, 0);
    const pctChange = (current: number, previous: number): number | null => {
      if (previous === 0) return current > 0 ? 100 : null;
      return ((current - previous) / previous) * 100;
    };

    // ---- Breakdowns ----
    const categoryMap = new Map<string, number>();
    for (const t of inPeriod.filter((t) => t.direction === "out")) {
      categoryMap.set(t.category, (categoryMap.get(t.category) ?? 0) + t.amount);
    }
    const spendingByCategory = Array.from(categoryMap.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    const sourceMap = new Map<string, number>();
    for (const t of inPeriod.filter((t) => t.direction === "in")) {
      sourceMap.set(t.category, (sourceMap.get(t.category) ?? 0) + t.amount);
    }
    const incomeBySource = Array.from(sourceMap.entries())
      .map(([source, amount]) => ({ source, amount }))
      .sort((a, b) => b.amount - a.amount);

    // ---- Trends (6-month cash flow) ----
    const cashflow = monthlyBuckets(transactions, 6, now);

    // ---- Budgets ----
    const budgetRows = budgets
      .filter((b) => b.active)
      .map((budget) => {
        const range =
          budget.period === "custom" && budget.endDate
            ? { start: budget.startDate, end: budget.endDate }
            : monthRange(now);
        const spent = inPeriod
          .filter(
            (t) =>
              t.direction === "out" &&
              t.category === budget.category &&
              (!budget.subcategory || t.subcategory === budget.subcategory) &&
              t.date >= range.start &&
              t.date < range.end,
          )
          .reduce((s, t) => s + t.amount, 0);
        const total = budget.amount + (budget.rolloverCents ?? 0);
        return {
          _id: budget._id,
          name: budget.name,
          category: budget.category,
          amount: total,
          spent,
          remaining: total - spent,
          usedPct: total > 0 ? (spent / total) * 100 : 0,
        };
      })
      .sort((a, b) => b.usedPct - a.usedPct);
    const budgetRemaining = budgetRows.length
      ? budgetRows.reduce((s, b) => s + Math.max(0, b.remaining), 0)
      : null;

    // ---- Upcoming bills (next 14 days from recurring) ----
    const events = expandSchedule(recurring, now, 14);
    const upcomingBills = events
      .filter((e) => e.signed < 0)
      .slice(0, 6)
      .map((e) => ({
        _id: `${e.item._id}:${e.date}`,
        date: e.date,
        description: e.item.description,
        amount: e.item.amount,
        accountName: accountNames.get(e.item.accountId) ?? "Removed account",
      }));

    // ---- Debts ----
    const activeDebts = debts.filter((d) => !d.archived);
    const totalDebt = activeDebts.reduce((s, d) => s + d.outstandingBalance, 0);
    const debtPaymentsMonthly = activeDebts.reduce((s, d) => s + d.monthlyPayment, 0);

    // ---- Goals ----
    const savedByGoal = new Map<string, number>();
    for (const goal of goals.filter((g) => !g.archived)) savedByGoal.set(goal._id, 0);
    for (const t of transactions) {
      if (t.goalId && savedByGoal.has(t.goalId) && t.direction === "out") {
        savedByGoal.set(t.goalId, (savedByGoal.get(t.goalId) ?? 0) + t.amount);
      }
    }
    const goalRows = goals
      .filter((g) => !g.archived)
      .map((goal) => {
        const saved = savedByGoal.get(goal._id) ?? 0;
        return {
          _id: goal._id,
          name: goal.name,
          targetAmount: goal.targetAmount,
          saved,
          progressPct: goal.targetAmount > 0 ? Math.min(100, (saved / goal.targetAmount) * 100) : 0,
        };
      })
      .sort((a, b) => b.progressPct - a.progressPct)
      .slice(0, 4);

    // ---- Investments ----
    const invested = open
      .filter((a) => investKinds.includes(a.kind))
      .reduce((s, a) => s + (balances.get(a._id) ?? 0), 0);
    const growthAccounts: GrowthAccount[] = open
      .filter(
        (a): a is typeof a & { estimatedReturnPct: number } =>
          investKinds.includes(a.kind) &&
          a.estimatedReturnPct !== undefined &&
          a.estimatedReturnPct !== 0,
      )
      .map((a) => ({
        balance: balances.get(a._id) ?? 0,
        annualBps: Math.round(
          a.estimatedReturnPct * 100 * (a.returnBasis === "monthly" ? 12 : 1),
        ),
      }));
    const estimatedReturn30 = estimatedReturnTotal(growthAccounts, 30);

    // ---- Alerts (rule-based, from real data) ----
    const alerts: { kind: string; severity: "warning" | "danger" | "info"; message: string }[] = [];
    for (const budget of budgetRows) {
      if (budget.usedPct >= 100) {
        alerts.push({
          kind: "budget",
          severity: "danger",
          message: `${budget.name} is over budget — ${Math.round(budget.usedPct)}% used.`,
        });
      } else if (budget.usedPct >= 80) {
        alerts.push({
          kind: "budget",
          severity: "warning",
          message: `${budget.name} is at ${Math.round(budget.usedPct)}% of budget.`,
        });
      }
    }
    const nextBill = events.filter((e) => e.signed < 0)[0];
    if (nextBill && nextBill.date - now < 2 * DAY) {
      alerts.push({
        kind: "bill",
        severity: "warning",
        message: `${nextBill.item.description} is due ${
          nextBill.date - now < DAY ? "today" : "tomorrow"
        }.`,
      });
    }
    const liquidNow = open
      .filter((a) => liquidKinds.includes(a.kind))
      .reduce((s, a) => s + (balances.get(a._id) ?? 0), 0);
    if (liquidNow < 50_000) {
      alerts.push({
        kind: "balance",
        severity: "danger",
        message: "Your liquid balance is very low.",
      });
    }
    for (const goal of goals.filter((g) => !g.archived && g.targetDate)) {
      const saved = savedByGoal.get(goal._id) ?? 0;
      const monthsLeft = Math.max(
        0,
        Math.round(((goal.targetDate ?? now) - now) / (30.44 * DAY)),
      );
      const needed = Math.ceil(Math.max(0, goal.targetAmount - saved) / Math.max(1, monthsLeft));
      if (goal.contributionAmount && needed > goal.contributionAmount) {
        alerts.push({
          kind: "goal",
          severity: "warning",
          message: `${goal.name} needs more than your planned contribution to hit its date.`,
        });
      }
    }

    const recentTransactions = [...transactions]
      .sort((a, b) => b.date - a.date || b.createdAt - a.createdAt)
      .slice(0, 8)
      .map((t) => ({
        _id: t._id,
        date: t.date,
        description: t.description,
        amount: t.amount,
        direction: t.direction,
        category: t.category,
        accountName: accountNames.get(t.accountId) ?? "Removed account",
      }));

    return {
      period,
      hasData: accounts.length > 0,
      generatedAt: now,
      cards: {
        netWorth,
        assets,
        liabilities,
        cash,
        bank: sumKinds(bankKinds),
        mpesa,
        investments: invested,
        totalDebt,
        income,
        expenses,
        savings: monthlySavings,
        savingsRate,
        budgetRemaining,
        upcomingBillsTotal: upcomingBills.reduce((s, b) => s + b.amount, 0),
        debtPaymentsMonthly,
        changes: {
          income: pctChange(income, prevIncome),
          expenses: pctChange(expenses, prevExpenses),
          netWorth: null as number | null,
        },
      },
      spendingByCategory: spendingByCategory.slice(0, 8),
      incomeBySource: incomeBySource.slice(0, 8),
      cashflow,
      budgets: budgetRows,
      upcomingBills,
      goals: goalRows,
      debts: {
        total: totalDebt,
        monthly: debtPaymentsMonthly,
        count: activeDebts.length,
        top: activeDebts
          .sort((a, b) => b.outstandingBalance - a.outstandingBalance)
          .slice(0, 3)
          .map((d) => ({ _id: d._id, name: d.name, outstandingBalance: d.outstandingBalance })),
      },
      investments: { total: invested, estimatedReturn30 },
      alerts: alerts.slice(0, 5),
      recentTransactions,
    };
  },
});
