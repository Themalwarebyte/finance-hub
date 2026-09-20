import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getViewer, requireViewer } from "./lib";
import { accountKindValidator, returnBasisValidator } from "./schema";

const MAX_CENTS = 1_000_000_00_000; // $1B guard against typos

function assertAmount(cents: number, field = "Balance") {
  if (!Number.isFinite(cents)) throw new ConvexError(`${field} is not a number.`);
  if (Math.abs(cents) > MAX_CENTS) throw new ConvexError(`${field} looks too large.`);
  return Math.round(cents);
}

/** Return estimates live between -100% and +100% per period. */
function assertReturnPct(pct: number) {
  if (!Number.isFinite(pct)) throw new ConvexError("Return estimate is not a number.");
  if (Math.abs(pct) > 100) {
    throw new ConvexError("Return estimate must be between -100% and 100%.");
  }
}

/** Account kinds that represent money you owe rather than money you hold. */
export function isLiabilityKind(kind: Doc<"accounts">["kind"]): boolean {
  return kind === "credit" || kind === "loan" || kind === "mortgage";
}

/**
 * Live balance for each account: opening balance plus every transaction.
 * Transfers move money between two accounts without touching income/expense.
 */
export function balancesByAccount(
  accounts: Doc<"accounts">[],
  transactions: Doc<"transactions">[],
): Map<Id<"accounts">, number> {
  const balances = new Map<Id<"accounts">, number>();
  for (const account of accounts) {
    balances.set(account._id, account.openingBalance);
  }
  const apply = (accountId: Id<"accounts"> | undefined, delta: number) => {
    if (!accountId) return;
    if (!balances.has(accountId)) return;
    balances.set(accountId, (balances.get(accountId) ?? 0) + delta);
  };
  for (const transaction of transactions) {
    if (transaction.direction === "transfer") {
      apply(transaction.accountId, -transaction.amount);
      apply(transaction.transferAccountId, transaction.amount);
    } else {
      apply(
        transaction.accountId,
        transaction.direction === "in" ? transaction.amount : -transaction.amount,
      );
    }
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
    estimatedReturnPct: v.optional(v.number()),
    returnBasis: v.optional(returnBasisValidator),
    reference: v.optional(v.string()),
    notes: v.optional(v.string()),
    currency: v.optional(v.string()),
    includeInNetWorth: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const name = args.name.trim();
    if (name.length === 0) throw new ConvexError("Name the account.");

    if (args.estimatedReturnPct !== undefined) {
      assertReturnPct(args.estimatedReturnPct);
    }

    return await ctx.db.insert("accounts", {
      householdId: viewer.householdId,
      name: name.slice(0, 60),
      kind: args.kind,
      institution: args.institution?.trim() || undefined,
      openingBalance: assertAmount(args.openingBalance),
      color: args.color ?? "teal",
      archived: false,
      estimatedReturnPct: args.estimatedReturnPct,
      returnBasis: args.returnBasis,
      reference: args.reference?.trim().slice(0, 60) || undefined,
      notes: args.notes?.trim().slice(0, 500) || undefined,
      currency: args.currency?.trim().toUpperCase().slice(0, 3) || undefined,
      includeInNetWorth: args.includeInNetWorth ?? true,
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
    estimatedReturnPct: v.optional(v.number()),
    returnBasis: v.optional(returnBasisValidator),
    reference: v.optional(v.string()),
    notes: v.optional(v.string()),
    currency: v.optional(v.string()),
    includeInNetWorth: v.optional(v.boolean()),
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
    if (args.estimatedReturnPct !== undefined) {
      assertReturnPct(args.estimatedReturnPct);
      patch.estimatedReturnPct = args.estimatedReturnPct;
      patch.returnBasis = args.returnBasis;
    } else if (args.returnBasis !== undefined) {
      patch.returnBasis = args.returnBasis;
    }
    if (args.reference !== undefined) {
      patch.reference = args.reference.trim().slice(0, 60) || undefined;
    }
    if (args.notes !== undefined) {
      patch.notes = args.notes.trim().slice(0, 500) || undefined;
    }
    if (args.currency !== undefined) {
      patch.currency = args.currency.trim().toUpperCase().slice(0, 3) || undefined;
    }
    if (args.includeInNetWorth !== undefined) {
      patch.includeInNetWorth = args.includeInNetWorth;
    }

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

    // Detach goals and debts pointing at this account instead of deleting them.
    const goals = await ctx.db
      .query("goals")
      .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
      .collect();
    for (const goal of goals) {
      if (goal.linkedAccountId === args.accountId) {
        await ctx.db.patch(goal._id, { linkedAccountId: undefined });
      }
    }
    const debts = await ctx.db
      .query("debts")
      .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
      .collect();
    for (const debt of debts) {
      if (debt.linkedAccountId === args.accountId) {
        await ctx.db.patch(debt._id, { linkedAccountId: undefined });
      }
    }

    await ctx.db.delete(args.accountId);
  },
});
