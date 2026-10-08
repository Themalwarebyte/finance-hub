import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  assertBusinessOwns,
  requireBusinessOwner,
  requireBusinessViewer,
} from "./businessAccess";
import type { Id } from "./_generated/dataModel";
import { allocatePayment, SALES_STAGES } from "../lib/business";

// ---------------------------------------------------------------------------
// Leads & clients
// ---------------------------------------------------------------------------

const leadFields = {
  businessName: v.string(),
  contactPerson: v.string(),
  contactEmail: v.optional(v.string()),
  contactPhone: v.optional(v.string()),
  category: v.string(),
  source: v.string(),
  serviceRequired: v.string(),
  estimatedValueCents: v.number(),
  stage: v.string(),
  lastContactDate: v.optional(v.number()),
  nextFollowUp: v.optional(v.number()),
  notes: v.optional(v.string()),
};

function validateStage(stage: string): void {
  if (!(SALES_STAGES as readonly string[]).includes(stage)) {
    throw new ConvexError(`Unknown sales stage: ${stage}`);
  }
}

export const createLead = mutation({
  args: leadFields,
  handler: async (ctx, args) => {
    const viewer = await requireBusinessViewer(ctx);
    validateStage(args.stage);
    return ctx.db.insert("clients", {
      businessId: viewer.businessId,
      isClient: false,
      activityLog: [stamp(viewer.userId, `Lead created (${args.stage})`)],
      archived: false,
      createdBy: viewer.userId,
      createdAt: Date.now(),
      ...args,
    });
  },
});

export const updateLead = mutation({
  args: { leadId: v.id("clients"), ...leadFields },
  handler: async (ctx, args) => {
    const viewer = await requireBusinessViewer(ctx);
    validateStage(args.stage);
    const row = await ctx.db.get(args.leadId);
    assertBusinessOwns(row, viewer.businessId);
    if (row.isClient) throw new ConvexError("Converted clients can't be edited as leads.");
    const { leadId, ...fields } = args;
    void leadId;
    await ctx.db.patch(args.leadId, {
      ...fields,
      activityLog: appendActivity(row.activityLog, stamp(viewer.userId, `Updated (stage: ${fields.stage})`)),
    });
  },
});

export const listLeads = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireBusinessViewer(ctx);
    return ctx.db
      .query("clients")
      .withIndex("by_business", (q) => q.eq("businessId", viewer.businessId))
      .collect();
  },
});

/** Move a lead through the pipeline without touching other fields. */
export const setLeadStage = mutation({
  args: { leadId: v.id("clients"), stage: v.string() },
  handler: async (ctx, args) => {
    const viewer = await requireBusinessViewer(ctx);
    validateStage(args.stage);
    const row = await ctx.db.get(args.leadId);
    assertBusinessOwns(row, viewer.businessId);
    await ctx.db.patch(args.leadId, {
      stage: args.stage,
      activityLog: appendActivity(row.activityLog, stamp(viewer.userId, `Stage changed to ${args.stage}`)),
    });
  },
});

/**
 * Convert a Won opportunity into a client + service contract without
 * duplicating records: the SAME row flips isClient=true and gains a contract.
 */
