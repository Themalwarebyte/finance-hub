// Shared financial math: period ranges and loan amortisation.
// All money is integer cents; never use floats for stored amounts.

export type PeriodRange = { start: number; end: number; label: string };

function startOfMonth(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

function endOfMonth(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
}

function addMonths(ms: number, count: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth() + count, 1).getTime();
}

export const PERIOD_KEYS = [
  "this_month",
  "last_month",
  "3m",
  "6m",
  "ytd",
  "1y",
  "custom",
] as const;

export type PeriodKey = (typeof PERIOD_KEYS)[number];

/** Resolve a named period (or custom range) into a [start, end) window. */
export function resolvePeriod(
  key: string,
  now: number,
  customStart?: number,
  customEnd?: number,
): PeriodRange {
  if (key === "custom" && customStart && customEnd && customEnd > customStart) {
    return { start: customStart, end: customEnd, label: "Custom period" };
  }
  switch (key) {
    case "last_month": {
      const end = startOfMonth(now);
      const start = addMonths(end, -1);
      return { start, end, label: "Last month" };
    }
    case "3m":
      return { start: addMonths(startOfMonth(now), -2), end: endOfMonth(now), label: "Last 3 months" };
    case "6m":
      return { start: addMonths(startOfMonth(now), -5), end: endOfMonth(now), label: "Last 6 months" };
    case "ytd": {
      const d = new Date(now);
      return {
        start: new Date(d.getFullYear(), 0, 1).getTime(),
        end: endOfMonth(now),
        label: "Year to date",
      };
    }
    case "1y":
      return { start: addMonths(startOfMonth(now), -11), end: endOfMonth(now), label: "Last 12 months" };
    case "this_month":
    default:
      return { start: startOfMonth(now), end: endOfMonth(now), label: "This month" };
  }
}

/** The calendar month range containing `ms`. */
export function monthRange(ms: number): PeriodRange {
  return { start: startOfMonth(ms), end: endOfMonth(ms), label: "Month" };
}

export type AmortizationPoint = {
  month: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number; // remaining after this payment
};

/**
 * Standard monthly amortisation schedule with an optional extra payment.
 * `balanceCents` and `paymentCents` are positive; monthly rate is derived
 * from the annual percentage.
 */
export function amortize(
  balanceCents: number,
  annualRatePct: number,
  paymentCents: number,
  extraCents = 0,
  maxMonths = 720,
): AmortizationPoint[] {
  const monthlyRate = annualRatePct / 100 / 12;
  let balance = balanceCents;
  const schedule: AmortizationPoint[] = [];

  for (let month = 1; month <= maxMonths && balance > 0; month += 1) {
    const interest = Math.round(balance * monthlyRate);
    let principal = paymentCents + extraCents - interest;
    // Payment too small to cover interest: interest-only, balance never falls.
    if (principal <= 0) {
      principal = 0;
      schedule.push({ month, payment: interest, interest, principal, balance });
      break;
    }
    if (principal > balance) principal = balance;
    balance -= principal;
    schedule.push({
      month,
      payment: interest + principal,
      interest,
      principal,
      balance,
    });
  }
  return schedule;
}

/** Whole months needed to clear a debt with the given payment. */
export function monthsToPayoff(
  balanceCents: number,
  annualRatePct: number,
  paymentCents: number,
  extraCents = 0,
): number {
  const schedule = amortize(balanceCents, annualRatePct, paymentCents, extraCents);
  return schedule.length;
}

/** Total interest paid across a schedule. */
export function totalInterest(schedule: AmortizationPoint[]): number {
  return schedule.reduce((sum, point) => sum + point.interest, 0);
}
