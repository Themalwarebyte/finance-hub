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
  v.literal("current"),
  v.literal("credit"),
  v.literal("cash"),
  v.literal("mpesa"),
  v.literal("mobile_money"),
  v.literal("sacco"),
  v.literal("money_market"),
  v.literal("loan"),
  v.literal("mortgage"),
  v.literal("investment"),
  v.literal("brokerage"),
  v.literal("pension"),
  v.literal("crypto"),
  v.literal("property"),
  v.literal("other"),
);

/** Money in vs money out vs money moved between your own accounts. */
export const directionValidator = v.union(
  v.literal("in"),
  v.literal("out"),
  v.literal("transfer"),
);

/** Whether an investment return estimate is quoted per year or per month. */
export const returnBasisValidator = v.union(
  v.literal("annual"),
  v.literal("monthly"),
);

/** How often a scheduled item repeats (used for projections). */
export const frequencyValidator = v.union(
  v.literal("weekly"),
  v.literal("biweekly"),
  v.literal("semimonthly"),
  v.literal("monthly"),
);

/** Budget period shape. */
export const budgetPeriodValidator = v.union(
  v.literal("monthly"),
  v.literal("annual"),
  v.literal("custom"),
);

/** The flavours of debt the debt manager tracks. */
export const debtTypeValidator = v.union(
  v.literal("personal_loan"),
  v.literal("bank_loan"),
  v.literal("sacco_loan"),
  v.literal("mortgage"),
  v.literal("car_loan"),
  v.literal("credit_card"),
  v.literal("student_loan"),
  v.literal("family_loan"),
  v.literal("business_loan"),
  v.literal("other"),
);

export type AccountKind = Infer<typeof accountKindValidator>;
export type Direction = Infer<typeof directionValidator>;
export type Frequency = Infer<typeof frequencyValidator>;
export type MemberRole = Infer<typeof memberRoleValidator>;
export type BudgetPeriod = Infer<typeof budgetPeriodValidator>;
export type DebtType = Infer<typeof debtTypeValidator>;
export type ReturnBasis = Infer<typeof returnBasisValidator>;

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

    // Every place money sits: bank, cash, M-PESA, SACCO, cards, loans, investments.
    accounts: defineTable({
      householdId: v.id("households"),
      name: v.string(),
      kind: accountKindValidator,
      institution: v.optional(v.string()),
      openingBalance: v.number(), // cents
      color: v.string(),
      archived: v.boolean(),
      // Optional extensions (all optional for backward compatibility).
      reference: v.optional(v.string()), // account number / reference
      notes: v.optional(v.string()),
      currency: v.optional(v.string()), // defaults to the household currency
      includeInNetWorth: v.optional(v.boolean()), // default true
      // Investment return estimate: annual/monthly percentage used to grow the
      // projected balance of this account over the projection window.
      estimatedReturnPct: v.optional(v.number()),
      returnBasis: v.optional(returnBasisValidator),
      createdAt: v.number(),
    }).index("by_household", ["householdId"]),

    // The central ledger: income, expenses, transfers, debt payments,
    // goal contributions — everything flows through this one table.
    transactions: defineTable({
      householdId: v.id("households"),
      accountId: v.id("accounts"),
      direction: directionValidator,
      amount: v.number(), // positive cents
      description: v.string(),
      category: v.string(),
      date: v.number(), // ms epoch (transaction date)
      createdBy: v.id("users"),
      createdAt: v.number(),
      // Optional extensions.
      transferAccountId: v.optional(v.id("accounts")), // destination for transfers
      subcategory: v.optional(v.string()),
      merchant: v.optional(v.string()),
      notes: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
      paymentMethod: v.optional(v.string()),
      goalId: v.optional(v.id("goals")),
      debtId: v.optional(v.id("debts")),
      interestPortion: v.optional(v.number()), // of a debt payment
      status: v.optional(v.union(v.literal("cleared"), v.literal("pending"))),
      recurringId: v.optional(v.id("recurring")),
    })
      .index("by_household", ["householdId", "date"])
      .index("by_account", ["accountId"])
      .index("by_household_category", ["householdId", "category"])
      .index("by_goal", ["goalId"])
      .index("by_debt", ["debtId"]),

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

    // Spending plans per category over a period. Analyzed against transactions.
    budgets: defineTable({
      householdId: v.id("households"),
      name: v.string(),
      category: v.string(), // budget covers this category
      subcategory: v.optional(v.string()),
      period: budgetPeriodValidator,
      amount: v.number(), // positive cents per period
      startDate: v.number(), // ms epoch of the current period start
      endDate: v.optional(v.number()), // required when period = custom
      rollover: v.optional(v.boolean()),
      rolloverCents: v.optional(v.number()), // carried-in amount for this period
      active: v.boolean(),
      createdBy: v.id("users"),
      createdAt: v.number(),
    }).index("by_household", ["householdId"]),

    // Savings goals. Progress derives from transactions tagged with the goal.
    goals: defineTable({
      householdId: v.id("households"),
      name: v.string(),
      description: v.optional(v.string()),
      targetAmount: v.number(), // positive cents
      targetDate: v.optional(v.number()),
      linkedAccountId: v.optional(v.id("accounts")), // where savings land
      contributionAmount: v.optional(v.number()), // planned per month
      archived: v.optional(v.boolean()),
      completedAt: v.optional(v.number()),
      createdBy: v.id("users"),
      createdAt: v.number(),
    }).index("by_household", ["householdId"]),

    // Debts tracked alongside their payment history (transactions with debtId).
    debts: defineTable({
      householdId: v.id("households"),
      name: v.string(),
      type: debtTypeValidator,
      lender: v.optional(v.string()),
      originalAmount: v.number(), // positive cents
      outstandingBalance: v.number(), // positive cents owed right now
      interestRatePct: v.optional(v.number()), // annual
      monthlyPayment: v.number(), // positive cents
      paymentFrequency: v.optional(frequencyValidator), // default monthly
      nextDueDate: v.optional(v.number()),
      startDate: v.optional(v.number()),
      expectedPayoffDate: v.optional(v.number()),
      linkedAccountId: v.optional(v.id("accounts")), // the loan/card account
      notes: v.optional(v.string()),
      archived: v.optional(v.boolean()),
      createdBy: v.id("users"),
      createdAt: v.number(),
    }).index("by_household", ["householdId"]),

    // Daily net-worth history so growth over time is visible.
    netWorthSnapshots: defineTable({
      householdId: v.id("households"),
      date: v.number(), // ms epoch anchored to the start of a UTC day
      netWorth: v.number(), // cents
      assets: v.number(), // cents
      liabilities: v.number(), // cents (positive number owed)
      source: v.optional(v.union(v.literal("auto"), v.literal("manual"))),
      createdAt: v.number(),
    })
      .index("by_household_date", ["householdId", "date"])
      .index("by_household", ["householdId"]),

    // Workspace-specific custom categories (built-ins live in code).
    categories: defineTable({
      householdId: v.id("households"),
      name: v.string(),
      kind: v.union(v.literal("income"), v.literal("expense")),
      createdAt: v.number(),
    }).index("by_household", ["householdId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