export const convertToClient = mutation({
  args: {
    leadId: v.id("clients"),
    contract: v.object({
      title: v.string(),
      startDate: v.number(),
      billingFrequency: v.union(
        v.literal("weekly"),
        v.literal("biweekly"),
        v.literal("semimonthly"),
        v.literal("monthly"),
      ),
      billingAmountCents: v.number(),
      isRetainer: v.boolean(),
    }),
  },
  handler: async (ctx, args) => {
    const viewer = await requireBusinessOwner(ctx);
    const row = await ctx.db.get(args.leadId);
    assertBusinessOwns(row, viewer.businessId);
    if (row.isClient) throw new ConvexError("Already converted to a client.");
    if (row.stage !== "Won")
      throw new ConvexError("Only Won opportunities can be converted to clients.");

    const contractId = await ctx.db.insert("contracts", {
      businessId: viewer.businessId,
      clientId: args.leadId,
      title: args.contract.title,
      startDate: args.contract.startDate,
      billingFrequency: args.contract.billingFrequency,
      billingAmountCents: args.contract.billingAmountCents,
      status: args.contract.isRetainer ? ("active") : ("active"),
      isRetainer: args.contract.isRetainer,
      createdBy: viewer.userId,
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.leadId, {
      isClient: true,
      activityLog: appendActivity(row.activityLog, stamp(viewer.userId, "Converted to client with contract")),
    });

    return contractId;
  },
});

// ---------------------------------------------------------------------------
// Proposals (quotations)
// ---------------------------------------------------------------------------

const quoteItem = v.object({
  description: v.string(),
  qty: v.number(),
  unitPriceCents: v.number(),
});

export const createProposal = mutation({
  args: {
    clientId: v.id("clients"),
    title: v.string(),
    items: v.array(quoteItem),
  },
  handler: async (ctx, args) => {
    const viewer = await requireBusinessViewer(ctx);
    const client = await ctx.db.get(args.clientId);
    assertBusinessOwns(client, viewer.businessId);
    const total = args.items.reduce((s, item) => s + item.qty * item.unitPriceCents, 0);
    if (!Number.isInteger(total)) throw new ConvexError("Item totals must resolve to whole cents.");
    return ctx.db.insert("proposals", {
      businessId: viewer.businessId,
      clientId: args.clientId,
      title: args.title,
      items: args.items,
      totalCents: total,
      status: "draft",
      createdBy: viewer.userId,
      createdAt: Date.now(),
    });
  },
});

export const setProposalStatus = mutation({
  args: {
    proposalId: v.id("proposals"),
    status: v.union(
      v.literal("draft"),
      v.literal("sent"),
      v.literal("accepted"),
      v.literal("rejected"),
    ),
  },
  handler: async (ctx, args) => {
    const viewer = await requireBusinessViewer(ctx);
    const row = await ctx.db.get(args.proposalId);
    assertBusinessOwns(row, viewer.businessId);
    await ctx.db.patch(args.proposalId, {
      status: args.status,
      sentAt: args.status === "sent" ? Date.now() : row.sentAt,
      decidedAt: args.status === "accepted" || args.status === "rejected" ? Date.now() : row.decidedAt,
    });
  },
});

export const listProposals = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireBusinessViewer(ctx);
    return ctx.db
      .query("proposals")
      .withIndex("by_business", (q) => q.eq("businessId", viewer.businessId))
      .collect();
  },
});

// ---------------------------------------------------------------------------
// Contracts (incl. recurring retainers)
// ---------------------------------------------------------------------------

export const createContract = mutation({
  args: {
    clientId: v.id("clients"),
    title: v.string(),
    startDate: v.number(),
    endDate: v.optional(v.number()),
    billingFrequency: v.union(
      v.literal("weekly"),
      v.literal("biweekly"),
      v.literal("semimonthly"),
      v.literal("monthly"),
    ),
    billingAmountCents: v.number(),
    isRetainer: v.boolean(),
  },
  handler: async (ctx, args) => {
    const viewer = await requireBusinessViewer(ctx);
    const client = await ctx.db.get(args.clientId);
    assertBusinessOwns(client, viewer.businessId);
    if (!client.isClient)
      throw new ConvexError("Contracts need a converted client, not a lead.");
    if (!(args.billingAmountCents > 0) || !Number.isInteger(args.billingAmountCents))
      throw new ConvexError("Billing amount must be a positive whole number of cents.");
    return ctx.db.insert("contracts", {
      businessId: viewer.businessId,
      clientId: args.clientId,
      title: args.title,
      startDate: args.startDate,
      endDate: args.endDate,
      billingFrequency: args.billingFrequency,
      billingAmountCents: args.billingAmountCents,
      status: "active",
      isRetainer: args.isRetainer,
      createdBy: viewer.userId,
      createdAt: Date.now(),
    });
  },
});

export const setContractStatus = mutation({
  args: {
    contractId: v.id("contracts"),
    status: v.union(v.literal("active"), v.literal("paused"), v.literal("ended")),
  },
  handler: async (ctx, args) => {
    const viewer = await requireBusinessViewer(ctx);
    const row = await ctx.db.get(args.contractId);
    assertBusinessOwns(row, viewer.businessId);
    await ctx.db.patch(args.contractId, { status: args.status });
  },
});

export const listContracts = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireBusinessViewer(ctx);
    return ctx.db
      .query("contracts")
      .withIndex("by_business", (q) => q.eq("businessId", viewer.businessId))
      .collect();
  },
});

// ---------------------------------------------------------------------------
// Invoices + payment allocation
// ---------------------------------------------------------------------------

