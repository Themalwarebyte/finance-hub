import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  assertBusinessOwns,
  requireBusinessOwner,
  requireBusinessViewer,
} from "./businessAccess";
import type { Id } from "./_generated/dataModel";
import {
  DAY_MS,
  operatingExpensesCents,
  progressPct,
  projectedEnd,
  expectedPct,
  quarterIndex,
  receivablesCents,
  ROADMAP_START,
  ROADMAP_END,
  runwayMonths,
  INITIAL_TARGETS,
  QUARTERLY_TARGETS,
  MONTH_MS,
} from "../lib/business";

// ---------------------------------------------------------------------------
// Workspace bootstrap & membership
// ---------------------------------------------------------------------------

export const ensureBusiness = mutation({
  args: { name: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError("Sign in first.");

    const existing = await ctx.db
      .query("businessMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) {
      const business = await ctx.db.get(existing.businessId);
      if (business) return business._id;
    }

    const businessId = await ctx.db.insert("businesses", {
      name: args.name ?? "GHub Technology Solutions",
      currency: "KES",
      createdBy: userId,
      createdAt: Date.now(),
    });
    await ctx.db.insert("businessMembers", {
      businessId,
      userId,
      role: "owner",
      joinedAt: Date.now(),
    });
    return businessId;
  },
});

export const myBusiness = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireBusinessViewer(ctx);
    const members = await ctx.db
      .query("businessMembers")
      .withIndex("by_business", (q) => q.eq("businessId", viewer.businessId))
      .collect();
    const withUsers = await Promise.all(
      members.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        return {
          userId: m.userId,
          role: m.role,
          name: user?.name ?? null,
          email: user?.email ?? null,
        };
      }),
    );
    return { business: viewer.business, role: viewer.role, members: withUsers };
  },
});

/** Owner adds a member; household links are never implied. */
export const addBusinessMember = mutation({
  args: { email: v.string(), role: v.union(v.literal("owner"), v.literal("member")) },
  handler: async (ctx, args) => {
    const viewer = await requireBusinessOwner(ctx);
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
    if (!user) throw new ConvexError("No user with that email has signed in yet.");
    const already = await ctx.db
      .query("businessMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (already) throw new ConvexError("That user is already a member.");
    const businessId = viewer.businessId;
    await ctx.db.insert("businessMembers", {
      businessId,
      userId: user._id,
      role: args.role,
      joinedAt: Date.now(),
    });
  },
});

export const removeBusinessMember = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const viewer = await requireBusinessOwner(ctx);
    if (args.userId === viewer.userId)
      throw new ConvexError("You can't remove yourself.");
    const row = await ctx.db
      .query("businessMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    if (!row) return;
    assertBusinessOwns(row, viewer.businessId);
    await ctx.db.delete(row._id);
  },
});

// ---------------------------------------------------------------------------
// Business ledger
// ---------------------------------------------------------------------------

const ledgerEntry = {
  direction: v.union(v.literal("in"), v.literal("out")),
  amount: v.number(), // positive cents
  category: v.string(),
  description: v.string(),
  date: v.number(),
  linkedInvoiceId: v.optional(v.id("invoices")),
};

export const addLedgerEntry = mutation({
  args: ledgerEntry,
  handler: async (ctx, args) => {
    const viewer = await requireBusinessViewer(ctx);
    if (!(args.amount > 0) || !Number.isInteger(args.amount))
      throw new ConvexError("Amount must be a positive whole number of cents.");
    return ctx.db.insert("businessLedger", {
      businessId: viewer.businessId,
      direction: args.direction,
      amount: args.amount,
      category: args.category,
      description: args.description,
      date: args.date,
      linkedInvoiceId: args.linkedInvoiceId,
      createdBy: viewer.userId,
      createdAt: Date.now(),
    });
  },
});

export const removeLedgerEntry = mutation({
  args: { entryId: v.id("businessLedger") },
  handler: async (ctx, args) => {
    const viewer = await requireBusinessOwner(ctx);
    const row = await ctx.db.get(args.entryId);
    assertBusinessOwns(row, viewer.businessId);
    await ctx.db.delete(args.entryId);
  },
});

export const listLedger = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireBusinessViewer(ctx);
    return ctx.db
      .query("businessLedger")
      .withIndex("by_business", (q) => q.eq("businessId", viewer.businessId))
      .collect();
  },
});

// ---------------------------------------------------------------------------
// Dashboard numbers — all derived from recorded data only
// ---------------------------------------------------------------------------

/** Calendar year window (Jan 1 .. now) for YTD figures. */
function yearStart(now: number): number {
  return new Date(new Date(now).getFullYear(), 0, 1).getTime();
}

