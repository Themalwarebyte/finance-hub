import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { getViewer, requireViewer } from "./lib";
import { budgetPeriodValidator } from "./schema";
import { monthRange } from "./periods";

const MAX_CENTS = 1_000_000_00_000;

function assertAmount(cents: number, field = "Amount"): number {
  const rounded = Math.round(cents);
  if (!Number.isFinite(rounded) || rounded <= 0) {
    throw new ConvexError(`Enter a ${field.toLowerCase()} greater than zero.`);
  }
  if (rounded > MAX_CENTS) throw new ConvexError(`That ${field.toLowerCase()} looks too large.`);
  return rounded;
}

/** Remaining days in the period containing `now`, minimum 1. */
function daysLeft(periodEnd: number, now: number): number {
  return Math.max(1, Math.ceil((periodEnd - now) / 86_400_000));
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await getViewer(ctx);
    if (!viewer) return [];

    const now = Date.now();
    const budgets = await ctx.db
      .query("budgets")
      .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
      .collect();

    const active = budgets.filter((b) => b.active);
    if (active.length === 0) return [];

    // Analyse real spending inside each budget's current period.
    const ranges = new Map<string, { start: number; end: number }>();
    for (const budget of active) {
      const range =
        budget.period === "custom" && budget.endDate
          ? { start: budget.startDate, end: budget.endDate }
          : monthRange(now);
      ranges.set(budget._id, range);
    }

    const earliest = Math.min(...Array.from(ranges.values()).map((r) => r.start));
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_household", (q) =>
        q.eq("householdId", viewer.householdId).gte("date", earliest),
      )
      .collect();

    return active
      .map((budget) => {
        const range = ranges.get(budget._id)!;
        const spent = transactions
          .filter(
            (t) =>
              t.direction === "out" &&
              t.category === budget.category &&
              (!budget.subcategory || t.subcategory === budget.subcategory) &&
              t.date >= range.start &&
              t.date < range.end,
          )
          .reduce((sum, t) => sum + t.amount, 0);
        const withRollover = spent + (budget.rolloverCents ?? 0);
        const remaining = budget.amount - withRollover;
        const usedPct = budget.amount > 0 ? (withRollover / budget.amount) * 100 : 0;
        const days = daysLeft(range.end, now);
        const dailyPace = spent / Math.max(1, Math.round((now - range.start) / 86_400_000));
        const projected = Math.round(dailyPace * Math.ceil((range.end - range.start) / 86_400_000));
        return {
          ...budget,
          periodStart: range.start,
          periodEnd: range.end,
          spent,
          carriedIn: budget.rolloverCents ?? 0,
          totalBudget: budget.amount,
          remaining,
          usedPct,
          daysRemaining: days,
          projected,
          overBudget: remaining < 0,
          nearLimit: !budget.subcategory && usedPct >= 80 && usedPct < 100,
        };
      })
      .sort((a, b) => b.usedPct - a.usedPct);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    subcategory: v.optional(v.string()),
    period: budgetPeriodValidator,
    amount: v.number(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    rollover: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const name = args.name.trim();
    if (name.length === 0) throw new ConvexError("Name the budget.");
    if (args.period === "custom" && (!args.startDate || !args.endDate)) {
      throw new ConvexError("Custom budgets need a start and end date.");
    }

    const now = Date.now();
    const periodStart = args.startDate ?? monthRange(now).start;

    return await ctx.db.insert("budgets", {
      householdId: viewer.householdId,
      name: name.slice(0, 60),
      category: args.category.trim().slice(0, 40),
      subcategory: args.subcategory?.trim().slice(0, 40) || undefined,
      period: args.period,
      amount: assertAmount(args.amount, "Budget"),
      startDate: periodStart,
      endDate: args.endDate,
      rollover: args.rollover ?? false,
      rolloverCents: 0,
      active: true,
      createdBy: viewer.userId,
      createdAt: now,
    });
  },
});

export const update = mutation({
  args: {
    budgetId: v.id("budgets"),
    name: v.optional(v.string()),
    amount: v.optional(v.number()),
    rollover: v.optional(v.boolean()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const budget = await ctx.db.get(args.budgetId);
    if (!budget || budget.householdId !== viewer.householdId) {
      throw new ConvexError("That budget is not in your workspace.");
    }
    const patch: Partial<Doc<"budgets">> = {};
    if (args.name !== undefined) {
      const name = args.name.trim();
      if (name.length === 0) throw new ConvexError("Name the budget.");
      patch.name = name.slice(0, 60);
    }
    if (args.amount !== undefined) patch.amount = assertAmount(args.amount, "Budget");
    if (args.rollover !== undefined) patch.rollover = args.rollover;
    if (args.active !== undefined) patch.active = args.active;
    await ctx.db.patch(args.budgetId, patch);
  },
});

export const remove = mutation({
  args: { budgetId: v.id("budgets") },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const budget = await ctx.db.get(args.budgetId);
    if (!budget || budget.householdId !== viewer.householdId) {
      throw new ConvexError("That budget is not in your workspace.");
    }
    await ctx.db.delete(args.budgetId);
  },
});

/** Copy every monthly budget from last month into the current month. */
export const copyPrevious = mutation({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireViewer(ctx);
    const now = Date.now();
    const thisMonth = monthRange(now);
    const lastMonth = monthRange(thisMonth.start - 1);

    const budgets = await ctx.db
      .query("budgets")
      .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
      .collect();

    // Budgets are re-anchored each month by period; copying creates fresh ones
    // only for categories that don't already have a budget this month.
    const existingCategories = new Set(
      budgets.filter((b) => b.active && b.period !== "custom").map((b) => b.category),
    );

    const previousMonthBudgets = budgets.filter(
      (b) => b.period === "monthly" && b.active && !existingCategories.has(b.category),
    );

    let copied = 0;
    for (const budget of previousMonthBudgets) {
      await ctx.db.insert("budgets", {
        householdId: viewer.householdId,
        name: budget.name,
        category: budget.category,
        subcategory: budget.subcategory,
        period: "monthly",
        amount: budget.amount,
        startDate: thisMonth.start,
        rollover: budget.rollover,
        rolloverCents: 0,
        active: true,
        createdBy: viewer.userId,
        createdAt: now,
      });
      copied += 1;
    }
    void lastMonth;
    return copied;
  },
});