export const createInvoice = mutation({
  args: {
    clientId: v.id("clients"),
    contractId: v.optional(v.id("contracts")),
    amountCents: v.number(),
    issueDate: v.number(),
    dueDate: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireBusinessViewer(ctx);
    const client = await ctx.db.get(args.clientId);
    assertBusinessOwns(client, viewer.businessId);
    if (!(args.amountCents > 0) || !Number.isInteger(args.amountCents))
      throw new ConvexError("Invoice amount must be a positive whole number of cents.");
    const existing = await ctx.db
      .query("invoices")
      .withIndex("by_business", (q) => q.eq("businessId", viewer.businessId))
      .collect();
    const next = existing.length + 1;
    return ctx.db.insert("invoices", {
      businessId: viewer.businessId,
      clientId: args.clientId,
      contractId: args.contractId,
      number: `GHS-${String(next).padStart(4, "0")}`,
      amountCents: args.amountCents,
      issueDate: args.issueDate,
      dueDate: args.dueDate,
      paidCents: 0,
      status: "issued",
      notes: args.notes,
      createdBy: viewer.userId,
      createdAt: Date.now(),
    });
  },
});

/** Manually store a KRA eTIMS reference — no compliance claim is implied. */
export const setEtimsReference = mutation({
  args: {
    invoiceId: v.id("invoices"),
    etimsRef: v.string(),
    etimsStatus: v.union(
      v.literal("none"),
      v.literal("submitted"),
      v.literal("acknowledged"),
    ),
  },
  handler: async (ctx, args) => {
    const viewer = await requireBusinessViewer(ctx);
    const row = await ctx.db.get(args.invoiceId);
    assertBusinessOwns(row, viewer.businessId);
    await ctx.db.patch(args.invoiceId, {
      etimsRef: args.etimsRef,
      etimsStatus: args.etimsStatus,
    });
  },
});

/**
 * Record a customer payment, allocating it against the invoice's outstanding
 * balance. Any over-payment is rejected so paidCents can never exceed the
 * invoice amount (integer-cent integrity).
 */
export const recordInvoicePayment = mutation({
  args: {
    invoiceId: v.id("invoices"),
    amountCents: v.number(),
    method: v.string(),
    reference: v.optional(v.string()),
    receivedAt: v.optional(v.number()),
    businessAccountId: v.optional(v.id("accounts")),
  },
  handler: async (ctx, args) => {
    const viewer = await requireBusinessViewer(ctx);
    const invoice = await ctx.db.get(args.invoiceId);
    assertBusinessOwns(invoice, viewer.businessId);
    if (!(args.amountCents > 0) || !Number.isInteger(args.amountCents))
      throw new ConvexError("Payment must be a positive whole number of cents.");

    const allocation = allocatePayment(
      invoice.amountCents,
      invoice.paidCents,
      args.amountCents,
    );
    if (allocation.applied < args.amountCents) {
      throw new ConvexError(
        `Payment exceeds the outstanding balance (${(invoice.amountCents - invoice.paidCents) / 100} unpaid).`,
      );
    }

    await ctx.db.insert("invoicePayments", {
      businessId: viewer.businessId,
      invoiceId: args.invoiceId,
      amountCents: allocation.applied,
      method: args.method,
      reference: args.reference,
      receivedAt: args.receivedAt ?? Date.now(),
      createdBy: viewer.userId,
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.invoiceId, {
      paidCents: allocation.afterPaid,
      status: allocation.status,
    });
    return allocation;
  },
});

export const listInvoices = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireBusinessViewer(ctx);
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_business", (q) => q.eq("businessId", viewer.businessId))
      .collect();
    const clients = await ctx.db
      .query("clients")
      .withIndex("by_business", (q) => q.eq("businessId", viewer.businessId))
      .collect();
    const names = new Map(clients.map((c) => [c._id, c.businessName]));
    return invoices.map((invoice) => ({
      ...invoice,
      clientName: names.get(invoice.clientId) ?? "Unknown client",
    }));
  },
});

export const listPayments = query({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    const viewer = await requireBusinessViewer(ctx);
    const invoice = await ctx.db.get(args.invoiceId);
    assertBusinessOwns(invoice, viewer.businessId);
    return ctx.db
      .query("invoicePayments")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .collect();
  },
});

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function stamp(userId: Id<"users">, message: string): string {
  return `${Date.now()}|${userId}|${message}`;
}

function appendActivity(
  existing: string[] | undefined,
  entry: string,
): string[] {
  return [...(existing ?? []), entry];
}