export const overview = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireBusinessViewer(ctx);
    const now = Date.now();

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

    const ytdStart = yearStart(now);
    const ytdLedger = ledger.filter((row) => row.date >= ytdStart);

    // ---- Revenue & expense distinctions (accrual accounting model) ----
    // billedRevenue    : non-draft invoices issued (an accrual event, NOT
    //                    recognition on its own).
    // cashCollected    : invoice payments received (cash event).
    // recognizedRevenue: PROVISIONAL — equals billed until delivery tracking
    //                    exists; clearly labelled, never used for taxes.
    // customerPrepayments: cash received before any invoice (a liability,
    //                    never revenue).
    const invoicedRevenueCents = invoices
      .filter((i) => i.status !== "draft")
      .reduce((s, i) => s + i.amountCents, 0);
    const cashFromInvoicesCents = invoices.reduce((s, i) => s + i.paidCents, 0);
    const customerPrepaymentsCents = ytdLedger
      .filter((row) => row.direction === "in" && row.category === "Customer Prepayment")
      .reduce((s, row) => s + row.amount, 0);
    const otherCashRevenueCents = ytdLedger
      .filter(
        (row) =>
          row.direction === "in" &&
          !row.linkedInvoiceId &&
          row.category !== "Customer Prepayment",
      )
      .reduce((s, row) => s + row.amount, 0);

    // Backward-compatible aliases kept for existing UI:
    const earnedRevenueCents = invoicedRevenueCents; // provisional recognition
    const revenueYtd = earnedRevenueCents;
    const cashCollected = cashFromInvoicesCents + otherCashRevenueCents;
    const opex = operatingExpensesCents(
      ytdLedger.map((row) => ({
        direction: row.direction,
        amount: row.amount,
        category: row.category,
      })),
    );
    const salaries = ytdLedger
      .filter((row) => row.direction === "out" && row.category === "Salaries")
      .reduce((s, row) => s + row.amount, 0);
    const netOperatingProfit = revenueYtd - opex;
    const availableCash = cashCollected - (opex + salaries) > 0
      ? cashCollected - opex - salaries
      : 0;
    const receivables = receivablesCents(
      invoices
        .filter((i) => i.status !== "draft")
        .map((i) => ({
          amountCents: i.amountCents,
          paidCents: i.paidCents,
          status: i.status,
        })),
    );

    // ---- Retainers & MRR ------------------------------------------------
    const activeRetainers = contracts.filter(
      (c) => c.status === "active" && c.isRetainer,
    );
    // Monthly-equivalent MRR from billing frequency (integer cents).
    const monthlyFactor: Record<string, number> = {
      weekly: 52 / 12,
      biweekly: 26 / 12,
      semimonthly: 24 / 12,
      monthly: 1,
    };
    const mrrCents = activeRetainers.reduce(
      (sum, c) => sum + Math.round(c.billingAmountCents * (monthlyFactor[c.billingFrequency] ?? 1)),
      0,
    );

    // ---- Runway (documented assumption: average monthly opex over YTD) --
    const monthsElapsed = Math.max(1, Math.round((now - ytdStart) / MONTH_MS));
    const monthlyBurn = Math.round(opex / monthsElapsed);
    const runway = runwayMonths(availableCash, monthlyBurn);

    // ---- Client counts --------------------------------------------------
    const activeRetainerClients = new Set(activeRetainers.map((c) => c.clientId)).size;
    const openLeads = clients.filter((c) => !c.isClient);

    return {
      currency: viewer.business.currency,
      generatedAt: now,
      revenueYtd,
      cashCollected,
      operatingExpenses: opex,
      netOperatingProfit,
      availableCash,
      mrrCents,
      activeRetainerClients,
      runwayMonths: runway,
      invoicedRevenueYtd: invoicedRevenueCents,
      billedRevenueYtd: invoicedRevenueCents,
      earnedRevenueYtd: earnedRevenueCents,
      recognizedRevenueYtd: earnedRevenueCents, // PROVISIONAL (see assumptions)
      customerPrepaymentsCents,
      // Receivables: unpaid issued invoices (the old "unearned" label was
      // misleading — this is an accounts-receivable metric).
      receivables,
      salaries,
      openLeadCount: openLeads.length,
      assumptions: {
        runway:
          "Runway = available business cash / average monthly operating expenses over YTD.",
        earned:
          "PROVISIONAL: recognized revenue currently equals billed (issued) invoices because delivery tracking is not implemented. Billed, collected, receivables and customer prepayments are reported separately.",
      },
    };
  },
});

// ---------------------------------------------------------------------------
// Roadmap: Year 1 (Oct 2026 -> Sep 2027)
// ---------------------------------------------------------------------------

