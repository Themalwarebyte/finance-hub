import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getViewer, requireViewer } from "./lib";
import { accountKindValidator } from "./schema";

const MAX_CENTS = 1_000_000_00_000; // $1B guard against typos

function assertAmount(cents: number, field = "Balance") {
  if (!Number.isFinite(cents)) throw new ConvexError(`${field} is not a number.`);
  if (Math.abs(cents) > MAX_CENTS) throw new ConvexError(`${field} looks too large.`);
  return Math.round(cents);
}

/** Live balance for each account: opening balance plus every transaction. */
export function balancesByAccount(
  accounts: Doc<"accounts">[],
  transactions: Doc<"transactions">[],
): Map<Id<"accounts">, number> {
  const balances = new Map<Id<"accounts">, number>();
  for (const account of accounts) {
    balances.set(account._id, account.openingBalance);
  }
  for (const transaction of transactions) {
    if (!balances.has(transaction.accountId)) continue;
    const current = balances.get(transaction.accountId) ?? 0;
    balances.set(
      transaction.accountId,
      current + (transaction.direction === "in" ? transaction.amount : -transaction.amount),
    );
  }
  return balances;
}

export const list = query({
  args: { includeArchived: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    if (!viewer) return [];

    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
      .collect();

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
      .collect();

    const balances = balancesByAccount(accounts, transactions);

    return accounts
      .filter((account) => args.includeArchived || !account.archived)
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((account) => ({ ...account, balance: balances.get(account._id) ?? 0 }));
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    kind: accountKindValidator,
    institution: v.optional(v.string()),
    openingBalance: v.number(),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const name = args.name.trim();
    if (name.length === 0) throw new ConvexError("Name the account.");

    return await ctx.db.insert("accounts", {
      householdId: viewer.householdId,
      name: name.slice(0, 60),
      kind: args.kind,
      institution: args.institution?.trim() || undefined,
      openingBalance: assertAmount(args.openingBalance),
      color: args.color ?? "teal",
      archived: false,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    accountId: v.id("accounts"),
    name: v.optional(v.string()),
    kind: v.optional(accountKindValidator),
    institution: v.optional(v.string()),
    openingBalance: v.optional(v.number()),
    color: v.optional(v.string()),
    archived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const account = await ctx.db.get(args.accountId);
    if (!account || account.householdId !== viewer.householdId) {
      throw new ConvexError("That account is not in your workspace.");
    }

    const patch: Partial<Doc<"accounts">> = {};
    if (args.name !== undefined) {
      const name = args.name.trim();
      if (name.length === 0) throw new ConvexError("Name the account.");
      patch.name = name.slice(0, 60);
    }
    if (args.kind !== undefined) patch.kind = args.kind;
    if (args.institution !== undefined) {
      patch.institution = args.institution.trim() || undefined;
    }
    if (args.openingBalance !== undefined) {
      patch.openingBalance = assertAmount(args.openingBalance);
    }
    if (args.color !== undefined) patch.color = args.color;
    if (args.archived !== undefined) patch.archived = args.archived;

    await ctx.db.patch(args.accountId, patch);
  },
});

export const remove = mutation({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const account = await ctx.db.get(args.accountId);
    if (!account || account.householdId !== viewer.householdId) {
      throw new ConvexError("That account is not in your workspace.");
    }

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
      .collect();
    for (const transaction of transactions) {
      await ctx.db.delete(transaction._id);
    }

    const recurring = await ctx.db
      .query("recurring")
      .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
      .collect();
    for (const item of recurring) {
      if (item.accountId === args.accountId) await ctx.db.delete(item._id);
    }

    await ctx.db.delete(args.accountId);
  },
});
