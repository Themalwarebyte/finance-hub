// Pure business-domain helpers. All money is integer cents; no floats for
// stored amounts. This module is intentionally free of Convex imports so it
// can be unit-tested with `bun test` without a running backend.

export const DAY_MS = 86_400_000;
/** Approximate millisecond length of a calendar month. */
export const MONTH_MS = 30.44 * DAY_MS;
/** Approximate millisecond length of a quarter. */
export const QUARTER_MS = 91.31 * DAY_MS;

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

export type ViewKey = "personal" | "ghub" | "consolidated";

/** Clamps a view selector into the allowed enum. */
export function normalizeView(view: string | null | undefined): ViewKey {
  return view === "ghub" || view === "consolidated" ? view : "personal";
}

// ---------------------------------------------------------------------------
// Sales stages
// ---------------------------------------------------------------------------

export const SALES_STAGES = [
  "New",
  "Contacted",
  "Discovery",
  "Proposal",
  "Negotiation",
  "Won",
  "Lost",
] as const;
export type SalesStage = (typeof SALES_STAGES)[number];

/** Order in the pipeline. Lost/Won are terminal. */
export function stageOrder(stage: string): number {
  const index = SALES_STAGES.indexOf(stage as SalesStage);
  return index === -1 ? 0 : index;
}

/** Is the lead still open (not Won/Lost)? */
export function stageIsOpen(stage: string): boolean {
  return stage !== "Won" && stage !== "Lost";
}

/** A Won opportunity is convertible into a client + contract. */
export function isConvertible(stage: string): boolean {
  return stage === "Won";
}

/** Sum of estimated contract value of open leads — the pipeline value. */
export function pipelineValue(
  leads: { stage: string; estimatedValueCents: number }[],
): number {
  return leads
    .filter((lead) => stageIsOpen(lead.stage))
    .reduce((sum, lead) => sum + lead.estimatedValueCents, 0);
}

/** Soonest future follow-up among open leads, or null. */
export function nextFollowUp(
  leads: { stage: string; nextFollowUp?: number | null }[],
  now: number,
): number | null {
  const future = leads
    .filter(
      (lead) => stageIsOpen(lead.stage) && (lead.nextFollowUp ?? 0) > now,
    )
    .map((lead) => lead.nextFollowUp as number)
    .sort((a, b) => a - b);
  return future.length > 0 ? future[0] : null;
}

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

