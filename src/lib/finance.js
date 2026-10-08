export const ACCOUNT_KINDS = [
    { value: "checking", label: "Bank account", group: "Everyday" },
    { value: "current", label: "Current account", group: "Everyday" },
    { value: "savings", label: "Savings account", group: "Everyday" },
    { value: "cash", label: "Cash", group: "Everyday" },
    { value: "mpesa", label: "M-PESA", group: "Everyday" },
    { value: "mobile_money", label: "Airtel Money", group: "Everyday" },
    { value: "sacco", label: "SACCO", group: "Everyday" },
    { value: "money_market", label: "Money market fund", group: "Savings & investing" },
    { value: "investment", label: "Investment account", group: "Savings & investing" },
    { value: "brokerage", label: "Brokerage account", group: "Savings & investing" },
    { value: "pension", label: "Pension", group: "Savings & investing" },
    { value: "crypto", label: "Cryptocurrency wallet", group: "Savings & investing" },
    { value: "property", label: "Property account", group: "Savings & investing" },
    { value: "credit", label: "Credit card", group: "Debt" },
    { value: "loan", label: "Loan account", group: "Debt" },
    { value: "mortgage", label: "Mortgage", group: "Debt" },
    { value: "other", label: "Other account", group: "Other" },
];
export const KIND_LABELS = Object.fromEntries(ACCOUNT_KINDS.map((option) => [option.value, option.label]));
/** Accounts whose balance counts as money you owe rather than money you hold. */
export function isLiability(kind) {
    return kind === "credit" || kind === "loan" || kind === "mortgage";
}
export const COLORS = [
    "teal",
    "emerald",
    "indigo",
    "amber",
    "rose",
    "slate",
];
export const RETURN_BASES = [
    { value: "annual", label: "Yearly rate", short: "year" },
    { value: "monthly", label: "Monthly rate", short: "month" },
];
export function returnBasisLabel(basis) {
    return RETURN_BASES.find((item) => item.value === basis)?.short ?? "year";
}
/** Normalise a return estimate to a yearly percentage for projections. */
export function annualReturnPct(pct, basis) {
    if (pct === null || pct === undefined)
        return null;
    return basis === "monthly" ? pct * 12 : pct;
}
/** Estimate for the next full year / month, compounded. */
export function returnEstimate(pct, basis, balance) {
    const dollars = balance / 100;
    const amount = basis === "annual"
        ? dollars * (Math.pow(1 + pct / 100, 1) - 1)
        : dollars * (Math.pow(1 + pct / 100, 12) - 1);
    const amountCents = Math.round(amount * 100);
    if (basis === "annual") {
        return { amount: amountCents, periodLabel: "over the next year", monthly: Math.round(amountCents / 12) };
    }
    return { amount: amountCents, periodLabel: "per month", monthly: amountCents };
}
export const COLOR_META = {
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
export function colorMeta(color) {
    return COLOR_META[color in COLOR_META ? color : "teal"];
}
export const FREQUENCIES = [
    { value: "weekly", label: "Every week", short: "Weekly" },
    { value: "biweekly", label: "Every 2 weeks", short: "Biweekly" },
    { value: "semimonthly", label: "Twice a month", short: "Semimonthly" },
    { value: "monthly", label: "Every month", short: "Monthly" },
];
export function frequencyLabel(frequency) {
    return FREQUENCIES.find((item) => item.value === frequency)?.short ?? frequency;
}
export const CATEGORIES = [
    "Housing",
    "Food",
    "Groceries",
    "Dining",
    "Transport",
    "Fuel",
    "Health",
    "Insurance",
    "Education",
    "Family",
    "Children",
    "Utilities",
    "Internet",
    "Airtime",
    "Entertainment",
    "Shopping",
    "Travel",
    "Giving",
    "Charity",
    "Personal Care",
    "Debt Payments",
    "Investments",
    "Savings",
    "Taxes",
    "Business",
    "Subscriptions",
    "Transfer",
    "Other",
];
export const INCOME_SOURCES = [
    "Salary",
    "Consulting",
    "Freelance",
    "Business",
    "Rental Income",
    "Dividends",
    "Interest",
    "Pension",
    "Bonus",
    "Commission",
    "Allowance",
    "Gifts",
    "Refunds",
    "Other",
];
/** Suggested categories per direction keeps data-entry fast. */
export function categoriesFor(direction) {
    if (direction === "in") {
        return [...INCOME_SOURCES];
    }
    if (direction === "transfer") {
        return ["Transfer"];
    }
    return CATEGORIES.filter((category) => category !== "Transfer");
}
export const WINDOW_OPTIONS = [
    { value: 14, label: "Next 14 days" },
    { value: 30, label: "Next 30 days" },
    { value: 60, label: "Next 60 days" },
];
