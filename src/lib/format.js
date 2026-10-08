const DAY = 86400000;
const MINUS = "\u2212";
const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});
const moneyRound = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});
/** 1234567 cents -> "$12,345.67" */
export function formatMoney(cents, options = {}) {
    const value = cents / 100;
    const formatted = options.cents === false ? moneyRound.format(value) : money.format(value);
    return formatted.replace("-", MINUS);
}
/** 1234567 -> "+$12,345.67" / "\u2212$12,345.67"; transfers show plain. */
export function formatSignedMoney(cents, direction) {
    if (direction === "transfer")
        return formatMoney(cents);
    const sign = direction === "in" ? "+" : MINUS;
    return `${sign}${formatMoney(Math.abs(cents))}`;
}
/** Axis-friendly: 12345678 -> "$123.5k" */
export function formatCompactMoney(cents) {
    const value = cents / 100;
    const abs = Math.abs(value);
    if (abs >= 1000000)
        return `${value < 0 ? MINUS : ""}$${(abs / 1000000).toFixed(1)}M`;
    if (abs >= 1000)
        return `${value < 0 ? MINUS : ""}$${(abs / 1000).toFixed(1)}k`;
    return `${value < 0 ? MINUS : ""}$${abs.toFixed(0)}`;
}
/** Format a percentage like 7 -> "7%" or 0.45 -> "0.45%". */
export function formatPct(pct) {
    const value = Math.abs(pct) < 0.01 ? pct.toFixed(2) : pct.toFixed(Math.abs(pct % 1) > 0 ? 2 : 0);
    return `${value.replace(/\.00$/, "")}%`;
}
/** Parse a user typed dollar amount into positive cents. */
export function parseAmountToCents(input) {
    const cleaned = input.replace(/[^0-9.]/g, "");
    if (cleaned.length === 0)
        return null;
    const value = Number.parseFloat(cleaned);
    if (!Number.isFinite(value) || value <= 0)
        return null;
    return Math.round(value * 100);
}
export function centsToInput(cents) {
    return (cents / 100).toFixed(2);
}
/** Local calendar date -> ms, anchored at local noon to avoid day shifts. */
export function dateInputToMs(value) {
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day)
        return Date.now();
    return new Date(year, month - 1, day, 12, 0, 0, 0).getTime();
}
export function msToDateInput(ms) {
    const d = new Date(ms);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function formatDate(ms) {
    return new Date(ms).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}
export function formatShortDate(ms) {
    return new Date(ms).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    });
}
/** Day counter for UTC-midnight timestamps (scheduled items, chart points). */
export function utcDayDiff(ms, now = Date.now()) {
    const a = new Date(ms);
    const b = new Date(now);
    const startA = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
    const startB = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
    return Math.round((startA - startB) / DAY);
}
/** "Today", "Tomorrow", "in 5 days" */
export function formatRelativeDay(ms) {
    const diff = utcDayDiff(ms);
    if (diff <= 0)
        return "Today";
    if (diff === 1)
        return "Tomorrow";
    return `in ${diff} days`;
}
/** "Today" / "Yesterday" / "Sep 14" for real timestamps. */
export function formatRelativeDate(ms) {
    const startOf = (value) => {
        const d = new Date(value);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    };
    const diff = Math.round((startOf(ms) - startOf(Date.now())) / DAY);
    if (diff === 0)
        return "Today";
    if (diff === -1)
        return "Yesterday";
    if (diff === 1)
        return "Tomorrow";
    return formatShortDate(ms);
}
export function formatMonthLabel(ms) {
    return new Date(ms).toLocaleDateString("en-US", { month: "long" });
}
export function greeting(now = Date.now()) {
    const hour = new Date(now).getHours();
    if (hour < 12)
        return "Good morning";
    if (hour < 18)
        return "Good afternoon";
    return "Good evening";
}
