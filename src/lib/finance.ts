export type AccountKind = "checking" | "savings" | "credit" | "cash" | "investment";
export type Direction = "in" | "out";
export type Frequency = "weekly" | "biweekly" | "semimonthly" | "monthly";

export const ACCOUNT_KINDS: { value: AccountKind; label: string }[] = [
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
  { value: "credit", label: "Credit card" },
  { value: "cash", label: "Cash" },
  { value: "investment", label: "Investment" },
];

export const KIND_LABELS: Record<AccountKind, string> = {
  checking: "Checking",
  savings: "Savings",
  credit: "Credit card",
  cash: "Cash",
  investment: "Investment",
};

/** Accounts whose balance counts as money you owe rather than money you hold. */
export function isLiability(kind: AccountKind): boolean {
  return kind === "credit";
}

export const COLORS = [
  "teal",
  "emerald",
  "indigo",
  "amber",
  "rose",
  "slate",
] as const;

export type AccountColor = (typeof COLORS)[number];

export type ReturnBasis = "annual" | "monthly";

export const RETURN_BASES: { value: ReturnBasis; label: string; short: string }[] = [
  { value: "annual", label: "Yearly rate", short: "year" },
  { value: "monthly", label: "Monthly rate", short: "month" },
];

export function returnBasisLabel(basis: string | null): string {
  return RETURN_BASES.find((item) => item.value === basis)?.short ?? "year";
}

/** Normalise a return estimate to a yearly percentage for projections. */
export function annualReturnPct(
  pct: number | null | undefined,
  basis: string | null | undefined,
): number | null {
  if (pct === null || pct === undefined) return null;
  return basis === "monthly" ? pct * 12 : pct;
}

/** Estimate for the next full year / month, compounded. */
export function returnEstimate(pct: number, basis: "annual" | "monthly", balance: number) {
  const dollars = balance / 100;
  const amount =
    basis === "annual"
      ? dollars * (Math.pow(1 + pct / 100, 1) - 1)
      : dollars * (Math.pow(1 + pct / 100, 12) - 1);
  const amountCents = Math.round(amount * 100);
  if (basis === "annual") {
    return { amount: amountCents, periodLabel: "over the next year", monthly: Math.round(amountCents / 12) };
  }
  return { amount: amountCents, periodLabel: "per month", monthly: amountCents };
}

export const COLOR_META: Record<
  AccountColor,
  { label: string; dot: string; wash: string; text: string }
> = {
  teal: {
    label: "Teal",
    dot: "bg-[oklch(0.55_0.09_197)]",
    wash: "bg-[oklch(0.55_0.09_197)]/12",
    text: "text-[oklch(0.45_0.095_197)]",
  },
  emerald: {
    label: "Emerald",
    dot: "bg-[oklch(0.58_0.12_162)]",
    wash: "bg-[oklch(0.58_0.12_162)]/12",
    text: "text-[oklch(0.48_0.12_162)]",
  },
  indigo: {
    label: "Indigo",
    dot: "bg-[oklch(0.52_0.145_285)]",
    wash: "bg-[oklch(0.52_0.145_285)]/12",
    text: "text-[oklch(0.47_0.145_285)]",
  },
  amber: {
    label: "Amber",
    dot: "bg-[oklch(0.72_0.125_78)]",
    wash: "bg-[oklch(0.72_0.125_78)]/15",
    text: "text-[oklch(0.55_0.12_70)]",
  },
  rose: {
    label: "Rose",
    dot: "bg-[oklch(0.62_0.165_25)]",
    wash: "bg-[oklch(0.62_0.165_25)]/12",
    text: "text-[oklch(0.55_0.17_25)]",
  },
  slate: {
    label: "Slate",
    dot: "bg-[oklch(0.62_0.02_258)]",
    wash: "bg-[oklch(0.62_0.02_258)]/14",
    text: "text-[oklch(0.45_0.02_258)]",
  },
};

export function colorMeta(color: string) {
  return COLOR_META[(color as AccountColor) in COLOR_META ? (color as AccountColor) : "teal"];
}

export const FREQUENCIES: { value: Frequency; label: string; short: string }[] = [
  { value: "weekly", label: "Every week", short: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks", short: "Biweekly" },
  { value: "semimonthly", label: "Twice a month", short: "Semimonthly" },
  { value: "monthly", label: "Every month", short: "Monthly" },
];

export function frequencyLabel(frequency: string): string {
  return FREQUENCIES.find((item) => item.value === frequency)?.short ?? frequency;
}

export const CATEGORIES = [
  "Income",
  "Housing",
  "Groceries",
  "Utilities",
  "Transport",
  "Dining",
  "Health",
  "Subscriptions",
  "Entertainment",
  "Travel",
  "Savings",
  "Shopping",
  "Other",
];

/** Suggested categories per direction keeps data-entry fast. */
export function categoriesFor(direction: Direction): string[] {
  if (direction === "in") {
    return ["Income", "Refund", "Interest", "Gift", "Transfer", "Other"];
  }
  return CATEGORIES.filter((category) => category !== "Income");
}

export const WINDOW_OPTIONS: { value: number; label: string }[] = [
  { value: 14, label: "Next 14 days" },
  { value: 30, label: "Next 30 days" },
  { value: 60, label: "Next 60 days" },
];
