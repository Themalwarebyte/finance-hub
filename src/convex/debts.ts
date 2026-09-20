import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { getViewer, requireViewer } from "./lib";
import { debtTypeValidator, frequencyValidator } from "./schema";
import { amortize, totalInterest } from "./periods";

const MAX_CENTS = 1_000_000_00_000;

function assertAmount(cents: number, field = "Amount"): number {
  const rounded = Math.round(cents);
  if (!Number.isFinite(rounded) || rounded <= 0) {
    throw new ConvexError(`Enter a ${field.toLowerCase()} greater than zero.`);
  }
  if (rounded > MAX_CENTS) throw new ConvexError(`That ${field.toLowerCase()} looks too large.`);
  return rounded;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await getViewer(ctx);
    if (!viewer) return [];

    const debts = await ctx.db
      .query("debts")
      .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
      .collect();

    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
      .collect();
    const accountNames = new Map(accounts.map((a) => [a._id, a.name]));

    // Payment history comes from debt-tagged transactions in the ledger.
    const payments = await ctx.db
      .query("transactions")
      .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
      .collect();

    const rows = debts
      .filter((debt) => !debt.archived)
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((debt) => {
        const debtPayments = payments.filter((t) => t.debtId === debt._id && t.direction === "out");
        const principalPaid = debtPayments.reduce(
          (sum, t) => sum + Math.max(0, t.amount - (t.interestPortion ?? 0)),
          0,
        );
        const interestPaid = debtPayments.reduce((sum, t) => sum + (t.interestPortion ?? 0), 0);
        const paidPct =
          debt.originalAmount > 0
            ? Math.min(100, ((debt.originalAmount - debt.outstandingBalance) / debt.originalAmount) * 100)
            : 0;

        // Payoff projection from the actual balance, rate and payment.
        const schedule = amortize(
          debt.outstandingBalance,
          debt.interestRatePct ?? 0,
          debt.monthlyPayment,
        );
        const monthsLeft = schedule.length;
        const interestRemaining = totalInterest(schedule);
        const payoffDate =
          monthsLeft > 0 && monthsLeft < 720
            ? Date.now() + monthsLeft * 30.44 * 86_400_000
            : null;

        return {
          ...debt,
          accountName: debt.linkedAccountId
            ? accountNames.get(debt.linkedAccountId) ?? null
            : null,
          principalPaid,
          interestPaid,
          paidPct,
          monthsLeft,
          interestRemaining,
          payoffDate,
          paymentCount: debtPayments.length,
        };
      });

    const totalOutstanding = rows.reduce((sum, d) => sum + d.outstandingBalance, 0);
    const totalMonthly = rows.reduce((sum, d) => sum + d.monthlyPayment, 0);

    return {
      debts: rows,
      totals: { totalOutstanding, totalMonthly, count: rows.length },
    };
  },
});

