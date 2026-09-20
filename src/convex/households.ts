import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  generateInviteCode,
  getViewer,
  normalizeInviteCode,
  requireViewer,
} from "./lib";

/** The shared workspace plus everyone in it. Null when the user has none yet. */
export const current = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await getViewer(ctx);
    if (!viewer) return null;

    const household = await ctx.db.get(viewer.householdId);
    if (!household) return null;

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_household", (q) => q.eq("householdId", household._id))
      .collect();

    const members = await Promise.all(
      memberships.map(async (membership) => {
        const user = await ctx.db.get(membership.userId);
        return {
          userId: membership.userId,
          role: membership.role,
          joinedAt: membership.joinedAt,
          name: user?.name ?? null,
          email: user?.email ?? null,
          image: user?.image ?? null,
        };
      }),
    );

    return {
      household: {
        _id: household._id,
        name: household.name,
        currency: household.currency,
        inviteCode: household.inviteCode,
      },
      members,
      myRole: viewer.membership.role,
      myUserId: viewer.userId,
    };
  },
});

/** Create a workspace and make the caller its owner. */
export const create = mutation({
  args: { name: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError("Please sign in first.");

    const existing = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) return existing.householdId;

    const user = await ctx.db.get(userId);
    const fallbackName = user?.name ? `${user.name}'s Household` : "Our Money";
    const trimmed = args.name?.trim();

    const householdId = await ctx.db.insert("households", {
      name: trimmed && trimmed.length > 0 ? trimmed : fallbackName,
      currency: "USD",
      inviteCode: generateInviteCode(),
      createdBy: userId,
    });

    await ctx.db.insert("memberships", {
      householdId,
      userId,
      role: "owner",
      joinedAt: Date.now(),
    });

    return householdId;
  },
});

/** Join a partner's workspace with the invite code they shared. */
export const join = mutation({
  args: { inviteCode: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError("Please sign in first.");

    const normalized = normalizeInviteCode(args.inviteCode);
    if (normalized.length < 6) {
      throw new ConvexError("That invite code doesn't look right.");
    }

    const households = await ctx.db.query("households").collect();
    const household = households.find(
      (item) => normalizeInviteCode(item.inviteCode) === normalized,
    );
    if (!household) {
      throw new ConvexError("We couldn't find a workspace with that code.");
    }

    const existing = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      if (existing.householdId === household._id) return household._id;
      throw new ConvexError(
        "You already belong to a workspace. Leave it before joining another.",
      );
    }

    await ctx.db.insert("memberships", {
      householdId: household._id,
      userId,
      role: "member",
      joinedAt: Date.now(),
    });

    return household._id;
  },
});

export const rename = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const name = args.name.trim();
    if (name.length === 0) throw new ConvexError("Give the workspace a name.");
    await ctx.db.patch(viewer.householdId, { name: name.slice(0, 60) });
  },
});

export const regenerateInvite = mutation({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireViewer(ctx);
    const inviteCode = generateInviteCode();
    await ctx.db.patch(viewer.householdId, { inviteCode });
    return inviteCode;
  },
});

export const leave = mutation({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireViewer(ctx);
    await ctx.db.delete(viewer.membership._id);
  },
});
