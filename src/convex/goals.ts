import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { getViewer, requireViewer } from "./lib";

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

    const now = Date.now();
    const goals = await ctx.db
      .query("goals")
      .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
      .collect();

    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
      .collect();
    const accountNames = new Map(accounts.map((a) => [a._id, a.name]));

    // Saved amounts come from goal-tagged contributions in the ledger.
    const contributions = await ctx.db
      .query("transactions")
      .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
      .collect();

    const savedByGoal = new Map<string, number>();
    for (const goal of goals) {
      savedByGoal.set(goal._id, 0);
    }
    for (const transaction of contributions) {
      if (transaction.goalId && savedByGoal.has(transaction.goalId)) {
        // Contributions move money into savings: expenses tagged to a goal count.
        if (transaction.direction === "out") {
          savedByGoal.set(transaction.goalId, (savedByGoal.get(transaction.goalId) ?? 0) + transaction.amount);
        } else if (transaction.direction === "in") {
          savedByGoal.set(transaction.goalId, (savedByGoal.get(transaction.goalId) ?? 0) - transaction.amount);
        }
      }
    }

    return goals
      .filter((goal) => !goal.archived)
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((goal) => {
        const saved = savedByGoal.get(goal._id) ?? 0;
        const progressPct =
          goal.targetAmount > 0 ? Math.min(100, (saved / goal.targetAmount) * 100) : 0;
        const monthsLeft = goal.targetDate
          ? Math.max(
              0,
              Math.round((goal.targetDate - now) / (30.44 * 86_400_000)),
            )
          : null;
        const remaining = Math.max(0, goal.targetAmount - saved);
        const monthlyRequired =
          monthsLeft !== null && monthsLeft > 0 ? Math.ceil(remaining / monthsLeft) : remaining > 0 ? remaining : 0;
        const status: "completed" | "on_track" | "behind" = 
          saved >= goal.targetAmount
            ? "completed"
            : goal.targetDate && monthsLeft !== null && monthlyRequired > (goal.contributionAmount ?? 0) && goal.contributionAmount
              ? "behind"
              : "on_track";
        return {
          ...goal,
          accountName: goal.linkedAccountId
            ? accountNames.get(goal.linkedAccountId) ?? null
            : null,
          saved,
          remaining,
          progressPct,
          monthsLeft,
          monthlyRequired,
          status,
        };
      });
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    targetAmount: v.number(),
    targetDate: v.optional(v.number()),
    linkedAccountId: v.optional(v.id("accounts")),
    contributionAmount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const name = args.name.trim();
    if (name.length === 0) throw new ConvexError("Name the goal.");

    if (args.linkedAccountId) {
      const account = await ctx.db.get(args.linkedAccountId);
      if (!account || account.householdId !== viewer.householdId) {
        throw new ConvexError("Pick an account from your workspace.");
      }
    }

    return await ctx.db.insert("goals", {
      householdId: viewer.householdId,
      name: name.slice(0, 60),
      description: args.description?.trim().slice(0, 300) || undefined,
      targetAmount: assertAmount(args.targetAmount, "Target"),
      targetDate: args.targetDate,
      linkedAccountId: args.linkedAccountId,
      contributionAmount: args.contributionAmount
        ? assertAmount(args.contributionAmount, "Contribution")
        : undefined,
      archived: false,
      createdBy: viewer.userId,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    goalId: v.id("goals"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    targetAmount: v.optional(v.number()),
    targetDate: v.optional(v.number()),
    linkedAccountId: v.optional(v.id("accounts")),
    contributionAmount: v.optional(v.number()),
    archived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.householdId !== viewer.householdId) {
      throw new ConvexError("That goal is not in your workspace.");
    }
    const patch: Partial<Doc<"goals">> = {};
    if (args.name !== undefined) {
      const name = args.name.trim();
      if (name.length === 0) throw new ConvexError("Name the goal.");
      patch.name = name.slice(0, 60);
    }
    if (args.description !== undefined) {
      patch.description = args.description.trim().slice(0, 300) || undefined;
    }
    if (args.targetAmount !== undefined) {
      patch.targetAmount = assertAmount(args.targetAmount, "Target");
    }
    if (args.targetDate !== undefined) patch.targetDate = args.targetDate;
    if (args.linkedAccountId !== undefined) patch.linkedAccountId = args.linkedAccountId || undefined;
    if (args.contributionAmount !== undefined) {
      patch.contributionAmount =
        args.contributionAmount > 0 ? assertAmount(args.contributionAmount, "Contribution") : undefined;
    }
    if (args.archived !== undefined) patch.archived = args.archived;
    await ctx.db.patch(args.goalId, patch);
  },
});

/** Record a contribution as a real ledger transaction tagged to the goal. */
export const contribute = mutation({
  args: {
    goalId: v.id("goals"),
    accountId: v.id("accounts"),
    amount: v.number(),
    date: v.optional(v.number()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.householdId !== viewer.householdId) {
      throw new ConvexError("That goal is not in your workspace.");
    }
    const account = await ctx.db.get(args.accountId);
    if (!account || account.householdId !== viewer.householdId) {
      throw new ConvexError("Pick an account from your workspace.");
    }
    const amount = assertAmount(args.amount, "Contribution");

    const transactionId = await ctx.db.insert("transactions", {
      householdId: viewer.householdId,
      accountId: args.accountId,
      direction: "out",
      amount,
      description: args.note?.trim().slice(0, 80) || `Savings — ${goal.name}`,
      category: "Savings",
      date: args.date ?? Date.now(),
      createdBy: viewer.userId,
      createdAt: Date.now(),
      goalId: goal._id,
      status: "cleared",
    });

    const saved = await ctx.db
      .query("transactions")
      .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
      .collect()
      .then((rows) =>
        rows
          .filter((t) => t.goalId === goal._id && t.direction === "out")
          .reduce((sum, t) => sum + t.amount, 0),
      );

    if (saved >= goal.targetAmount && !goal.completedAt) {
      await ctx.db.patch(goal._id, { completedAt: Date.now() });
    }

    return transactionId;
  },
});

export const remove = mutation({
  args: { goalId: v.id("goals") },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.householdId !== viewer.householdId) {
      throw new ConvexError("That goal is not in your workspace.");
    }
    // Keep history: contributions stay in the ledger, just untagged.
    const contributions = await ctx.db
      .query("transactions")
      .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
      .collect();
    for (const transaction of contributions) {
      if (transaction.goalId === args.goalId) {
        await ctx.db.patch(transaction._id, { goalId: undefined });
      }
    }
    await ctx.db.delete(args.goalId);
  },
});