/** Compare snowball (smallest balance first) and avalanche (highest rate first). */
export const strategies = query({
  args: { extraMonthly: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    if (!viewer) return null;

    const extra = Math.max(0, Math.round(args.extraMonthly ?? 0));
    const debts = await ctx.db
      .query("debts")
      .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
      .collect();
    const active = debts.filter((d) => !d.archived && d.outstandingBalance > 0);

    const simulate = (order: Doc<"debts">[]) => {
      // Work on copies so nothing mutates real records.
      const state = order.map((d) => ({
        id: d._id,
        name: d.name,
        balance: d.outstandingBalance,
        rate: d.interestRatePct ?? 0,
        minPayment: d.monthlyPayment,
        interestPaid: 0,
        monthsToFree: 0,
      }));
      let month = 0;
      let totalInterest = 0;
      const freedOrder: string[] = [];

      while (state.some((s) => s.balance > 0) && month < 720) {
        month += 1;
        // freed debts roll their payment into the extra pool.
        let pool = extra;
        for (const item of state) {
          if (item.balance <= 0) continue;
          const monthlyRate = item.rate / 100 / 12;
          const interest = Math.round(item.balance * monthlyRate);
          let payment = item.minPayment;
          const available = payment + pool;
          let principal = available - interest;
          if (principal <= 0) {
            item.interestPaid += interest;
            item.balance += -principal; // balance grows
            pool = 0;
            continue;
          }
          if (principal >= item.balance) {
            principal = item.balance;
            pool = available - interest - principal;
          } else {
            pool = 0;
          }
          item.balance -= principal;
          item.interestPaid += interest;
          if (item.balance <= 0) {
            item.monthsToFree = month;
            freedOrder.push(item.name);
          }
        }
        totalInterest = state.reduce((sum, s) => sum + 0, 0); // recomputed below
      }
      totalInterest = state.reduce((sum, s) => sum + s.interestPaid, 0);
      const months = Math.max(0, ...state.map((s) => s.monthsToFree));
      return { order: freedOrder, months, totalInterest };
    };

    const byBalance = [...active].sort((a, b) => a.outstandingBalance - b.outstandingBalance);
    const byRate = [...active].sort((a, b) => (b.interestRatePct ?? 0) - (a.interestRatePct ?? 0));

    const snowball = simulate(byBalance);
    const avalanche = simulate(byRate);

    const baseline = simulate(byBalance.map((d) => ({ ...d, monthlyPayment: d.monthlyPayment } as Doc<"debts">)));

    return { extra, snowball, avalanche, baseline, debtCount: active.length };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    type: debtTypeValidator,
    lender: v.optional(v.string()),
    originalAmount: v.number(),
    outstandingBalance: v.number(),
    interestRatePct: v.optional(v.number()),
    monthlyPayment: v.number(),
    paymentFrequency: v.optional(frequencyValidator),
    nextDueDate: v.optional(v.number()),
    startDate: v.optional(v.number()),
    linkedAccountId: v.optional(v.id("accounts")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const name = args.name.trim();
    if (name.length === 0) throw new ConvexError("Name the debt.");

    if (args.linkedAccountId) {
      const account = await ctx.db.get(args.linkedAccountId);
      if (!account || account.householdId !== viewer.householdId) {
        throw new ConvexError("Pick an account from your workspace.");
      }
    }

    return await ctx.db.insert("debts", {
      householdId: viewer.householdId,
      name: name.slice(0, 60),
      type: args.type,
      lender: args.lender?.trim().slice(0, 60) || undefined,
      originalAmount: assertAmount(args.originalAmount, "Original amount"),
      outstandingBalance: assertAmount(args.outstandingBalance, "Balance"),
      interestRatePct: args.interestRatePct,
      monthlyPayment: assertAmount(args.monthlyPayment, "Monthly payment"),
      paymentFrequency: args.paymentFrequency ?? "monthly",
      nextDueDate: args.nextDueDate,
      startDate: args.startDate,
      linkedAccountId: args.linkedAccountId,
      notes: args.notes?.trim().slice(0, 500) || undefined,
      archived: false,
      createdBy: viewer.userId,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    debtId: v.id("debts"),
    name: v.optional(v.string()),
    lender: v.optional(v.string()),
    outstandingBalance: v.optional(v.number()),
    interestRatePct: v.optional(v.number()),
    monthlyPayment: v.optional(v.number()),
    nextDueDate: v.optional(v.number()),
    notes: v.optional(v.string()),
    archived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const debt = await ctx.db.get(args.debtId);
    if (!debt || debt.householdId !== viewer.householdId) {
      throw new ConvexError("That debt is not in your workspace.");
    }
    const patch: Partial<Doc<"debts">> = {};
    if (args.name !== undefined) {
      const name = args.name.trim();
      if (name.length === 0) throw new ConvexError("Name the debt.");
      patch.name = name.slice(0, 60);
    }
    if (args.lender !== undefined) patch.lender = args.lender.trim().slice(0, 60) || undefined;
    if (args.outstandingBalance !== undefined) {
      patch.outstandingBalance = assertAmount(args.outstandingBalance, "Balance");
    }
    if (args.interestRatePct !== undefined) patch.interestRatePct = args.interestRatePct;
    if (args.monthlyPayment !== undefined) {
      patch.monthlyPayment = assertAmount(args.monthlyPayment, "Monthly payment");
    }
    if (args.nextDueDate !== undefined) patch.nextDueDate = args.nextDueDate;
    if (args.notes !== undefined) patch.notes = args.notes.trim().slice(0, 500) || undefined;
    if (args.archived !== undefined) patch.archived = args.archived;
    await ctx.db.patch(args.debtId, patch);
  },
});

/** Record a payment as a real ledger transaction and reduce the balance. */
export const pay = mutation({
  args: {
    debtId: v.id("debts"),
    accountId: v.id("accounts"),
    amount: v.number(),
    interestPortion: v.optional(v.number()),
    date: v.optional(v.number()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const debt = await ctx.db.get(args.debtId);
    if (!debt || debt.householdId !== viewer.householdId) {
      throw new ConvexError("That debt is not in your workspace.");
    }
    const account = await ctx.db.get(args.accountId);
    if (!account || account.householdId !== viewer.householdId) {
      throw new ConvexError("Pick an account from your workspace.");
    }
    const amount = assertAmount(args.amount, "Payment");
    const interestPortion = Math.max(0, Math.min(amount, Math.round(args.interestPortion ?? 0)));

    const transactionId = await ctx.db.insert("transactions", {
      householdId: viewer.householdId,
      accountId: args.accountId,
      direction: "out",
      amount,
      description: args.note?.trim().slice(0, 80) || `Debt payment — ${debt.name}`,
      category: "Debt Payments",
      date: args.date ?? Date.now(),
      createdBy: viewer.userId,
      createdAt: Date.now(),
      debtId: debt._id,
      interestPortion: interestPortion > 0 ? interestPortion : undefined,
      status: "cleared",
    });

    // Reduce the tracked balance by the principal actually paid.
    const principal = amount - interestPortion;
    const newBalance = Math.max(0, debt.outstandingBalance - principal);
    await ctx.db.patch(debt._id, {
      outstandingBalance: newBalance,
      nextDueDate: debt.nextDueDate ? debt.nextDueDate + 30.44 * 86_400_000 : undefined,
    });

    return { transactionId, newBalance };
  },
});

export const remove = mutation({
  args: { debtId: v.id("debts") },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const debt = await ctx.db.get(args.debtId);
    if (!debt || debt.householdId !== viewer.householdId) {
      throw new ConvexError("That debt is not in your workspace.");
    }
    // Keep payment history in the ledger, just untag it.
    const payments = await ctx.db
      .query("transactions")
      .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
      .collect();
    for (const transaction of payments) {
      if (transaction.debtId === args.debtId) {
        await ctx.db.patch(transaction._id, { debtId: undefined });
      }
    }
    await ctx.db.delete(args.debtId);
  },
});
