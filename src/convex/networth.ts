import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getViewer, requireViewer } from "./lib";
import { balancesByAccount, isLiabilityKind } from "./accounts";

/** Accounts + liabilities valued for net worth. Assets use live balances. */
export const summary = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await getViewer(ctx);
    if (!viewer) return null;

    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
      .collect();
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
      .collect();

    const balances = balancesByAccount(accounts, transactions);
    const open = accounts.filter((a) => !a.archived && a.includeInNetWorth !== false);

    const rows = open.map((account) => {
      const balance = balances.get(account._id) ?? 0;
      return {
        _id: account._id,
        name: account.name,
        kind: account.kind,
        institution: account.institution ?? null,
        color: account.color,
        balance,
        isLiability: isLiabilityKind(account.kind),
      };
    });

    const assets = rows
      .filter((row) => !row.isLiability)
      .reduce((sum, row) => sum + Math.max(0, row.balance), 0);
    const liabilities = rows
      .filter((row) => row.isLiability)
      .reduce((sum, row) => sum + Math.abs(Math.min(0, row.balance)), 0);

    return {
      netWorth: assets - liabilities,
      assets,
      liabilities,
      rows: rows.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance)),
    };
  },
});

/** Write a snapshot so the net-worth trend survives balance changes. */
export const snapshot = mutation({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireViewer(ctx);
    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
      .collect();
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
      .collect();

    const balances = balancesByAccount(accounts, transactions);
    const open = accounts.filter((a) => !a.archived && a.includeInNetWorth !== false);

    let assets = 0;
    let liabilities = 0;
    for (const account of open) {
      const balance = balances.get(account._id) ?? 0;
      if (isLiabilityKind(account.kind)) liabilities += Math.abs(Math.min(0, balance));
      else assets += Math.max(0, balance);
    }

    const dayStart = new Date();
    const date = new Date(
      dayStart.getFullYear(),
      dayStart.getMonth(),
      dayStart.getDate(),
    ).getTime();

    // One snapshot per day: overwrite today's if it exists.
    const existing = await ctx.db
      .query("netWorthSnapshots")
      .withIndex("by_household_date", (q) =>
        q.eq("householdId", viewer.householdId).eq("date", date),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { assets, liabilities, netWorth: assets - liabilities });
      return existing._id;
    }
    return await ctx.db.insert("netWorthSnapshots", {
      householdId: viewer.householdId,
      date,
      assets,
      liabilities,
      netWorth: assets - liabilities,
      source: "auto",
      createdAt: Date.now(),
    });
  },
});

export const history = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    if (!viewer) return [];
    const limit = Math.min(Math.max(args.limit ?? 90, 1), 365);
    const rows = await ctx.db
      .query("netWorthSnapshots")
      .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
      .collect();
    return rows
      .sort((a, b) => a.date - b.date)
      .slice(-limit)
      .map((row) => ({ date: row.date, netWorth: row.netWorth, assets: row.assets, liabilities: row.liabilities }));
  },
});

/** Record today's position once per day; called when the dashboard opens. */
export const ensureSnapshot = mutation({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireViewer(ctx);
    const dayStart = new Date();
    const date = new Date(
      dayStart.getFullYear(),
      dayStart.getMonth(),
      dayStart.getDate(),
    ).getTime();
    const existing = await ctx.db
      .query("netWorthSnapshots")
      .withIndex("by_household_date", (q) =>
        q.eq("householdId", viewer.householdId).eq("date", date),
      )
      .first();
    if (existing) return existing._id;

    // Compute today's position inline (same math as summary).
    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
      .collect();
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
      .collect();
    const balances = balancesByAccount(accounts, transactions);
    let assets = 0;
    let liabilities = 0;
    for (const account of accounts.filter((a) => !a.archived && a.includeInNetWorth !== false)) {
      const balance = balances.get(account._id) ?? 0;
      if (isLiabilityKind(account.kind)) liabilities += Math.abs(Math.min(0, balance));
      else assets += Math.max(0, balance);
    }
    return await ctx.db.insert("netWorthSnapshots", {
      householdId: viewer.householdId,
      date,
      assets,
      liabilities,
      netWorth: assets - liabilities,
      source: "auto",
      createdAt: Date.now(),
    });
  },
});

export const clearHistory = mutation({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireViewer(ctx);
    const rows = await ctx.db
      .query("netWorthSnapshots")
      .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
      .collect();
    for (const row of rows) await ctx.db.delete(row._id);
    void ConvexError;
  },
});
