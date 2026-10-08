import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { requireViewer } from "./lib";
import { averageCostPerUnit, formatQty, parseQty, planMonth, portfolioTotals, sellFifo, unrealizedCents, } from "../lib/investing";
/**
 * Phase 2 — Investment Management. Household-scoped (personal money);
 * GHub business money never mixes in. No live market data, no speculative
 * returns: prices are manual entries with source + timestamp.
 */
// ---------------------------------------------------------------------------
// Securities & starting positions
// ---------------------------------------------------------------------------
/**
 * Seed the five starting NSE positions. Each security is created with its
 * exact quantity as an `adjustment` transaction; cost bases stay unset until
 * the user enters them (never invented).
 */
export const seedNsePortfolio = mutation({
    args: {
        positions: v.array(v.object({
            symbol: v.string(),
            name: v.string(),
            assetClass: v.union(v.literal("equity"), v.literal("etf"), v.literal("money_market_fund"), v.literal("sacco_deposit"), v.literal("sacco_share_capital"), v.literal("treasury_bill"), v.literal("treasury_bond"), v.literal("infrastructure_bond")),
            qtyInput: v.string(),
        })),
    },
    handler: async (ctx, args) => {
        const viewer = await requireViewer(ctx);
        const existing = await ctx.db
            .query("securities")
            .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
            .collect();
        const known = new Set(existing.map((s) => s.symbol));
        for (const pos of args.positions) {
            if (known.has(pos.symbol))
                continue;
            const qty = parseQty(pos.qtyInput);
            if (qty === null)
                throw new ConvexError(`Invalid quantity for ${pos.symbol}`);
            const securityId = await ctx.db.insert("securities", {
                householdId: viewer.householdId,
                symbol: pos.symbol.toUpperCase(),
                name: pos.name,
                assetClass: pos.assetClass,
                // No costBasis: unknown purchase prices are never invented.
                createdAt: Date.now(),
            });
            await ctx.db.insert("investTxns", {
                householdId: viewer.householdId,
                securityId,
                kind: "adjustment",
                qtyMicro: qty,
                amountCents: 0,
                note: "Starting position — cost basis requires user entry",
                date: Date.now(),
                createdBy: viewer.userId,
                createdAt: Date.now(),
            });
        }
        return true;
    },
});
/** Create a security row (one-off; seed helper handles the NSE list). */
export const createSecurity = mutation({
    args: {
        symbol: v.string(),
        name: v.string(),
        assetClass: v.union(v.literal("equity"), v.literal("etf"), v.literal("money_market_fund"), v.literal("sacco_deposit"), v.literal("sacco_share_capital"), v.literal("treasury_bill"), v.literal("treasury_bond"), v.literal("infrastructure_bond")),
        qtyInput: v.string(),
        brokerageAccountId: v.optional(v.id("accounts")),
    },
    handler: async (ctx, args) => {
        const viewer = await requireViewer(ctx);
        const qty = parseQty(args.qtyInput);
        if (qty === null)
            throw new ConvexError("Invalid quantity.");
        const securityId = await ctx.db.insert("securities", {
            householdId: viewer.householdId,
            symbol: args.symbol.toUpperCase(),
            name: args.name,
            assetClass: args.assetClass,
            // costBasis intentionally left unset — user must enter it.
            brokerageAccountId: args.brokerageAccountId,
            createdAt: Date.now(),
        });
        await ctx.db.insert("investTxns", {
            householdId: viewer.householdId,
            securityId,
            kind: "adjustment",
            qtyMicro: qty,
            amountCents: 0,
            note: "Starting position — cost basis requires user entry",
            date: Date.now(),
            createdBy: viewer.userId,
            createdAt: Date.now(),
        });
        await ctx.db.insert("investAudit", {
            householdId: viewer.householdId,
            action: "security_created",
            detail: `${args.symbol} with starting qty ${formatQty(qty)}`,
            refId: securityId,
            createdBy: viewer.userId,
            createdAt: Date.now(),
        });
        return securityId;
    },
});
export const listSecurities = query({
    args: {},
    handler: async (ctx) => {
        const viewer = await requireViewer(ctx);
        const securities = await ctx.db
            .query("securities")
            .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
            .collect();
        const prices = await ctx.db
            .query("securityPrices")
            .collect();
        const latest = new Map();
        for (const price of prices) {
            const key = price.securityId;
            const current = latest.get(key);
            if (!current || price.recordedAt > current.recordedAt) {
                latest.set(key, {
                    priceCents: price.priceCents,
                    source: price.source,
                    recordedAt: price.recordedAt,
                });
            }
        }
        return securities.map((security) => ({
            ...security,
            latestPrice: latest.get(security._id) ?? null,
        }));
    },
});
export const updatePrice = mutation({
    args: {
        securityId: v.id("securities"),
        priceCents: v.number(),
        source: v.string(),
    },
    handler: async (ctx, args) => {
        const viewer = await requireViewer(ctx);
        const security = await ctx.db.get(args.securityId);
        if (!security || security.householdId !== viewer.householdId)
            throw new ConvexError("Not found.");
        if (args.priceCents <= 0 || !Number.isInteger(args.priceCents))
            throw new ConvexError("Price must be a positive whole number of cents.");
        await ctx.db.insert("securityPrices", {
            securityId: args.securityId,
            priceCents: args.priceCents,
            source: args.source || "manual",
            recordedAt: Date.now(),
            createdBy: viewer.userId,
        });
        await ctx.db.insert("investAudit", {
            householdId: viewer.householdId,
            action: "price_update",
            detail: `${security.symbol} @ ${(args.priceCents / 100).toFixed(2)} (${args.source}) — manual entry, not live market data`,
            refId: args.securityId,
            createdBy: viewer.userId,
            createdAt: Date.now(),
        });
    },
});
// ---------------------------------------------------------------------------
// Transaction ledger
// ---------------------------------------------------------------------------
export const recordTxn = mutation({
    args: {
        securityId: v.id("securities"),
        kind: v.union(v.literal("purchase"), v.literal("sale"), v.literal("dividend"), v.literal("interest"), v.literal("fee"), v.literal("contribution"), v.literal("withdrawal"), v.literal("split"), v.literal("adjustment")),
        qtyInput: v.optional(v.string()),
        priceCents: v.optional(v.number()),
        feeCents: v.optional(v.number()),
        amountCents: v.optional(v.number()),
        cashAccountId: v.optional(v.id("accounts")),
        note: v.optional(v.string()),
        date: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const viewer = await requireViewer(ctx);
        const security = await ctx.db.get(args.securityId);
        if (!security || security.householdId !== viewer.householdId)
            throw new ConvexError("Not found.");
        const qtyMicro = args.qtyInput ? parseQty(args.qtyInput) : null;
        if (args.qtyInput && qtyMicro === null)
            throw new ConvexError("Invalid quantity.");
        let realizedGainCents;
        if (args.kind === "purchase") {
            if (qtyMicro === null || !args.priceCents)
                throw new ConvexError("Purchases need qty and price.");
            // cash effect = -(qty*price + fee); validated positive inputs only.
            const gross = Math.round((args.priceCents * qtyMicro) / 1000000);
            const fee = args.feeCents ?? 0;
            const total = gross + fee;
            await ctx.db.insert("investTxns", {
                householdId: viewer.householdId,
                securityId: args.securityId,
                kind: "purchase",
                qtyMicro,
                amountCents: total,
                feeCents: fee,
                cashAccountId: args.cashAccountId,
                note: args.note,
                date: args.date ?? Date.now(),
                createdBy: viewer.userId,
                createdAt: Date.now(),
            });
        }
        else if (args.kind === "sale") {
            if (qtyMicro === null || !args.priceCents)
                throw new ConvexError("Sales need qty and price.");
            const proceeds = Math.round((args.priceCents * qtyMicro) / 1000000) - (args.feeCents ?? 0);
            // FIFO against purchase lots
            const buys = await ctx.db
                .query("investTxns")
                .withIndex("by_security", (q) => q.eq("securityId", args.securityId))
                .collect();
            const lots = [];
            for (const txn of buys.sort((a, b) => a.date - b.date)) {
                if (txn.kind === "purchase" && txn.qtyMicro) {
                    lots.push({ qtyMicro: txn.qtyMicro, costCents: txn.amountCents });
                }
                else if (txn.kind === "sale" && txn.qtyMicro) {
                    // Re-derive prior consumption: cheap FIFO replay.
                    let remaining = txn.qtyMicro;
                    const next = [];
                    for (const lot of lots) {
                        if (remaining <= 0) {
                            next.push(lot);
                            continue;
                        }
                        if (lot.qtyMicro <= remaining) {
                            remaining -= lot.qtyMicro;
                        }
                        else {
                            next.push({ qtyMicro: lot.qtyMicro - remaining, costCents: Math.round((lot.costCents * (lot.qtyMicro - remaining)) / lot.qtyMicro) });
                            remaining = 0;
                        }
                    }
                    lots.length = 0;
                    lots.push(...next);
                }
            }
            const result = sellFifo(lots, qtyMicro, proceeds);
            realizedGainCents = result.realizedCents;
            await ctx.db.insert("investTxns", {
                householdId: viewer.householdId,
                securityId: args.securityId,
                kind: "sale",
                qtyMicro,
                amountCents: proceeds,
                feeCents: args.feeCents ?? 0,
                cashAccountId: args.cashAccountId,
                realizedGainCents,
                note: args.note,
                date: args.date ?? Date.now(),
                createdBy: viewer.userId,
                createdAt: Date.now(),
            });
        }
        else {
            // dividend / interest / contribution / withdrawal / fee / split / adjustment
            const amount = args.amountCents ?? 0;
            if (!Number.isInteger(amount))
                throw new ConvexError("Amounts must be whole cents.");
            await ctx.db.insert("investTxns", {
                householdId: viewer.householdId,
                securityId: args.securityId,
                kind: args.kind,
                qtyMicro: qtyMicro ?? undefined,
                amountCents: amount,
                feeCents: args.feeCents,
                cashAccountId: args.cashAccountId,
                note: args.note,
                date: args.date ?? Date.now(),
                createdBy: viewer.userId,
                createdAt: Date.now(),
            });
        }
        await ctx.db.insert("investAudit", {
            householdId: viewer.householdId,
            action: "txn_created",
            detail: `${args.kind} ${security.symbol}${args.qtyInput ? ` ${args.qtyInput}` : ""}${args.amountCents ? ` KSh ${(args.amountCents / 100).toFixed(2)}` : ""}`,
            createdBy: viewer.userId,
            createdAt: Date.now(),
        });
        return { realizedGainCents };
    },
});
export const listTxns = query({
    args: {},
    handler: async (ctx) => {
        const viewer = await requireViewer(ctx);
        const txns = await ctx.db
            .query("investTxns")
            .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
            .collect();
        const securities = await ctx.db
            .query("securities")
            .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
            .collect();
        const names = new Map(securities.map((s) => [s._id, s]));
        return txns
            .sort((a, b) => b.date - a.date)
            .map((txn) => ({
            ...txn,
            symbol: names.get(txn.securityId)?.symbol ?? "?",
        }));
    },
});
export const listAudit = query({
    args: {},
    handler: async (ctx) => {
        const viewer = await requireViewer(ctx);
        return ctx.db
            .query("investAudit")
            .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
            .collect();
    },
});
// ---------------------------------------------------------------------------
// Portfolio valuation
// ---------------------------------------------------------------------------
/** Holdings + valuation, plus brokerage cash kept SEPARATE (no double count). */
export const portfolio = query({
    args: {},
    handler: async (ctx) => {
        const viewer = await requireViewer(ctx);
        const securities = await ctx.db
            .query("securities")
            .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
            .collect();
        const txns = await ctx.db
            .query("investTxns")
            .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
            .collect();
        const prices = await ctx.db.query("securityPrices").collect();
        const latestPrice = new Map();
        for (const price of prices) {
            const current = latestPrice.get(price.securityId);
            if (!current || price.recordedAt > current.recordedAt)
                latestPrice.set(price.securityId, price);
        }
        const rows = securities.map((security) => {
            const mine = txns.filter((txn) => txn.securityId === security._id);
            let qtyMicro = 0;
            let costCents = 0;
            let dividendsCents = 0;
            let interestCents = 0;
            let realizedCents = 0;
            const lots = [];
            for (const txn of mine.sort((a, b) => a.date - b.date)) {
                switch (txn.kind) {
                    case "purchase":
                        if (txn.qtyMicro) {
                            qtyMicro += txn.qtyMicro;
                            costCents += txn.amountCents;
                            lots.push({ qtyMicro: txn.qtyMicro, costCents: txn.amountCents });
                        }
                        break;
                    case "sale": {
                        if (txn.qtyMicro) {
                            const result = sellFifo(lots, txn.qtyMicro, txn.amountCents);
                            qtyMicro -= txn.qtyMicro;
                            costCents -= result.matchedCostCents;
                            realizedCents += txn.realizedGainCents ?? result.realizedCents;
                        }
                        break;
                    }
                    case "dividend":
                        dividendsCents += txn.amountCents;
                        break;
                    case "interest":
                        interestCents += txn.amountCents;
                        break;
                    case "split":
                    case "adjustment":
                        if (txn.qtyMicro)
                            qtyMicro += txn.qtyMicro;
                        break;
                    default:
                        break;
                }
            }
            const price = latestPrice.get(security._id) ?? null;
            const value = price && qtyMicro > 0 ? unrealizedCents(lots, price.priceCents) : null;
            return {
                _id: security._id,
                symbol: security.symbol,
                name: security.name,
                assetClass: security.assetClass,
                qtyMicro,
                qtyDisplay: formatQty(qtyMicro),
                avgCostCents: averageCostPerUnit(lots),
                priceCents: price?.priceCents ?? null,
                priceSource: price?.source ?? null,
                priceAt: price?.recordedAt ?? null,
                costBasisCents: costCents,
                marketValueCents: value?.marketCents ?? null,
                unrealizedCents: value?.gainCents ?? null,
                realizedCents,
                dividendsCents,
                interestCents,
            };
        });
        const totals = portfolioTotals(rows.map((row) => ({
            qtyMicro: row.qtyMicro,
            priceCents: row.priceCents,
            costCents: row.costBasisCents,
        })));
        // Brokerage cash = sum of linked cash accounts — reported separately so
        // holdings valuation and cash are never counted as one blended number.
        const accounts = await ctx.db
            .query("accounts")
            .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
            .collect();
        return {
            rows,
            totals: {
                ...totals,
                dividendsCents: rows.reduce((s, row) => s + row.dividendsCents, 0),
                interestCents: rows.reduce((s, row) => s + row.interestCents, 0),
                realizedCents: rows.reduce((s, row) => s + row.realizedCents, 0),
            },
            contributedCents: txns
                .filter((txn) => txn.kind === "contribution")
                .reduce((s, txn) => s + txn.amountCents, 0),
            accounts,
        };
    },
});
// ---------------------------------------------------------------------------
// Allocation planner
// ---------------------------------------------------------------------------
export const listAllocations = query({
    args: {},
    handler: async (ctx) => {
        const viewer = await requireViewer(ctx);
        return ctx.db
            .query("investAllocations")
            .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
            .collect();
    },
});
/** Seed the initial A/B/C cycle (percent-based; each month totals 100). */
export const seedAllocations = mutation({
    args: {},
    handler: async (ctx) => {
        const viewer = await requireViewer(ctx);
        const existing = await ctx.db
            .query("investAllocations")
            .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
            .first();
        if (existing)
            return;
        const securities = await ctx.db
            .query("securities")
            .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
            .collect();
        const bySymbol = new Map(securities.map((s) => [s.symbol, s._id]));
        const seed = [
            ["SMWF", "A", 55], ["SCOM", "A", 25], ["KEN", "A", 20],
            ["SCOM", "B", 35], ["COOP", "B", 20], ["EQTY", "B", 20], ["TOTL", "B", 25],
            ["SMWF", "C", 50], ["KEN", "C", 25], ["KCB", "C", 20], ["TOTL", "C", 5],
        ];
        for (const [symbol, cycle, pct] of seed) {
            const securityId = bySymbol.get(symbol);
            if (!securityId)
                continue; // user must create that security first
            await ctx.db.insert("investAllocations", {
                householdId: viewer.householdId,
                cycle,
                securityId,
                pct,
                active: true,
            });
        }
    },
});
export const upsertAllocation = mutation({
    args: {
        cycle: v.union(v.literal("A"), v.literal("B"), v.literal("C")),
        securityId: v.id("securities"),
        pct: v.number(),
        active: v.boolean(),
    },
    handler: async (ctx, args) => {
        const viewer = await requireViewer(ctx);
        if (args.pct <= 0 || args.pct > 100)
            throw new ConvexError("Percent must be 0–100.");
        const security = await ctx.db.get(args.securityId);
        if (!security || security.householdId !== viewer.householdId)
            throw new ConvexError("Unknown security.");
        await ctx.db.insert("investAllocations", {
            householdId: viewer.householdId,
            cycle: args.cycle,
            securityId: args.securityId,
            pct: args.pct,
            active: args.active,
        });
    },
});
export const removeAllocation = mutation({
    args: { allocationId: v.id("investAllocations") },
    handler: async (ctx, args) => {
        const viewer = await requireViewer(ctx);
        const row = await ctx.db.get(args.allocationId);
        if (!row || row.householdId !== viewer.householdId)
            throw new ConvexError("Not found.");
        await ctx.db.delete(args.allocationId);
    },
});
/** Compute (never execute) a month's plan: amounts, whole shares, carry. */
export const planPreview = query({
    args: {
        cycle: v.union(v.literal("A"), v.literal("B"), v.literal("C")),
        budgetCents: v.number(),
        carriedCents: v.number(),
    },
    handler: async (ctx, args) => {
        const viewer = await requireViewer(ctx);
        const allocations = await ctx.db
            .query("investAllocations")
            .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
            .collect();
        const securities = await ctx.db
            .query("securities")
            .withIndex("by_household", (q) => q.eq("householdId", viewer.householdId))
            .collect();
        const prices = await ctx.db.query("securityPrices").collect();
        const latest = new Map();
        for (const price of prices) {
            const current = latest.get(price.securityId);
            if (current === undefined || price.recordedAt > 0)
                latest.set(price.securityId, price.priceCents);
        }
        const targets = allocations
            .filter((a) => a.cycle === args.cycle && a.active)
            .map((a) => {
            const security = securities.find((s) => s._id === a.securityId);
            return {
                securityId: a.securityId,
                name: security?.symbol ?? "?",
                pct: a.pct,
                priceCents: latest.get(a.securityId) ?? null,
                feeCents: 0, // estimated fees are user-managed in Phase 2
            };
        });
        const sumPct = targets.reduce((s, t) => s + t.pct, 0);
        if (Math.abs(sumPct - 100) > 1e-9)
            throw new ConvexError(`Cycle ${args.cycle} allocations total ${sumPct}% — must be exactly 100%.`);
        return planMonth(args.budgetCents, args.carriedCents, targets);
    },
});
// ---------------------------------------------------------------------------
// Roadmap definitions (multi-roadmap registry — no speculative values)
// ---------------------------------------------------------------------------
export const seedRoadmaps = mutation({
    args: {},
    handler: async (ctx) => {
        const viewer = await requireViewer(ctx);
        const existing = await ctx.db
            .query("roadmapDefinitions")
            .withIndex("by_household_key", (q) => q.eq("householdId", viewer.householdId).eq("key", "nse_strategy"))
            .first();
        if (existing)
            return;
        await ctx.db.insert("roadmapDefinitions", {
            householdId: viewer.householdId,
            key: "nse_strategy",
            title: "Personal NSE Investment Strategy (30 years)",
            startDate: Date.UTC(2026, 9, 1),
            endDate: Date.UTC(2056, 8, 30, 23, 59, 59, 999),
            visionTargets: JSON.stringify({ note: "Vision targets live here; never mixed with actuals." }),
        });
        await ctx.db.insert("roadmapDefinitions", {
            householdId: viewer.householdId,
            key: "ghub_master",
            title: "GHub Financial Master Plan (33 years)",
            startDate: Date.UTC(2026, 9, 1),
            endDate: Date.UTC(2059, 8, 30, 23, 59, 59, 999),
            visionTargets: JSON.stringify({ note: "Vision targets live here; never mixed with actuals." }),
        });
    },
});
export const listRoadmaps = query({
    args: {},
    handler: async (ctx) => {
        const viewer = await requireViewer(ctx);
        return ctx.db
            .query("roadmapDefinitions")
            .withIndex("by_household_key", (q) => q.eq("householdId", viewer.householdId))
            .collect();
    },
});
void getAuthUserId;
