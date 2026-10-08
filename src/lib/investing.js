// Pure investment engine. All money is integer minor units (cents); all
// quantities are fixed-point with 6 decimal places (micro-units) — no floats
// for stored values. Free of Convex imports so it is unit-testable.
// ---------------------------------------------------------------------------
// Fixed-point quantities (Q6: 1 unit = 1_000_000 micro-units)
// ---------------------------------------------------------------------------
export const Q = 1000000;
/** Parse a decimal quantity string into micro-units ("0.5" -> 500_000). */
export function parseQty(input) {
    const cleaned = input.replace(/[^0-9.]/g, "");
    if (cleaned.length === 0 || cleaned.split(".").length > 2)
        return null;
    const [whole, frac = ""] = cleaned.split(".");
    if (frac.length > 6)
        return null;
    const micro = Number(whole) * Q + Number((frac + "000000").slice(0, 6));
    return micro > 0 ? micro : null;
}
/** Micro-units -> decimal string for display/input rounding-trip. */
export function formatQty(micro) {
    const sign = micro < 0 ? "-" : "";
    const abs = Math.abs(micro);
    const whole = Math.floor(abs / Q);
    const frac = String(abs % Q).padStart(6, "0").replace(/0+$/, "");
    return frac.length > 0 ? `${sign}${whole}.${frac}` : `${sign}${whole}`;
}
/** priceCents * qtyMicro / Q, rounded half-up to whole cents. */
export function valueOf(priceCents, qtyMicro) {
    const product = priceCents * qtyMicro; // exact in double range for our sizes
    return Math.round(product / Q);
}
/** Split `totalMicro` by percentage weights (basis points) exactly. */
export function splitByPct(totalMicro, weightsBps) {
    const sumBps = weightsBps.reduce((a, b) => a + b, 0);
    if (sumBps !== 10000)
        throw new Error(`Weights must total 10000 bps, got ${sumBps}`);
    const out = [];
    let assigned = 0;
    for (let i = 0; i < weightsBps.length - 1; i += 1) {
        const share = Math.floor((totalMicro * weightsBps[i]) / 10000);
        out.push(share);
        assigned += share;
    }
    out.push(totalMicro - assigned); // remainder to last, always sums exactly
    return out;
}
/** Apply a buy: adds a lot. */
export function buyLot(lots, qtyMicro, costCents) {
    if (qtyMicro <= 0 || costCents < 0)
        throw new Error("Invalid buy");
    return [...lots, { qtyMicro, costCents }];
}
/**
 * Apply a sell FIFO: consumes lots in order. Returns the reduced lots and
 * realized gain = proceeds - matched cost.
 */
export function sellFifo(lots, qtyMicro, proceedsCents) {
    if (qtyMicro <= 0)
        throw new Error("Invalid sell");
    const held = lots.reduce((s, lot) => s + lot.qtyMicro, 0);
    if (qtyMicro > held)
        throw new Error("Sell exceeds holdings");
    let remaining = qtyMicro;
    let matched = 0;
    const next = [];
    for (const lot of lots) {
        if (remaining <= 0) {
            next.push(lot);
            continue;
        }
        if (lot.qtyMicro <= remaining) {
            matched += lot.costCents;
            remaining -= lot.qtyMicro;
        }
        else {
            const portionCost = Math.round((lot.costCents * remaining) / lot.qtyMicro);
            matched += portionCost;
            next.push({ qtyMicro: lot.qtyMicro - remaining, costCents: lot.costCents - portionCost });
            remaining = 0;
        }
    }
    return { lots: next, matchedCostCents: matched, realizedCents: proceedsCents - matched };
}
/** Average cost of current holdings in cents per whole unit (Q1 precision). */
export function averageCostPerUnit(lots) {
    const qty = lots.reduce((s, lot) => s + lot.qtyMicro, 0);
    if (qty === 0)
        return null;
    const cost = lots.reduce((s, lot) => s + lot.costCents, 0);
    return Math.round(cost / (qty / Q));
}
/** Unrealized gain: market value minus total cost of current lots. */
export function unrealizedCents(lots, priceCents) {
    const qty = lots.reduce((s, lot) => s + lot.qtyMicro, 0);
    if (qty === 0)
        return null;
    const market = valueOf(priceCents, qty);
    const cost = lots.reduce((s, lot) => s + lot.costCents, 0);
    return { marketCents: market, costCents: cost, gainCents: market - cost };
}
/** Validate the cycle percentages total exactly 100. */
export function validateCyclePcts(months) {
    return months.every((m) => Math.abs(m.pcts.reduce((a, b) => a + b, 0) - 100) < 1e-9);
}
/**
 * Plan one month's purchases. Percent-based: budget * pct / 100. Buys whole
 * shares only; anything unaffordable is carried to next month. Never executes
 * trades — this is a planning function.
 */
export function planMonth(budgetCents, carriedCents, targets) {
    const available = budgetCents + carriedCents;
    const weights = targets.map((t) => Math.round(t.pct * 100));
    const shares = splitByPct(available, weights);
    const lines = targets.map((target, i) => {
        const allocatedCents = shares[i];
        if (target.priceCents === null) {
            return {
                securityId: target.securityId,
                name: target.name,
                allocatedCents,
                wholeShares: 0,
                costCents: 0,
                spentCents: 0,
            };
        }
        const unitTotal = target.priceCents + target.feeCents;
        const wholeShares = unitTotal > 0 ? Math.floor(allocatedCents / unitTotal) : 0;
        const costCents = wholeShares * unitTotal;
        return {
            securityId: target.securityId,
            name: target.name,
            allocatedCents,
            wholeShares,
            costCents,
            spentCents: costCents,
        };
    });
    const spent = lines.reduce((s, line) => s + line.spentCents, 0);
    const unallocated = lines
        .filter((line) => line.wholeShares === 0)
        .reduce((s, line) => s + line.allocatedCents, 0);
    return {
        lines,
        spentCents: spent,
        remainingCents: available - spent,
        unallocatedCents: unallocated,
    };
}
// ---------------------------------------------------------------------------
// Portfolio totals — never double count brokerage cash vs holdings
// ---------------------------------------------------------------------------
/**
 * Portfolio market value counts holdings valuation exactly once. Brokerage
 * cash is reported separately and EXCLUDED from holdings market value.
 */
export function portfolioTotals(holdings) {
    let market = 0;
    let cost = 0;
    let unknown = 0;
    for (const holding of holdings) {
        if (holding.qtyMicro === 0)
            continue;
        if (holding.priceCents === null) {
            unknown += 1;
            cost += holding.costCents;
            continue;
        }
        market += valueOf(holding.priceCents, holding.qtyMicro);
        cost += holding.costCents;
    }
    return { marketValueCents: market, costBasisCents: cost, unknownPriceCount: unknown };
}
/** Accrued gain to date: straight-line of purchase→maturity value. Actual, not speculative. */
export function govSecuritiesAccruedCents(sec, now) {
    if (now <= sec.purchaseDate)
        return 0;
    if (now >= sec.maturityDate)
        return sec.maturityValueCents - sec.purchaseCents;
    const span = sec.maturityDate - sec.purchaseDate;
    return Math.round(((sec.maturityValueCents - sec.purchaseCents) * (now - sec.purchaseDate)) / span);
}
