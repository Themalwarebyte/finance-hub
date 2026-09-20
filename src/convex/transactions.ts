import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getViewer, requireViewer } from "./lib";
import { directionValidator } from "./schema";

const MAX_CENTS = 1_000_000_00_000; // $1B guard against typos

function assertAmount(cents: number): number {
  const rounded = Math.round(cents);
  if (!Number.isFinite(rounded) || rounded <= 0) {
    throw new ConvexError("Enter an amount greater than zero.");
  }
  if (rounded > MAX_CENTS) throw new ConvexError("That amount looks too large.");
  return rounded;
}

export const list = query({
  args: {
    limit: v.optional(v.number()),
    accountId: v.optional(v.id("accounts")),
    category: v.optional(v.string()),
    direction: v.optional(directionValidator),
    status: v.optional(v.union(v.literal("cleared"), v.literal("pending"))),
    tag: v.optional(v.string()),
    search: v.optional(v.string()),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    if (!viewer) return [];

    const limit = Math.min(Math.max(args.limit ?? 60, 1), 500);

    let transactions: Doc<"transactions">[];
    if (args.dateFrom !== undefined || args.dateTo !== undefined) {
      const from = args.dateFrom ?? 0;
      const to = args.dateTo ?? Number.MAX_SAFE_INTEGER;
      transactions = await ctx.db
        .query("transactions")
        .withIndex("by_household", (q) =>
          q.eq("householdId", viewer.householdId).gte("date", from).lt("date", to),
        )
        .collect();
    } else {
      transactions = await ctx.db
        .query("transactions")
        .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
        .order("desc")
        .take(Math.min(limit * 4, 500));
    }

    const searchLower = args.search?.trim().toLowerCase();
    const filtered = transactions
      .filter((t) => args.direction === undefined || t.direction === args.direction)
      .filter((t) => args.category === undefined || t.category === args.category)
      .filter((t) => args.status === undefined || (t.status ?? "cleared") === args.status)
      .filter(
        (t) =>
          args.accountId === undefined ||
          t.accountId === args.accountId ||
          t.transferAccountId === args.accountId,
      )
      .filter((t) => args.tag === undefined || (t.tags ?? []).includes(args.tag!))
      .filter((t) => {
        if (!searchLower) return true;
        const haystack = [t.description, t.merchant ?? "", t.category, t.subcategory ?? "", (t.tags ?? []).join(" ")]
          .join(" ")
          .toLowerCase();
        return haystack.includes(searchLower);
      })
      .sort((a, b) => b.date - a.date)
      .slice(0, limit);

    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
      .collect();
    const accountNames = new Map(accounts.map((a) => [a._id, a.name]));

    return filtered.map((transaction) => ({
      ...transaction,
      accountName: accountNames.get(transaction.accountId) ?? "Removed account",
      transferAccountName: transaction.transferAccountId
        ? accountNames.get(transaction.transferAccountId) ?? "Removed account"
        : null,
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
    transferAccountId: v.optional(v.id("accounts")),
    subcategory: v.optional(v.string()),
    merchant: v.optional(v.string()),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    paymentMethod: v.optional(v.string()),
    goalId: v.optional(v.id("goals")),
    debtId: v.optional(v.id("debts")),
    interestPortion: v.optional(v.number()),
    status: v.optional(v.union(v.literal("cleared"), v.literal("pending"))),
    recurringId: v.optional(v.id("recurring")),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const amount = assertAmount(args.amount);

    const account = await ctx.db.get(args.accountId);
    if (!account || account.householdId !== viewer.householdId) {
      throw new ConvexError("Pick an account from your workspace.");
    }

    const description = args.description.trim();
    if (description.length === 0) throw new ConvexError("Add a short description.");

    let transferAccountId: Id<"accounts"> | undefined;
    if (args.direction === "transfer") {
      if (!args.transferAccountId) {
        throw new ConvexError("Transfers need a destination account.");
      }
      if (args.transferAccountId === args.accountId) {
        throw new ConvexError("Pick two different accounts for a transfer.");
      }
      const destination = await ctx.db.get(args.transferAccountId);
      if (!destination || destination.householdId !== viewer.householdId) {
        throw new ConvexError("Pick a destination account from your workspace.");
      }
      transferAccountId = args.transferAccountId;
      // Transfers never count as income or expense.
      if (args.category === "Income") {
        throw new ConvexError("Transfers cannot be categorised as Income.");
      }
    }

    return await ctx.db.insert("transactions", {
      householdId: viewer.householdId,
      accountId: args.accountId,
      direction: args.direction,
      amount,
      description: description.slice(0, 80),
      category: args.category.trim().slice(0, 40) || "Other",
      date: args.date,
      createdBy: viewer.userId,
      createdAt: Date.now(),
      transferAccountId,
      subcategory: args.subcategory?.trim().slice(0, 40) || undefined,
      merchant: args.merchant?.trim().slice(0, 80) || undefined,
      notes: args.notes?.trim().slice(0, 500) || undefined,
      tags: args.tags?.map((t) => t.trim().slice(0, 30)).filter(Boolean).slice(0, 8),
      paymentMethod: args.paymentMethod?.trim().slice(0, 40) || undefined,
      goalId: args.goalId,
      debtId: args.debtId,
      interestPortion: args.interestPortion,
      status: args.status ?? "cleared",
      recurringId: args.recurringId,
    });
  },
});

export const update = mutation({
  args: {
    transactionId: v.id("transactions"),
    amount: v.optional(v.number()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    subcategory: v.optional(v.string()),
    merchant: v.optional(v.string()),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    date: v.optional(v.number()),
    accountId: v.optional(v.id("accounts")),
    transferAccountId: v.optional(v.id("accounts")),
    status: v.optional(v.union(v.literal("cleared"), v.literal("pending"))),
    paymentMethod: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const transaction = await ctx.db.get(args.transactionId);
    if (!transaction || transaction.householdId !== viewer.householdId) {
      throw new ConvexError("That entry is not in your workspace.");
    }

    const patch: Partial<Doc<"transactions">> = {};
    if (args.amount !== undefined) patch.amount = assertAmount(args.amount);
    if (args.description !== undefined) {
      const description = args.description.trim();
      if (description.length === 0) throw new ConvexError("Add a short description.");
      patch.description = description.slice(0, 80);
    }
    if (args.category !== undefined) {
      patch.category = args.category.trim().slice(0, 40) || "Other";
    }
    if (args.subcategory !== undefined) {
      patch.subcategory = args.subcategory.trim().slice(0, 40) || undefined;
    }
    if (args.merchant !== undefined) {
      patch.merchant = args.merchant.trim().slice(0, 80) || undefined;
    }
    if (args.notes !== undefined) {
      patch.notes = args.notes.trim().slice(0, 500) || undefined;
    }
    if (args.tags !== undefined) {
      patch.tags = args.tags.map((t) => t.trim().slice(0, 30)).filter(Boolean).slice(0, 8);
    }
    if (args.date !== undefined) patch.date = args.date;
    if (args.accountId !== undefined) {
      const account = await ctx.db.get(args.accountId);
      if (!account || account.householdId !== viewer.householdId) {
        throw new ConvexError("Pick an account from your workspace.");
      }
      patch.accountId = args.accountId;
    }
    if (args.transferAccountId !== undefined) {
      if (transaction.direction === "transfer" && args.transferAccountId !== null) {
        const destination = await ctx.db.get(args.transferAccountId);
        if (!destination || destination.householdId !== viewer.householdId) {
          throw new ConvexError("Pick a destination account from your workspace.");
        }
      }
      patch.transferAccountId = args.transferAccountId || undefined;
    }
    if (args.status !== undefined) patch.status = args.status;
    if (args.paymentMethod !== undefined) {
      patch.paymentMethod = args.paymentMethod.trim().slice(0, 40) || undefined;
    }

    await ctx.db.patch(args.transactionId, patch);
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

/** Copy an existing entry to today — handy for repeated expenses. */
export const duplicate = mutation({
  args: { transactionId: v.id("transactions") },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const original = await ctx.db.get(args.transactionId);
    if (!original || original.householdId !== viewer.householdId) {
      throw new ConvexError("That entry is not in your workspace.");
    }

    const now = Date.now();
    const copy: Doc<"transactions"> = {
      ...original,
      _id: undefined as unknown as Id<"transactions">,
      _creationTime: 0,
      date: now,
      createdBy: viewer.userId,
      createdAt: now,
      status: "pending",
    };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, _creationTime, ...fields } = copy;
    return await ctx.db.insert("transactions", fields);
  },
});
