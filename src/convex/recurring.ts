import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getViewer, requireViewer } from "./lib";
import { directionValidator, frequencyValidator } from "./schema";

const MAX_CENTS = 1_000_000_00_000;

export const list = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await getViewer(ctx);
    if (!viewer) return [];

    const items = await ctx.db
      .query("recurring")
      .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
      .collect();

    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
      .collect();
    const accountNames = new Map(accounts.map((a) => [a._id, a.name]));

    return items
      .sort((a, b) => a.nextDate - b.nextDate)
      .map((item) => ({
        ...item,
        accountName: accountNames.get(item.accountId) ?? "Removed account",
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
    frequency: frequencyValidator,
    nextDate: v.number(),
    endDate: v.optional(v.number()),
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

    return await ctx.db.insert("recurring", {
      householdId: viewer.householdId,
      accountId: args.accountId,
      direction: args.direction,
      amount,
      description: description.slice(0, 80),
      category: args.category.trim().slice(0, 40) || "Uncategorised",
      frequency: args.frequency,
      nextDate: args.nextDate,
      endDate: args.endDate,
      active: true,
      createdAt: Date.now(),
    });
  },
});

export const setActive = mutation({
  args: { recurringId: v.id("recurring"), active: v.boolean() },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const item = await ctx.db.get(args.recurringId);
    if (!item || item.householdId !== viewer.householdId) {
      throw new ConvexError("That scheduled item is not in your workspace.");
    }
    await ctx.db.patch(args.recurringId, { active: args.active });
  },
});

export const remove = mutation({
  args: { recurringId: v.id("recurring") },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const item = await ctx.db.get(args.recurringId);
    if (!item || item.householdId !== viewer.householdId) {
      throw new ConvexError("That scheduled item is not in your workspace.");
    }
    await ctx.db.delete(args.recurringId);
  },
});
