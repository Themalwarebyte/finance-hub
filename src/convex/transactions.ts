import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getViewer, requireViewer } from "./lib";
import { directionValidator } from "./schema";

const MAX_CENTS = 1_000_000_00_000;

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    if (!viewer) return [];

    const limit = Math.min(Math.max(args.limit ?? 60, 1), 200);

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
      .order("desc")
      .take(limit);

    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
      .collect();
    const accountNames = new Map(accounts.map((a) => [a._id, a.name]));

    return transactions.map((transaction) => ({
      ...transaction,
      accountName: accountNames.get(transaction.accountId) ?? "Removed account",
    }));
  },
});

export const create = mutation({
  args: {
    accountId: v.id("accounts"),
    direction: directionValidator,
    amount: v.number(),
    description: v.string(),
    category: v.string(),
    date: v.number(),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);

    const account = await ctx.db.get(args.accountId);
    if (!account || account.householdId !== viewer.householdId) {
      throw new ConvexError("Pick an account from your workspace.");
    }

    const amount = Math.round(args.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new ConvexError("Enter an amount greater than zero.");
    }
    if (amount > MAX_CENTS) throw new ConvexError("That amount looks too large.");

    const description = args.description.trim();
    if (description.length === 0) throw new ConvexError("Add a short description.");

    return await ctx.db.insert("transactions", {
      householdId: viewer.householdId,
      accountId: args.accountId,
      direction: args.direction,
      amount,
      description: description.slice(0, 80),
      category: args.category.trim().slice(0, 40) || "Uncategorised",
      date: args.date,
      createdBy: viewer.userId,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { transactionId: v.id("transactions") },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const transaction = await ctx.db.get(args.transactionId);
    if (!transaction || transaction.householdId !== viewer.householdId) {
      throw new ConvexError("That entry is not in your workspace.");
    }
    await ctx.db.delete(args.transactionId);
  },
});
