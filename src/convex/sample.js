import { ConvexError } from "convex/values";
import { mutation } from "./_generated/server";
import { DAY, requireViewer, startOfUtcDay } from "./lib";
const SAMPLE_ACCOUNTS = [
    {
        key: "everyday",
        name: "Everyday Checking",
        kind: "checking",
        institution: "Northline Bank",
        openingBalance: 214000,
        color: "teal",
    },
    {
        key: "joint",
        name: "Joint Checking",
        kind: "checking",
        institution: "Northline Bank",
        openingBalance: 326500,
        color: "indigo",
    },
    {
        key: "savings",
        name: "High-Yield Savings",
        kind: "savings",
        institution: "Meridian Savings",
        openingBalance: 1960000,
        color: "emerald",
    },
    {
        key: "card",
        name: "Travel Rewards Card",
        kind: "credit",
        institution: "Vantage Card",
        openingBalance: -68400,
        color: "amber",
    },
    {
        key: "cash",
        name: "Cash on Hand",
        kind: "cash",
        institution: "",
        openingBalance: 21500,
        color: "slate",
    },
    {
        key: "brokerage",
        name: "Index Fund Brokerage",
        kind: "investment",
        institution: "Meridian Invest",
        openingBalance: 1240000,
        color: "emerald",
        estimatedReturnPct: 7,
        returnBasis: "annual",
    },
    {
        key: "robo",
        name: "Robo Advisor Portfolio",
        kind: "investment",
        institution: "Northline Wealth",
        openingBalance: 2860000,
        color: "indigo",
        estimatedReturnPct: 0.45,
        returnBasis: "monthly",
    },
];
const SAMPLE_TRANSACTIONS = [
    { account: "everyday", direction: "in", amount: 285000, description: "Paycheck", category: "Income", daysAgo: 35 },
    { account: "joint", direction: "in", amount: 241000, description: "Paycheck — partner", category: "Income", daysAgo: 34 },
    { account: "joint", direction: "out", amount: 16400, description: "Weekly groceries", category: "Groceries", daysAgo: 33 },
    { account: "joint", direction: "out", amount: 14200, description: "Electric bill", category: "Utilities", daysAgo: 30 },
    { account: "everyday", direction: "out", amount: 580, description: "Coffee shop", category: "Dining", daysAgo: 29 },
    { account: "joint", direction: "out", amount: 7500, description: "Internet", category: "Utilities", daysAgo: 28 },
    { account: "joint", direction: "out", amount: 185000, description: "Rent", category: "Housing", daysAgo: 25 },
    { account: "card", direction: "out", amount: 6800, description: "Dinner out", category: "Dining", daysAgo: 22 },
    { account: "everyday", direction: "in", amount: 285000, description: "Paycheck", category: "Income", daysAgo: 21 },
    { account: "joint", direction: "in", amount: 241000, description: "Paycheck — partner", category: "Income", daysAgo: 20 },
    { account: "joint", direction: "out", amount: 21200, description: "Weekly groceries", category: "Groceries", daysAgo: 18 },
    { account: "everyday", direction: "out", amount: 5800, description: "Fuel", category: "Transport", daysAgo: 16 },
    { account: "everyday", direction: "out", amount: 1799, description: "Streaming bundle", category: "Subscriptions", daysAgo: 14 },
    { account: "everyday", direction: "out", amount: 640, description: "Coffee shop", category: "Dining", daysAgo: 12 },
    { account: "everyday", direction: "out", amount: 4500, description: "Gym membership", category: "Health", daysAgo: 11 },
    { account: "joint", direction: "out", amount: 3450, description: "Pharmacy", category: "Health", daysAgo: 10 },
    { account: "card", direction: "out", amount: 11200, description: "Weekend trip", category: "Travel", daysAgo: 9 },
    { account: "joint", direction: "out", amount: 9600, description: "Electric bill", category: "Utilities", daysAgo: 8 },
    { account: "everyday", direction: "in", amount: 285000, description: "Paycheck", category: "Income", daysAgo: 7 },
    { account: "joint", direction: "in", amount: 241000, description: "Paycheck — partner", category: "Income", daysAgo: 6 },
    { account: "card", direction: "out", amount: 3200, description: "Cinema", category: "Entertainment", daysAgo: 6 },
    { account: "joint", direction: "out", amount: 14800, description: "Weekly groceries", category: "Groceries", daysAgo: 4 },
    { account: "everyday", direction: "out", amount: 6200, description: "Fuel", category: "Transport", daysAgo: 3 },
    { account: "everyday", direction: "out", amount: 490, description: "Coffee shop", category: "Dining", daysAgo: 2 },
    { account: "joint", direction: "out", amount: 9600, description: "Weekly groceries", category: "Groceries", daysAgo: 1 },
    { account: "cash", direction: "out", amount: 2400, description: "Farmers market", category: "Groceries", daysAgo: 1 },
    { account: "brokerage", direction: "in", amount: 150000, description: "Monthly contribution", category: "Savings", daysAgo: 12 },
    { account: "brokerage", direction: "in", amount: 7240, description: "Dividend payout", category: "Income", daysAgo: 5 },
    { account: "robo", direction: "in", amount: 40000, description: "Monthly contribution", category: "Savings", daysAgo: 19 },
];
const SAMPLE_RECURRING = [
    { account: "everyday", direction: "in", amount: 285000, description: "Paycheck — you", category: "Income", frequency: "biweekly", inDays: 3 },
    { account: "joint", direction: "out", amount: 17500, description: "Groceries", category: "Groceries", frequency: "weekly", inDays: 2 },
    { account: "joint", direction: "in", amount: 241000, description: "Paycheck — partner", category: "Income", frequency: "biweekly", inDays: 5 },
    { account: "joint", direction: "out", amount: 185000, description: "Rent", category: "Housing", frequency: "monthly", inDays: 6 },
    { account: "everyday", direction: "out", amount: 38500, description: "Car payment", category: "Transport", frequency: "monthly", inDays: 7 },
    { account: "card", direction: "out", amount: 12000, description: "Dining out", category: "Dining", frequency: "weekly", inDays: 4 },
    { account: "joint", direction: "out", amount: 14500, description: "Utilities", category: "Utilities", frequency: "monthly", inDays: 9 },
    { account: "joint", direction: "out", amount: 7500, description: "Internet", category: "Utilities", frequency: "monthly", inDays: 11 },
    { account: "everyday", direction: "out", amount: 4200, description: "Subscriptions", category: "Subscriptions", frequency: "monthly", inDays: 16 },
    { account: "everyday", direction: "out", amount: 4500, description: "Gym membership", category: "Health", frequency: "monthly", inDays: 19 },
];
/** Populate the workspace with a realistic example month. */
export const load = mutation({
    args: {},
    handler: async (ctx) => {
        const viewer = await requireViewer(ctx);
        const existing = await ctx.db
            .query("accounts")
            .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
            .first();
        if (existing) {
            throw new ConvexError("This workspace already has accounts.");
        }
        const now = Date.now();
        const ids = new Map();
        for (const account of SAMPLE_ACCOUNTS) {
            const id = await ctx.db.insert("accounts", {
                householdId: viewer.householdId,
                name: account.name,
                kind: account.kind,
                institution: account.institution || undefined,
                openingBalance: account.openingBalance,
                color: account.color,
                archived: false,
                estimatedReturnPct: account.estimatedReturnPct,
                returnBasis: account.returnBasis,
                createdAt: now + ids.size,
            });
            ids.set(account.key, id);
        }
        for (const transaction of SAMPLE_TRANSACTIONS) {
            const accountId = ids.get(transaction.account);
            if (!accountId)
                continue;
            await ctx.db.insert("transactions", {
                householdId: viewer.householdId,
                accountId,
                direction: transaction.direction,
                amount: transaction.amount,
                description: transaction.description,
                category: transaction.category,
                date: now - transaction.daysAgo * DAY,
                createdBy: viewer.userId,
                createdAt: now - transaction.daysAgo * DAY,
            });
        }
        const today = startOfUtcDay(now);
        for (const item of SAMPLE_RECURRING) {
            const accountId = ids.get(item.account);
            if (!accountId)
                continue;
            await ctx.db.insert("recurring", {
                householdId: viewer.householdId,
                accountId,
                direction: item.direction,
                amount: item.amount,
                description: item.description,
                category: item.category,
                frequency: item.frequency,
                nextDate: today + item.inDays * DAY,
                active: true,
                createdAt: now,
            });
        }
        return null;
    },
});
/** Wipe every account, transaction and scheduled item in the workspace. */
export const clear = mutation({
    args: {},
    handler: async (ctx) => {
        const viewer = await requireViewer(ctx);
        const householdId = viewer.householdId;
        const transactions = await ctx.db
            .query("transactions")
            .withIndex("by_household", (q) => q.eq("householdId", householdId))
            .collect();
        for (const row of transactions)
            await ctx.db.delete(row._id);
        const recurring = await ctx.db
            .query("recurring")
            .withIndex("by_household", (q) => q.eq("householdId", householdId))
            .collect();
        for (const row of recurring)
            await ctx.db.delete(row._id);
        const accounts = await ctx.db
            .query("accounts")
            .withIndex("by_household", (q) => q.eq("householdId", householdId))
            .collect();
        for (const row of accounts)
            await ctx.db.delete(row._id);
        return null;
    },
});
