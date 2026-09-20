import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Frequency } from "./schema";

const DAY = 86_400_000;

export type Ctx = QueryCtx | MutationCtx;

export type Viewer = {
  userId: Id<"users">;
  membership: Doc<"memberships">;
  householdId: Id<"households">;
};

/** The signed-in user plus the shared workspace they belong to, if any. */
export async function getViewer(ctx: Ctx): Promise<Viewer | null> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) return null;

  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  if (!membership) return null;

  return { userId, membership, householdId: membership.householdId };
}

/** Same as getViewer, but throws instead of returning null. */
export async function requireViewer(ctx: Ctx): Promise<Viewer> {
  const viewer = await getViewer(ctx);
  if (!viewer) {
    throw new ConvexError("You need a shared workspace to do this.");
  }
  return viewer;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Human-friendly invite code, e.g. "K7QP-3XRT". */
export function generateInviteCode(): string {
  let raw = "";
  for (let i = 0; i < 8; i += 1) {
    raw += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

/** Normalise whatever the user typed into a comparable invite code. */
export function normalizeInviteCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function startOfUtcDay(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Step a date forward one interval, clamping month-ends sensibly. */
export function advanceDate(ms: number, frequency: Frequency): number {
  const d = new Date(ms);
  switch (frequency) {
    case "weekly":
      d.setUTCDate(d.getUTCDate() + 7);
      break;
    case "biweekly":
      d.setUTCDate(d.getUTCDate() + 14);
      break;
    case "semimonthly":
      d.setUTCDate(d.getUTCDate() + 15);
      break;
    case "monthly": {
      const day = d.getUTCDate();
      d.setUTCDate(1);
      d.setUTCMonth(d.getUTCMonth() + 1);
      const daysInMonth = new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
      ).getUTCDate();
      d.setUTCDate(Math.min(day, daysInMonth));
      break;
    }
  }
  return d.getTime();
}

export type ScheduledEvent = {
  item: Doc<"recurring">;
  date: number;
  signed: number;
};

/**
 * Expand every active recurring item into concrete occurrences inside the
 * projection window.
 */
export function expandSchedule(
  items: Doc<"recurring">[],
  startMs: number,
  windowDays: number,
): ScheduledEvent[] {
  const start = startOfUtcDay(startMs);
  const horizon = start + windowDays * DAY;
  const events: ScheduledEvent[] = [];

  for (const item of items) {
    if (!item.active) continue;
    if (item.endDate !== undefined && item.endDate < start) continue;

    let cursor = item.nextDate;
    let guard = 0;
    while (cursor < start && guard < 600) {
      cursor = advanceDate(cursor, item.frequency);
      guard += 1;
    }
    while (cursor <= horizon && guard < 600) {
      if (item.endDate === undefined || cursor <= item.endDate) {
        events.push({
          item,
          date: cursor,
          signed: item.direction === "in" ? item.amount : -item.amount,
        });
      }
      cursor = advanceDate(cursor, item.frequency);
      guard += 1;
    }
  }

  events.sort((a, b) => a.date - b.date);
  return events;
}

export type ProjectionPoint = {
  date: number;
  label: string;
  balance: number;
  net: number;
};

/**
 * One account that earns (or loses) an estimated percentage return inside the
 * projection window.
 */
export type GrowthAccount = {
  balance: number;
  /** Basis points per year, e.g. 700 = 7% a year. May be negative. */
  annualBps: number;
};

/** Per-day growth factor for an account at a given annual percentage rate. */
export function dailyReturnRate(annualBps: number): number {
  return annualBps / 10_000 / 365;
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function formatDayLabel(ms: number): string {
  const d = new Date(ms);
  return `${MONTH_LABELS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/**
 * Day-by-day running balance across the projection window. Scheduled events
 * land on their days; investment accounts accrue an estimated return daily,
 * so the monthly estimate compounding reads as annual-rate/12 per month.
 */
export function buildProjection(
  events: ScheduledEvent[],
  startBalance: number,
  startMs: number,
  windowDays: number,
  growthAccounts: GrowthAccount[] = [],
): ProjectionPoint[] {
  const start = startOfUtcDay(startMs);
  const dailyNet = new Map<number, number>();

  for (const event of events) {
    const index = Math.round((startOfUtcDay(event.date) - start) / DAY);
    if (index < 0 || index > windowDays) continue;
    dailyNet.set(index, (dailyNet.get(index) ?? 0) + event.signed);
  }

  const growth = growthAccounts
    .map((account) => ({
      balance: account.balance,
      rate: dailyReturnRate(account.annualBps),
    }))
    .filter((entry) => entry.balance !== 0 && entry.rate !== 0);

  const points: ProjectionPoint[] = [];
  let balance = startBalance;
  for (let i = 0; i <= windowDays; i += 1) {
    // Investment growth accrues before today's scheduled money, exactly like
    // interest would post at day open.
    let growthToday = 0;
    for (const entry of growth) {
      const gain = entry.balance * entry.rate;
      entry.balance += gain;
      growthToday += gain;
    }
    balance += growthToday;

    const net = dailyNet.get(i) ?? 0;
    balance += net;
    const date = start + i * DAY;
    points.push({ date, label: formatDayLabel(date), balance, net });
  }
  return points;
}

/** Total estimated investment return earned across the window, in cents. */
export function estimatedReturnTotal(
  growthAccounts: GrowthAccount[],
  windowDays: number,
): number {
  const simulated = buildProjection([], 0, startOfUtcDay(Date.now()), windowDays, growthAccounts);
  return Math.round(simulated[simulated.length - 1]?.net ?? 0);
}

export { DAY };
