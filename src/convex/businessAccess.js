import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
function queryCtx(ctx) {
    return true;
}
/** The signed-in user plus the business they're a member of, if any. */
export async function getBusinessViewer(ctx) {
    void queryCtx;
    const userId = await getAuthUserId(ctx);
    if (userId === null)
        return null;
    const membership = await ctx.db
        .query("businessMembers")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
    if (!membership)
        return null;
    const business = await ctx.db.get(membership.businessId);
    if (!business)
        return null;
    return { userId, business, businessId: business._id, role: membership.role };
}
/** Same as getBusinessViewer, but throws instead of returning null. */
export async function requireBusinessViewer(ctx) {
    const viewer = await getBusinessViewer(ctx);
    if (!viewer) {
        throw new ConvexError("You don't have access to GHub. Ask the owner to add you.");
    }
    return viewer;
}
/**
 * Enforce write access inside Convex, not only in the UI:
 * `member` can record activity; structural/admin changes need `owner`.
 */
export async function requireBusinessOwner(ctx) {
    const viewer = await requireBusinessViewer(ctx);
    if (viewer.role !== "owner") {
        throw new ConvexError("Only the GHub owner can do this.");
    }
    return viewer;
}
/** Guard reads/writes so one business's rows can never touch another's. */
export function assertBusinessOwns(row, businessId) {
    if (!row || row.businessId !== businessId) {
        throw new ConvexError("Not found in this workspace.");
    }
}
