import { v } from "convex/values";
import { query } from "./_generated/server";
import { balancesByAccount } from "./accounts";
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

export const DEFAULT_WINDOW_DAYS = 30;

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
      else moneyOut30 += transaction.amount;
    }

    const openAccounts = accounts.filter((account) => !account.archived);
    const accountRows = openAccounts
      .sort((a, b) => {
        // Liabilities last so the main list reads net-worth first.
        const aCredit = a.kind === "credit" ? 1 : 0;
        const bCredit = b.kind === "credit" ? 1 : 0;
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
      .filter((account) => account.kind !== "credit")
      .reduce((sum, account) => sum + account.balance, 0);
    const liabilities = accountRows
      .filter((account) => account.kind === "credit")
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
      direction: "in" | "out";
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
