import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
// Supported display currencies (initial). Financial records are stored in
// their original currency; these only control display and conversion.
export const SUPPORTED_CURRENCIES = ["KES", "USD"];
export const DEFAULT_DISPLAY_CURRENCY = "USD";
export const DEFAULT_HOUSEHOLD_CURRENCY = "KES";
// default user roles. can add / remove based on the project as needed
export const ROLES = {
    ADMIN: "admin",
    USER: "user",
    MEMBER: "member",
};
export const roleValidator = v.union(v.literal(ROLES.ADMIN), v.literal(ROLES.USER), v.literal(ROLES.MEMBER));
/** Who can see and edit a shared money workspace. */
export const memberRoleValidator = v.union(v.literal("owner"), v.literal("member"));
/** The kinds of places money can sit. */
export const accountKindValidator = v.union(v.literal("checking"), v.literal("savings"), v.literal("current"), v.literal("credit"), v.literal("cash"), v.literal("mpesa"), v.literal("mobile_money"), v.literal("sacco"), v.literal("money_market"), v.literal("loan"), v.literal("mortgage"), v.literal("investment"), v.literal("brokerage"), v.literal("pension"), v.literal("crypto"), v.literal("property"), v.literal("other"));
/** Money in vs money out vs money moved between your own accounts. */
export const directionValidator = v.union(v.literal("in"), v.literal("out"), v.literal("transfer"));
/** Whether an investment return estimate is quoted per year or per month. */
export const returnBasisValidator = v.union(v.literal("annual"), v.literal("monthly"));
/** How often a scheduled item repeats (used for projections). */
export const frequencyValidator = v.union(v.literal("weekly"), v.literal("biweekly"), v.literal("semimonthly"), v.literal("monthly"));
/** Budget period shape. */
export const budgetPeriodValidator = v.union(v.literal("monthly"), v.literal("annual"), v.literal("custom"));
/** The flavours of debt the debt manager tracks. */
export const debtTypeValidator = v.union(v.literal("personal_loan"), v.literal("bank_loan"), v.literal("sacco_loan"), v.literal("mortgage"), v.literal("car_loan"), v.literal("credit_card"), v.literal("student_loan"), v.literal("family_loan"), v.literal("business_loan"), v.literal("other"));
const schema = defineSchema({
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
        currency: v.string(), // default display currency for the workspace (repurposed; UI can override)
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
        currency: v.optional(v.string()), // defaults to the account/household currency
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
        currency: v.optional(v.string()), // defaults to the household currency
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
        currency: v.optional(v.string()), // defaults to the household currency
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
        currency: v.optional(v.string()), // defaults to the household currency
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
        currency: v.optional(v.string()), // defaults to the household currency
        source: v.optional(v.union(v.literal("auto"), v.literal("manual"))),
        createdAt: v.number(),
    })
        .index("by_household_date", ["householdId", "date"])
        .index("by_household", ["householdId"]), // Workspace-specific custom categories (built-ins live in code).
    categories: defineTable({
        householdId: v.id("households"),
        name: v.string(),
        kind: v.union(v.literal("income"), v.literal("expense")),
        createdAt: v.number(),
    }).index("by_household", ["householdId"]),
    // ---------------------------------------------------------------
    // GHub Technology Solutions — separately permissioned business
    // workspace. Additive-only: no existing table or index is changed.
    // Money fields remain integer cents.
    // ---------------------------------------------------------------
    // Exchange rates for display-currency conversion. Stored natively in
    // `fromCurrency -> toCurrency`; never generated on the fly. Users can
    // add/manage these manually; the app never fabricates a rate.
    currencyRates: defineTable({
        fromCurrency: v.string(),
        toCurrency: v.string(),
        exchangeRate: v.number(), // 1 USD = X KES (positive, > 0)
        effectiveDate: v.number(), // ms epoch of the day this rate is valid from
        source: v.string(), // e.g. "manual", "Central Bank of Kenya", "RBA"
        createdBy: v.id("users"),
        createdAt: v.number(),
    })
        .index("by_from", ["fromCurrency", "toCurrency", "effectiveDate"])
        .index("by_to", ["toCurrency", "effectiveDate"]),
    // The business entity itself. Created on demand; never shares the
    // household's membership list.
    businesses: defineTable({
        name: v.string(), // "GHub Technology Solutions"
        currency: v.string(), // default display currency for this business (KES)
        createdBy: v.id("users"),
        createdAt: v.number(),
    }).index("by_created_by", ["createdBy"]),
    // Explicit business membership. Household members get nothing here
    // unless they are separately added.
    businessMembers: defineTable({
        businessId: v.id("businesses"),
        userId: v.id("users"),
        role: memberRoleValidator, // owner | member
        joinedAt: v.number(),
    })
        .index("by_user", ["userId"])
        .index("by_business", ["businessId"]),
    // Sales pipeline. A lead starts as a lead; conversion moves it to a
    // client row instead of duplicating records.
    clients: defineTable({
        businessId: v.id("businesses"),
        isClient: v.boolean(), // false = still a lead
        businessName: v.string(),
        contactPerson: v.string(),
        contactEmail: v.optional(v.string()),
        contactPhone: v.optional(v.string()),
        category: v.string(), // business category
        source: v.string(), // lead source
        serviceRequired: v.string(),
        estimatedValueCents: v.number(), // estimated contract value
        stage: v.string(), // SalesStage
        lastContactDate: v.optional(v.number()),
        nextFollowUp: v.optional(v.number()),
        notes: v.optional(v.string()),
        activityLog: v.optional(v.array(v.string())), // timestamped history entries
        convertedClientId: v.optional(v.id("clients")), // when converted from a lead
        // Phase 4 — pipeline additions (all optional; schemaValidation is off so
        // pre-existing rows remain valid).
        location: v.optional(v.string()),
        probability: v.optional(v.number()), // 0..100, else stage default
        closedAtMs: v.optional(v.number()), // set when Won/Lost
        assignedOwner: v.optional(v.id("users")),
        archived: v.boolean(),
        createdBy: v.id("users"),
        createdAt: v.number(),
    })
        .index("by_business", ["businessId"])
        .index("by_business_stage", ["businessId", "stage"]),
    // Quotations with line items.
    proposals: defineTable({
        businessId: v.id("businesses"),
        clientId: v.id("clients"),
        title: v.string(),
        items: v.array(v.object({
            description: v.string(),
            qty: v.number(),
            unitPriceCents: v.number(),
        })),
        totalCents: v.number(),
        status: v.union(v.literal("draft"), v.literal("sent"), v.literal("accepted"), v.literal("rejected")),
        sentAt: v.optional(v.number()),
        decidedAt: v.optional(v.number()),
        createdBy: v.id("users"),
        createdAt: v.number(),
    }).index("by_business", ["businessId"]),
    // Service contracts and retainer agreements.
    contracts: defineTable({
        businessId: v.id("businesses"),
        clientId: v.id("clients"),
        proposalId: v.optional(v.id("proposals")),
        title: v.string(),
        startDate: v.number(),
        endDate: v.optional(v.number()),
        billingFrequency: frequencyValidator, // weekly..monthly
        billingAmountCents: v.number(),
        status: v.union(v.literal("active"), v.literal("paused"), v.literal("ended")),
        // Retainers feed MRR; one-off service contracts don't.
        isRetainer: v.boolean(),
        createdBy: v.id("users"),
        createdAt: v.number(),
    }).index("by_business", ["businessId"]),
    // Invoices with eTIMS reference storage (manual, integration-neutral).
    invoices: defineTable({
        businessId: v.id("businesses"),
        clientId: v.id("clients"),
        contractId: v.optional(v.id("contracts")),
        number: v.string(), // human invoice number
        amountCents: v.number(),
        issueDate: v.number(),
        dueDate: v.number(),
        paidCents: v.number(), // sum of allocations — maintained server-side
        status: v.union(v.literal("draft"), v.literal("issued"), v.literal("partially_paid"), v.literal("paid"), v.literal("overdue")),
        etimsRef: v.optional(v.string()), // manually stored KRA eTIMS reference
        etimsStatus: v.optional(v.union(v.literal("none"), v.literal("submitted"), v.literal("acknowledged"))),
        attachments: v.optional(v.array(v.string())), // storage keys / links
        notes: v.optional(v.string()),
        createdBy: v.id("users"),
        createdAt: v.number(),
    })
        .index("by_business", ["businessId"])
        .index("by_business_status", ["businessId", "status"]),
    // Payment allocations against invoices.
    invoicePayments: defineTable({
        businessId: v.id("businesses"),
        invoiceId: v.id("invoices"),
        amountCents: v.number(), // positive cents applied to the invoice
        method: v.string(), // M-PESA, bank transfer, cash…
        reference: v.optional(v.string()),
        receivedAt: v.number(),
        createdBy: v.id("users"),
        createdAt: v.number(),
    }).index("by_invoice", ["invoiceId"]),
    // The business P&L ledger: revenue, expenses, salaries, drawings,
    // capital contributions, transfers. All amounts in integer cents.
    businessLedger: defineTable({
        businessId: v.id("businesses"),
        direction: directionValidator, // in / out / transfer
        amount: v.number(), // positive cents
        category: v.string(),
        description: v.string(),
        date: v.number(),
        linkedInvoiceId: v.optional(v.id("invoices")), // cash received against an invoice
        linkedGoalId: v.optional(v.id("goals")), // money-market-fund tracking
        transferTarget: v.optional(v.string()), // "household" marker for owner moves
        createdBy: v.id("users"),
        createdAt: v.number(),
    }).index("by_business", ["businessId"]),
    // Year-1 roadmap milestones. Targets are user-editable values, never
    // derived from financial data.
    milestones: defineTable({
        businessId: v.id("businesses"),
        label: v.string(),
        targetCents: v.number(),
        quarter: v.optional(v.number()), // 1..4 for revenue targets
        kind: v.union(v.literal("revenue"), v.literal("mmf_contributions"), v.literal("net_worth"), v.literal("mrr")),
        startDate: v.number(),
        endDate: v.number(),
        createdBy: v.id("users"),
        createdAt: v.number(),
    }).index("by_business", ["businessId"]),
    // Tiny per-user preference stores: business-view switch and display
    // currency for conversion.
    userSettings: defineTable({
        userId: v.id("users"),
        bizView: v.optional(v.union(v.literal("personal"), v.literal("ghub"), v.literal("consolidated"))),
        displayCurrency: v.optional(v.string()), // e.g. "KES" / "USD"
    }).index("by_user", ["userId"]),
    // Persisted export payload (REGEXPEXCLUDED, snapshot of real records).
    exportPayload: defineTable({
        householdId: v.id("households"),
        exportedAt: v.number(),
        personal: v.optional(v.string()), // JSON
        business: v.optional(v.string()), // JSON
        investments: v.optional(v.string()), // JSON
        roadmap: v.optional(v.string()), // JSON
        createdAt: v.number(),
    }).index("by_household_exported_at", ["householdId", "exportedAt"]),
    // ---------------------------------------------------------------
    // Phase 2 — Investment Management. Personal workspace (household-
    // scoped), separate from GHub business money. Quantities are fixed-
    // point micro-units (1 share = 1_000_000); amounts are integer cents.
    // ---------------------------------------------------------------
    // A tradable/holdable security or asset.
    securities: defineTable({
        householdId: v.id("households"),
        symbol: v.string(), // "SCOM", "SMWF"…
        name: v.string(),
        assetClass: v.union(v.literal("equity"), v.literal("etf"), v.literal("money_market_fund"), v.literal("sacco_deposit"), v.literal("sacco_share_capital"), v.literal("treasury_bill"), v.literal("treasury_bond"), v.literal("infrastructure_bond")),
        // Starting positions entered manually; unknown cost bases stay null
        // until the user supplies them.
        costBasisCents: v.optional(v.number()), // null = requires user entry
        brokerageAccountId: v.optional(v.id("accounts")), // cash pool for trades
        createdAt: v.number(),
    }).index("by_household", ["householdId"]),
    // Manual price entries with timestamp and source — never live data.
    securityPrices: defineTable({
        securityId: v.id("securities"),
        priceCents: v.number(),
        source: v.string(), // "manual", broker statement, NSE close…
        recordedAt: v.number(),
        createdBy: v.id("users"),
    }).index("by_security", ["securityId"]),
    // The investment transaction ledger. Distinct from the household
    // ledger and from the GHub business ledger.
    investTxns: defineTable({
        householdId: v.id("households"),
        securityId: v.id("securities"),
        kind: v.union(v.literal("purchase"), v.literal("sale"), v.literal("dividend"), v.literal("interest"), v.literal("fee"), v.literal("contribution"), v.literal("withdrawal"), v.literal("split"), v.literal("adjustment")),
        qtyMicro: v.optional(v.number()), // fixed-point; required for unit kinds
        amountCents: v.number(), // signed cash effect: buys negative, sales/dividends positive
        feeCents: v.optional(v.number()),
        cashAccountId: v.optional(v.id("accounts")), // brokerage cash pool
        realizedGainCents: v.optional(v.number()), // filled on sales
        note: v.optional(v.string()),
        date: v.number(),
        createdBy: v.id("users"),
        createdAt: v.number(),
    }).index("by_household", ["householdId"])
        .index("by_security", ["securityId"]),
    // Allocation cycle templates (A/B/C percentages) and pause flag.
    investAllocations: defineTable({
        householdId: v.id("households"),
        cycle: v.union(v.literal("A"), v.literal("B"), v.literal("C")),
        securityId: v.id("securities"),
        pct: v.number(), // 0..100, cycle must total exactly 100
        active: v.boolean(),
    }).index("by_household", ["householdId"]),
    // Planner runs: budget, carried-forward cash, computed plan (no trades).
    investPlans: defineTable({
        householdId: v.id("households"),
        monthKey: v.string(), // "2026-10"
        budgetCents: v.number(),
        carriedInCents: v.number(),
        carriedOutCents: v.number(),
        result: v.optional(v.string()), // JSON snapshot of PlannerResult
        paused: v.boolean(),
        createdAt: v.number(),
    }).index("by_household", ["householdId"]),
    // Audit trail for valuations, manual corrections and transactions.
    investAudit: defineTable({
        householdId: v.id("households"),
        action: v.string(), // "price_update", "adjustment", "txn_created"…
        detail: v.string(),
        refId: v.optional(v.string()),
        createdBy: v.id("users"),
        createdAt: v.number(),
    }).index("by_household", ["householdId"]),
    // Multi-roadmap registry (30/33-year plans arrive in later phases;
    // this phase only defines the two roadmaps' metadata).
    roadmapDefinitions: defineTable({
        householdId: v.id("households"),
        key: v.string(), // "nse_strategy", "ghub_master"
        title: v.string(),
        startDate: v.number(),
        endDate: v.number(),
        visionTargets: v.optional(v.string()), // JSON; kept separate from actuals
    }).index("by_household_key", ["householdId", "key"]),
    // ---------------------------------------------------------------
    // Phase 4 Sprint 1 — CEO Command Center & lead pipeline.
    // Activity rows are execution goals, NOT financial transactions.
    // ---------------------------------------------------------------
    // GHub service catalogue (drives proposal item prefill).
    services: defineTable({
        businessId: v.id("businesses"),
        name: v.string(),
        description: v.optional(v.string()),
        priceMinCents: v.number(),
        priceMaxCents: v.number(),
        active: v.boolean(),
        createdBy: v.id("users"),
        createdAt: v.number(),
    }).index("by_business", ["businessId"]),
    // Weekly CEO activity counts (lead generation goals, not money).
    ceoActivities: defineTable({
        businessId: v.id("businesses"),
        kind: v.string(), // ActivityKind
        weekStartMs: v.number(), // Monday 00:00 UTC bucket
        count: v.number(), // positive integer
        createdBy: v.id("users"),
        createdAt: v.number(),
    })
        .index("by_business_week", ["businessId", "weekStartMs"])
        .index("by_business", ["businessId"]),
    // Editable weekly activity targets, per business.
    activityTargets: defineTable({
        businessId: v.id("businesses"),
        kind: v.string(), // ActivityKind
        targetPerWeek: v.number(), // non-negative integer
        updatedBy: v.id("users"),
        updatedAt: v.number(),
    }).index("by_business", ["businessId"]),
}, {
    schemaValidation: false,
});
export default schema;
