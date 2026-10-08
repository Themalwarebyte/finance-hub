import { v } from "convex/values";
import { query } from "./_generated/server";
import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
/**
 * Per-user business-view preference (personal | ghub | consolidated).
 * Kept tiny; storefront for the BizViewSwitcher pill.
 */
export const currentBizView = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (userId === null)
            return null;
        const settings = await ctx.db
            .query("userSettings")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();
        return settings?.bizView ?? null;
    },
});
export const setBizView = mutation({
    args: { view: v.union(v.literal("personal"), v.literal("ghub"), v.literal("consolidated")) },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (userId === null)
            return;
        const settings = await ctx.db
            .query("userSettings")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();
        if (settings) {
            await ctx.db.patch(settings._id, { bizView: args.view });
        }
        else {
            await ctx.db.insert("userSettings", { userId, bizView: args.view });
        }
    },
});
