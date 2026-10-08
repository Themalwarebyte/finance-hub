import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertBusinessOwns, requireBusinessViewer } from "./businessAccess";
// ---------------------------------------------------------------------------
// GHub service catalogue. Reference data for proposals — no financial effect.
// ---------------------------------------------------------------------------
export const createService = mutation({
    args: {
        name: v.string(),
        description: v.optional(v.string()),
        priceMinCents: v.number(),
        priceMaxCents: v.number(),
        active: v.boolean(),
    },
    handler: async (ctx, args) => {
        const viewer = await requireBusinessViewer(ctx);
        if (!args.name.trim())
            throw new ConvexError("Service name is required.");
        if (!(args.priceMinCents > 0) ||
            !(args.priceMaxCents >= args.priceMinCents) ||
            !Number.isInteger(args.priceMinCents) ||
            !Number.isInteger(args.priceMaxCents)) {
            throw new ConvexError("Price range must be positive whole cents with max >= min.");
        }
        return ctx.db.insert("services", {
            businessId: viewer.businessId,
            name: args.name.trim(),
            description: args.description,
            priceMinCents: args.priceMinCents,
            priceMaxCents: args.priceMaxCents,
            active: args.active,
            createdBy: viewer.userId,
            createdAt: Date.now(),
        });
    },
});
export const updateService = mutation({
    args: {
        serviceId: v.id("services"),
        name: v.string(),
        description: v.optional(v.string()),
        priceMinCents: v.number(),
        priceMaxCents: v.number(),
        active: v.boolean(),
    },
    handler: async (ctx, args) => {
        const viewer = await requireBusinessViewer(ctx);
        const row = await ctx.db.get(args.serviceId);
        assertBusinessOwns(row, viewer.businessId);
        if (!(args.priceMaxCents >= args.priceMinCents && args.priceMinCents > 0))
            throw new ConvexError("Price range must have max >= min > 0.");
        await ctx.db.patch(args.serviceId, {
            name: args.name,
            description: args.description,
            priceMinCents: args.priceMinCents,
            priceMaxCents: args.priceMaxCents,
            active: args.active,
        });
    },
});
export const listServices = query({
    args: {},
    handler: async (ctx) => {
        const viewer = await requireBusinessViewer(ctx);
        return ctx.db
            .query("services")
            .withIndex("by_business", (q) => q.eq("businessId", viewer.businessId))
            .collect();
    },
});
/** Initial five GHub services. Idempotent — only seeds an empty catalogue. */
export const seedDefaultServices = mutation({
    args: {},
    handler: async (ctx) => {
        const viewer = await requireBusinessViewer(ctx);
        const existing = await ctx.db
            .query("services")
            .withIndex("by_business", (q) => q.eq("businessId", viewer.businessId))
            .first();
        if (existing)
            return; // already seeded
        const seed = [
            {
                name: "Website Development",
                description: "Custom business websites: design, build and launch with hosting setup.",
                priceMinCents: 3000000, // KSh 30,000
                priceMaxCents: 15000000, // KSh 150,000
            },
            {
                name: "Website Maintenance",
                description: "Monthly updates, backups, security patches and content changes.",
                priceMinCents: 300000, // KSh 3,000
                priceMaxCents: 1000000, // KSh 10,000
            },
            {
                name: "SME Workflow Automation",
                description: "Automate repetitive processes: invoicing, reporting, notifications.",
                priceMinCents: 1000000, // KSh 10,000
                priceMaxCents: 10000000, // KSh 100,000
            },
            {
                name: "IT Support",
                description: "On-demand technical support for small teams, remote or on-site.",
                priceMinCents: 200000, // KSh 2,000
                priceMaxCents: 500000, // KSh 5,000
            },
            {
                name: "Data and Technology Consulting",
                description: "Advisory on tools, data practices and digital transformation for SMEs.",
                priceMinCents: 500000, // KSh 5,000
                priceMaxCents: 5000000, // KSh 50,000
            },
        ];
        for (const item of seed) {
            await ctx.db.insert("services", {
                businessId: viewer.businessId,
                ...item,
                active: true,
                createdBy: viewer.userId,
                createdAt: Date.now(),
            });
        }
    },
});
