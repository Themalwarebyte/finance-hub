import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertBusinessOwns, requireBusinessOwner, requireBusinessViewer } from "./businessAccess";
import { ACTIVITY_KINDS, DEFAULT_ACTIVITY_TARGETS, activityStatus, weekStartMs, } from "../lib/business";
// ---------------------------------------------------------------------------
// Weekly CEO activity tracker. These are lead-generation GOALS — activity
// rows never create revenue, balances or financial transactions.
// ---------------------------------------------------------------------------
function isActivityKind(kind) {
    return ACTIVITY_KINDS.includes(kind);
}
/** Log (increment) an activity count into the current week bucket. */
export const logActivity = mutation({
    args: { kind: v.string(), count: v.number() },
    handler: async (ctx, args) => {
        const viewer = await requireBusinessViewer(ctx);
        if (!isActivityKind(args.kind)) {
            throw new ConvexError(`Unknown activity kind: ${args.kind}`);
        }
        if (!(args.count > 0) || !Number.isInteger(args.count)) {
            throw new ConvexError("Count must be a positive whole number.");
        }
        // Merge into the existing row for this week+kind so the summary is one
        // reactive subscription instead of an ever-growing event list.
        const week = weekStartMs(Date.now());
        const existing = await ctx.db
            .query("ceoActivities")
            .withIndex("by_business_week", (q) => q.eq("businessId", viewer.businessId).eq("weekStartMs", week))
            .collect();
        const row = existing.find((r) => r.kind === args.kind);
        if (row) {
            await ctx.db.patch(row._id, { count: row.count + args.count });
        }
        else {
            await ctx.db.insert("ceoActivities", {
                businessId: viewer.businessId,
                kind: args.kind,
                weekStartMs: week,
                count: args.count,
                createdBy: viewer.userId,
                createdAt: Date.now(),
            });
        }
    },
});
/** Owner sets a weekly target for one activity kind. */
export const setActivityTarget = mutation({
    args: { kind: v.string(), targetPerWeek: v.number() },
    handler: async (ctx, args) => {
        const viewer = await requireBusinessOwner(ctx); // structural change → owner
        if (!isActivityKind(args.kind)) {
            throw new ConvexError(`Unknown activity kind: ${args.kind}`);
        }
        if (!(args.targetPerWeek >= 0) || !Number.isInteger(args.targetPerWeek)) {
            throw new ConvexError("Target must be a non-negative whole number.");
        }
        const rows = await ctx.db
            .query("activityTargets")
            .withIndex("by_business", (q) => q.eq("businessId", viewer.businessId))
            .collect();
        const row = rows.find((r) => r.kind === args.kind);
        if (row) {
            await ctx.db.patch(row._id, {
                targetPerWeek: args.targetPerWeek,
                updatedBy: viewer.userId,
                updatedAt: Date.now(),
            });
        }
        else {
            await ctx.db.insert("activityTargets", {
                businessId: viewer.businessId,
                kind: args.kind,
                targetPerWeek: args.targetPerWeek,
                updatedBy: viewer.userId,
                updatedAt: Date.now(),
            });
        }
    },
});
/** This week's counts, editable targets and pace statuses in one query. */
export const activitySummary = query({
    args: {},
    handler: async (ctx) => {
        const viewer = await requireBusinessViewer(ctx);
        const now = Date.now();
        const week = weekStartMs(now);
        const activityRows = await ctx.db
            .query("ceoActivities")
            .withIndex("by_business_week", (q) => q.eq("businessId", viewer.businessId).eq("weekStartMs", week))
            .collect();
        const targetRows = await ctx.db
            .query("activityTargets")
            .withIndex("by_business", (q) => q.eq("businessId", viewer.businessId))
            .collect();
        return ACTIVITY_KINDS.map((kind) => {
            const count = activityRows.find((r) => r.kind === kind)?.count ?? 0;
            const stored = targetRows.find((r) => r.kind === kind);
            const target = stored ? stored.targetPerWeek : DEFAULT_ACTIVITY_TARGETS[kind];
            return {
                kind,
                count,
                target,
                isDefaultTarget: stored === undefined,
                ...activityStatus(count, target, now),
            };
        });
    },
});
/** Aggregated figures the Command Center shows; all from recorded data. */
export const commandCenter = query({
    args: {},
    handler: async (ctx) => {
        const viewer = await requireBusinessViewer(ctx);
        const now = Date.now();
        const userId = await getAuthUserId(ctx);
        const monthStart = new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 1).getTime();
        const ledger = await ctx.db
            .query("businessLedger")
            .withIndex("by_business", (q) => q.eq("businessId", viewer.businessId))
            .collect();
        const invoices = await ctx.db
            .query("invoices")
            .withIndex("by_business", (q) => q.eq("businessId", viewer.businessId))
            .collect();
        const contracts = await ctx.db
            .query("contracts")
            .withIndex("by_business", (q) => q.eq("businessId", viewer.businessId))
            .collect();
        const clients = await ctx.db
            .query("clients")
            .withIndex("by_business", (q) => q.eq("businessId", viewer.businessId))
            .collect();
        // Revenue this month = non-draft invoices issued this month (accrual
        // event) — kept separate from cash collected below.
        const revenueThisMonthCents = invoices
            .filter((i) => i.status !== "draft" && i.issueDate >= monthStart)
            .reduce((s, i) => s + i.amountCents, 0);
        const revenueYtdCents = invoices
            .filter((i) => i.status !== "draft")
            .reduce((s, i) => s + i.amountCents, 0);
        const cashCollectedCents = invoices.reduce((s, i) => s + i.paidCents, 0);
        const receivablesCents = invoices
            .filter((i) => i.status !== "draft")
            .reduce((s, i) => s + Math.max(0, i.amountCents - i.paidCents), 0);
        const activeClients = clients.filter((c) => c.isClient).length;
        const activeContracts = contracts.filter((c) => c.status === "active").length;
        return {
            generatedAt: now,
            myUserId: userId,
            revenueThisMonthCents,
            revenueYtdCents,
            cashCollectedCents,
            receivablesCents,
            activeClients,
            activeContracts,
            openLeads: clients.filter((c) => !c.isClient).length,
        };
    },
});
void assertBusinessOwns; // re-exported guard contract used by tests