/** Seed the editable roadmap with the user's Year-1 targets. Idempotent. */
export const seedMilestones = mutation({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireBusinessOwner(ctx);
    const existing = await ctx.db
      .query("milestones")
      .withIndex("by_business", (q) => q.eq("businessId", viewer.businessId))
      .first();
    if (existing) return; // already seeded

    const seed = [
      { label: "Annual revenue", kind: "revenue" as const, targetCents: INITIAL_TARGETS.annualRevenueCents, quarter: undefined },
      { label: "Money market fund contributions", kind: "mmf_contributions" as const, targetCents: INITIAL_TARGETS.mmfContributionsCents, quarter: undefined },
      { label: "Year-end net worth", kind: "net_worth" as const, targetCents: INITIAL_TARGETS.yearEndNetWorthCents, quarter: undefined },
      { label: "Monthly recurring revenue", kind: "mrr" as const, targetCents: INITIAL_TARGETS.monthlyRecurringRevenueCents, quarter: undefined },
      ...QUARTERLY_TARGETS.map((targetCents, index) => ({
        label: `Q${index + 1} revenue target`,
        kind: "revenue" as const,
        targetCents,
        quarter: index + 1,
      })),
    ];

    for (const item of seed) {
      await ctx.db.insert("milestones", {
        businessId: viewer.businessId,
        label: item.label,
        targetCents: item.targetCents,
        quarter: item.quarter ?? undefined,
        kind: item.kind,
        startDate: ROADMAP_START,
        endDate: ROADMAP_END,
        createdBy: viewer.userId,
        createdAt: Date.now(),
      });
    }
  },
});

export const listMilestones = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireBusinessViewer(ctx);
    return ctx.db
      .query("milestones")
      .withIndex("by_business", (q) => q.eq("businessId", viewer.businessId))
      .collect();
  },
});

/** Owner edits a roadmap target — targets are never auto-derived. */
export const updateMilestoneTarget = mutation({
  args: { milestoneId: v.id("milestones"), targetCents: v.number() },
  handler: async (ctx, args) => {
    const viewer = await requireBusinessOwner(ctx);
    const row = await ctx.db.get(args.milestoneId);
    assertBusinessOwns(row, viewer.businessId);
    if (!(args.targetCents >= 0) || !Number.isInteger(args.targetCents))
      throw new ConvexError("Target must be a non-negative whole number of cents.");
    await ctx.db.patch(args.milestoneId, { targetCents: args.targetCents });
  },
});

/** Roadmap progress computed from real ledger/invoice data. */
export const roadmapProgress = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireBusinessViewer(ctx);
    const now = Date.now();

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
    const milestones = await ctx.db
      .query("milestones")
      .withIndex("by_business", (q) => q.eq("businessId", viewer.businessId))
      .collect();

    const ytdStart = yearStart(now);
    const revenues = ledger
      .filter((row) => row.direction === "in" && row.category !== "Owner Capital")
      .map((row) => ({ date: row.date, amountCents: row.amount }));

    const revenueYtd = Math.max(
      invoices.filter((i) => i.status !== "draft").reduce((s, i) => s + i.amountCents, 0),
      revenues.reduce((s, r) => s + r.amountCents, 0),
    );

    const activeRetainers = contracts.filter((c) => c.status === "active" && c.isRetainer);
    const monthlyFactor: Record<string, number> = {
      weekly: 52 / 12,
      biweekly: 26 / 12,
      semimonthly: 24 / 12,
      monthly: 1,
    };
    const mrrCents = activeRetainers.reduce(
      (sum, c) => sum + Math.round(c.billingAmountCents * (monthlyFactor[c.billingFrequency] ?? 1)),
      0,
    );

    const mmfCents = ledger
      .filter((row) => row.direction === "out" && row.category === "Money Market Fund")
      .reduce((s, row) => s + row.amount, 0);

    const netWorthCents =
      cashFromLedger(ledger) -
      ledger
        .filter((row) => row.direction === "out" && row.category === "Liabilities")
        .reduce((s, row) => s + row.amount, 0);

    const elapsed = Math.max(0, now - ROADMAP_START);
    const total = ROADMAP_END - ROADMAP_START;

    return milestones.map((m) => {
      const actualCents =
        m.kind === "revenue"
          ? revenueYtd
          : m.kind === "mmf_contributions"
            ? mmfCents
            : m.kind === "mrr"
              ? mrrCents
              : netWorthCents;
      return {
        _id: m._id,
        label: m.label,
        kind: m.kind,
        quarter: m.quarter ?? null,
        targetCents: m.targetCents,
        actualCents,
        progressPct: progressPct(actualCents, m.targetCents),
        expectedPct: expectedPct(elapsed, total),
        projectedEndCents: projectedEnd(actualCents, elapsed, total),
      };
    });
  },
});

function cashFromLedger(ledger: { direction: string; amount: number }[]): number {
  return ledger.reduce(
    (sum, row) => sum + (row.direction === "in" ? row.amount : -row.amount),
    0,
  );
}

void DAY_MS;
