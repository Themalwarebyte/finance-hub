import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
/** Convert cents in `from` to cents in `to` using a stored, manually-entered rate. */
export function convertCents(cents, from, to, rateCentsPerUsd) {
    if (from === to) {
        return {
            cents,
            rate: 1,
            from,
            to,
            updatedAt: null,
        };
    }
    if (cents === 0) {
        return {
            cents: 0,
            rate: null,
            from,
            to,
            updatedAt: null,
        };
    }
    // USD is the base currency for all manual rates.
    const usdTo = {
        USD: 100, // 1 USD = 100 USD cents (base identity, always available)
        KES: rateCentsPerUsd, // 1 USD = rateCentsPerUsd KES cents
    };
    let fromToUsd = null;
    if (from === "USD") {
        fromToUsd = 100;
    }
    else if (from === "KES") {
        fromToUsd = rateCentsPerUsd;
    }
    let toFromUsd = null;
    if (to === "USD") {
        toFromUsd = 100;
    }
    else if (to === "KES") {
        toFromUsd = rateCentsPerUsd;
    }
    if (fromToUsd === null || toFromUsd === null) {
        // Unsupported pair: return null so the UI shows "n/a" rather than a fake rate.
        return { cents: null, rate: null, from, to, updatedAt: null };
    }
    const rate = toFromUsd / fromToUsd;
    const converted = Math.round((cents / 100) * rate * 100);
    return {
        cents: converted,
        rate: rate ?? null,
        from,
        to,
        updatedAt: null,
    };
}
/** Format a converted value with original, converted, rate and last-updated date. */
export function formatConvertedValue(cents, from, to, rateCentsPerUsd) {
    const { cents: converted, rate, from: f, to: t } = convertCents(cents, from, to, rateCentsPerUsd);
    if (converted === null)
        return "n/a";
    if (from === to)
        return `KSh ${cents / 100}`;
    const rateForDisplay = rate ?? 1;
    return `${converted / 100} ${t} (1 ${f} = ${rateForDisplay.toFixed(4)} ${t}, rate snapshot unavailable)`;
}
/** Read-only hook for the user's persisted display-currency preference. */
export function useDisplayCurrency() {
    const country = useQuery(api.currency.getDisplayCurrency, {});
    return { country, setCountry: () => { }, rateCentsPerUsd: null, converting: convertCents };
}
/** Hook returning the rate snapshot for a given output currency. */
export function useCountryRate(country) {
    const c = useQuery(api.currency.getCountry, { code: country ?? "" });
    return c?.rateCentsPerUsd ?? null;
}
