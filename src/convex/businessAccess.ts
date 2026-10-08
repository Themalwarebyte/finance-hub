import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

/**
 * GHub business access control. Every business function resolves the caller
 * through an explicit `businessMembers` row — household membership grants
 * nothing here, and business membership grants nothing to household data.
 */

export type MemberRole = "owner" | "member";

export type BusinessViewer = {
  userId: Id<"users">;
  business: Doc<"businesses">;
  businessId: Id<"businesses">;
  role: MemberRole;
};

function queryCtx(ctx: QueryCtx | MutationCtx): ctx is QueryCtx | MutationCtx {
  return true;
}

/** The signed-in user plus the business they're a member of, if any. */
export async function getBusinessViewer(
  ctx: QueryCtx | MutationCtx,
): Promise<BusinessViewer | null> {
  void queryCtx;
  const userId = await getAuthUserId(ctx);
  if (userId === null) return null;

  const membership = await ctx.db
    .query("businessMembers")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  if (!membership) return null;

  const business = await ctx.db.get(membership.businessId);
  if (!business) return null;

  return { userId, business, businessId: business._id, role: membership.role };
}

/** Same as getBusinessViewer, but throws instead of returning null. */
export async function requireBusinessViewer(
  ctx: QueryCtx | MutationCtx,
): Promise<BusinessViewer> {
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
export async function requireBusinessOwner(
  ctx: MutationCtx,
): Promise<BusinessViewer> {
  const viewer = await requireBusinessViewer(ctx);
  if (viewer.role !== "owner") {
    throw new ConvexError("Only the GHub owner can do this.");
  }
  return viewer;
}

/** Guard reads/writes so one business's rows can never touch another's. */
export function assertBusinessOwns<Row extends { businessId: Id<"businesses"> }>(
  row: Row | null | undefined,
  businessId: Id<"businesses">,
): asserts row is Row {
  if (!row || row.businessId !== businessId) {
    throw new ConvexError("Not found in this workspace.");
  }
}
