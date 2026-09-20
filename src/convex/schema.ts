import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

/** Who can see and edit a shared money workspace. */
export const memberRoleValidator = v.union(
  v.literal("owner"),
  v.literal("member"),
);

/** The kinds of places money can sit. */
export const accountKindValidator = v.union(
  v.literal("checking"),
  v.literal("savings"),
  v.literal("credit"),
  v.literal("cash"),
  v.literal("investment"),
);

/** Money in vs money out. */
export const directionValidator = v.union(v.literal("in"), v.literal("out"));

/** How often a scheduled item repeats (used for projections). */
export const frequencyValidator = v.union(
  v.literal("weekly"),
  v.literal("biweekly"),
  v.literal("semimonthly"),
  v.literal("monthly"),
);

export type AccountKind = Infer<typeof accountKindValidator>;
export type Direction = Infer<typeof directionValidator>;
export type Frequency = Infer<typeof frequencyValidator>;
export type MemberRole = Infer<typeof memberRoleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // A household is the shared money workspace. One or two people (you and
    // your partner) share every account, transaction and projection inside it.
    households: defineTable({
      name: v.string(),
      currency: v.string(),
      inviteCode: v.string(),
      createdBy: v.id("users"),
    }).index("by_invite_code", ["inviteCode"]),

    memberships: defineTable({
      householdId: v.id("households"),
      userId: v.id("users"),
      role: memberRoleValidator,
      joinedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_household", ["householdId"]),

    // Every place money sits: checkings, savings, cards, cash, investments.
    accounts: defineTable({
      householdId: v.id("households"),
      name: v.string(),
      kind: accountKindValidator,
      institution: v.optional(v.string()),
      openingBalance: v.number(), // cents
      color: v.string(),
      archived: v.boolean(),
      createdAt: v.number(),
    }).index("by_household", ["householdId"]),

    // Money in / money out.
    transactions: defineTable({
      householdId: v.id("households"),
      accountId: v.id("accounts"),
      direction: directionValidator,
      amount: v.number(), // positive cents
      description: v.string(),
      category: v.string(),
      date: v.number(), // ms epoch
      createdBy: v.id("users"),
      createdAt: v.number(),
    })
      .index("by_household", ["householdId", "date"])
      .index("by_account", ["accountId"]),

    // Recurring money in / money out, used to project balances forward.
    recurring: defineTable({
      householdId: v.id("households"),
      accountId: v.id("accounts"),
      direction: directionValidator,
      amount: v.number(), // positive cents
      description: v.string(),
      category: v.string(),
      frequency: frequencyValidator,
      nextDate: v.number(), // ms epoch of the next occurrence
      endDate: v.optional(v.number()),
      active: v.boolean(),
      createdAt: v.number(),
    }).index("by_household", ["householdId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