export const INVOICE_STATUSES = [
  "draft",
  "issued",
  "partially_paid",
  "paid",
  "overdue",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

/** Paid minus (issued or partially paid), for the receivables number. */
export function receivablesCents(
  invoices: { amountCents: number; paidCents: number; status: string }[],
): number {
  return invoices
    .filter(
      (invoice) =>
        invoice.status === "issued" ||
        invoice.status === "partially_paid" ||
        invoice.status === "overdue",
    )
    .reduce((sum, invoice) => sum + Math.max(0, invoice.amountCents - invoice.paidCents), 0);
}

/** Status an invoice should display, given payments and the current date. */
export function effectiveInvoiceStatus(
  baseStatus: InvoiceStatus,
  amountCents: number,
  paidCents: number,
  dueDateMs: number,
  nowMs: number,
): InvoiceStatus {
  if (paidCents <= 0) {
    if (baseStatus === "issued" && dueDateMs < nowMs) return "overdue";
    return baseStatus;
  }
  if (paidCents >= amountCents) return "paid";
  if (dueDateMs < nowMs) return "overdue";
  return "partially_paid";
}

/** One payment allocated across the invoice's outstanding balance. */
export function allocatePayment(
  amountCents: number,
  paidCents: number,
  paymentCents: number,
): { applied: number; afterPaid: number; status: InvoiceStatus } {
  const outstanding = Math.max(0, amountCents - paidCents);
  const applied = Math.min(paymentCents, outstanding);
  const afterPaid = paidCents + applied;
  return {
    applied,
    afterPaid,
    status: afterPaid >= amountCents ? "paid" : "partially_paid",
  };
}

// ---------------------------------------------------------------------------
// Consolidated view: internal transfers must never double-count
// ---------------------------------------------------------------------------

/**
 * True when a transaction is a movement between accounts the user owns via
 * any of their workspaces (household and/or business) — the existing schema's
 * `direction: "transfer"` with a counterpart account.
 */
export function isInternalTransfer(
  direction: string,
  transferAccountId: string | null | undefined,
): boolean {
  return direction === "transfer" && transferAccountId != null;
}

/**
 * Consolidated money-in: only external income. Transfers (personal↔business,
 * personal↔personal, business↔business) and owner capital contributions are
 * relocations of the same money, never new income.
 *
 * A transfer whose lowercase category is exactly "transfer" is by schema
 * definition internal; anything tagged owner-drawings/contribution is also
 * excluded from income/expense and handled in eqNewWorth terms separately.
 */
export function consolidatedIncomeCents(
  txns: { direction: string; amount: number; transferAccountId?: unknown; category?: string }[],
): number {
  // Per schema, direction "transfer" marks intra-owned-account moves; they are
  // excluded from income. Plain "in" rows are real external revenue.
  return txns
    .filter((t) => t.direction === "in" && t.amount >= 0)
    .reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Consolidated expenses: ordinary consumption only. Transfers are excluded
 * (they are relocations), as are owner drawings and capital contributions.
 */
export function consolidatedExpensesCents(
  txns: { direction: string; amount: number; transferAccountId?: unknown; category?: string }[],
): number {
  return txns
    .filter(
      (t) =>
        t.direction === "out" &&
        isInternalTransfer(t.direction, t.transferAccountId as string | null | undefined) ===
          false &&
        t.category !== "Owner Drawings" &&
        t.category !== "Owner Capital" &&
        t.category !== "Transfer",
    )
    .reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Consolidated net cash: real income minus real expenses. Transfers and owner
 * movements net to zero because each side is excluded symmetrically.
 */
export function consolidatedNetCents(
  txns: { direction: string; amount: number; transferAccountId?: unknown; category?: string }[],
): number {
  return consolidatedIncomeCents(txns) - consolidatedExpensesCents(txns);
}

/** Stable key proving a transfer is counted exactly once across any views. */
export function consolidatedTransferKey(
  fromAccountId: string | null | undefined,
  toAccountId: string | null | undefined,
  dateMs: number,
): string | null {
  if (!fromAccountId || !toAccountId) return null;
  return `${String(fromAccountId)}>${String(toAccountId)}@${dateMs}`;
}

// ---------------------------------------------------------------------------
// Milestones math (all cents)
// ---------------------------------------------------------------------------

/** Simple progress percentage, clamped to 0..100. */
export function progressPct(actualCents: number, targetCents: number): number {
  if (targetCents <= 0) return 0;
  return Math.min(100, Math.max(0, (actualCents / targetCents) * 100));
}

/** Pace: expected progress at `nowMs` given linear spread over the window. */
export function expectedPct(elapsedMs: number, totalMs: number): number {
  if (totalMs <= 0) return 0;
  return Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
}

/**
 * Projected year-end outcome: linear run-rate from real actuals.
 * `documentedAssumption` — linear extrapolation of realised revenue to date;
 * no speculative growth curves are applied.
 */
export function projectedEnd(actualCents: number, elapsedMs: number, totalMs: number): number {
  if (elapsedMs <= 0) return 0;
  return Math.round((actualCents / elapsedMs) * totalMs);
}

/** Which quarter of the roadmap year does `nowMs` fall in (1..4, clamped). */
export function quarterIndex(nowMs: number, yearStartMs: number): number {
  const elapsed = nowMs - yearStartMs;
  if (elapsed <= 0) return 1;
  return Math.min(4, Math.floor(elapsed / QUARTER_MS) + 1);
}

/** Revenue achieved strictly within quarter N of the roadmap year. */
export function revenueInQuarter(
  revenues: { date: number; amountCents: number }[],
  quarter: number,
  yearStartMs: number,
): number {
  const start = yearStartMs + (quarter - 1) * QUARTER_MS;
  const end = start + QUARTER_MS;
  return revenues
    .filter((row) => row.date >= start && row.date < end)
    .reduce((sum, row) => sum + row.amountCents, 0);
}

// ---------------------------------------------------------------------------
// Business financial distinctions
// ---------------------------------------------------------------------------

/** Owner-only balance-sheet categories (not P&L). */
export const OWNER_MOVEMENT_CATEGORIES = [
  "Owner Drawings",
  "Owner Capital",
] as const;

function isOwnerMovement(category: string | undefined): boolean {
  return (OWNER_MOVEMENT_CATEGORIES as readonly string[]).includes(category ?? "");
}

/**
 * Operating expenses: out-flows that are not transfers, not owner
 * drawings/capital and not investment purchase costs (those are
 * balance-sheet movements, not P&L).
 */
export function operatingExpensesCents(
  txns: { direction: string; amount: number; transferAccountId?: unknown; category?: string }[],
): number {
  return txns
    .filter(
      (t) =>
        t.direction === "out" &&
        !isInternalTransfer(t.direction, t.transferAccountId as string | null | undefined) &&
        !isOwnerMovement(t.category),
    )
    .reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Earned revenue: revenue invoiced on contracts whose service period has
 * been delivered. Phase 1 approximation documented as such: earned =
 * issued (non-draft) invoices whose contract start date has passed, or
 * recorded cash income where no invoice exists.
 */
export function earnedRevenueCents(
  invoices: { amountCents: number; status: string; issueDate?: number | null }[],
  cashRevenueCents: number,
): number {
  const issued = invoices
    .filter((i) => i.status !== "draft")
    .reduce((sum, i) => sum + i.amountCents, 0);
  return Math.max(issued, cashRevenueCents);
}

/** Cash actually collected against invoices + un-invoiced cash revenue. */
export function cashCollectedCents(
  invoicePaidCents: number,
  cashRevenueCents: number,
): number {
  return invoicePaidCents + cashRevenueCents;
}

/** Runway in whole months at the given monthly burn (real outflows only). */
export function runwayMonths(availableCashCents: number, monthlyBurnCents: number): number {
  if (monthlyBurnCents <= 0) return Number.POSITIVE_INFINITY;
  return Math.round((availableCashCents / monthlyBurnCents) * 10) / 10;
}

// ---------------------------------------------------------------------------
// Year 1 roadmap window — fixed by the user's specification
// ---------------------------------------------------------------------------

/** October 1 2026, 00:00 UTC. */
export const ROADMAP_START = Date.UTC(2026, 9, 1);
/** September 30 2027, 23:59:59.999 UTC. */
export const ROADMAP_END = Date.UTC(2027, 8, 30, 23, 59, 59, 999);

/** Initial Year-1 targets (cents). Clearly targets, never actuals. */
export const INITIAL_TARGETS = {
  annualRevenueCents: 12_000_000, // KSh 120,000
  mmfContributionsCents: 1_200_000, // KSh 12,000
  yearEndNetWorthCents: 1_500_000, // KSh 15,000
  monthlyRecurringRevenueCents: 600_000, // KSh 6,000
} as const;

/** Quarterly revenue target split (cents). */
export const QUARTERLY_TARGETS = [
  1_000_000, // Q1 KSh 10,000
  2_000_000, // Q2 KSh 20,000
  3_500_000, // Q3 KSh 35,000
  5_500_000, // Q4 KSh 55,000
] as const;
