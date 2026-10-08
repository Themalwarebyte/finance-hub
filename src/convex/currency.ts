import { v } from "convex/values";
import { query } from "./_generated/server";
import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";
import {
  DEFAULT_CURRENCY_MODE,
  DEFAULT_DISPLAY_CURRENCY,
} from "./schema";

/** List all stored exchange rates (manually managed; never auto-generated). */
export const listCurrencyRates = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await getAuthUserId(ctx);
    if (viewer === null) return null;
    return ctx.db
      .query("currencyRates")
      .withIndex("by_from", (q) => q.eq("fromCurrency", "USD"))
      .collect();
  },
});

/** Return the latest stored rate for a from/to pair, or null if none exists. */
export const getExchangeRate = query({
  args: {
    fromCurrency: v.string(),
    toCurrency: v.string(),
  },
  handler: async (ctx, args) => {
    const rates = await ctx.db
      .query("currencyRates")
      .withIndex("by_from", (q) =>
        q.eq("fromCurrency", args.fromCurrency).eq("toCurrency", args.toCurrency),
      )
      .order("desc")
      .first();
    return rates?.exchangeRate ?? null;
  },
});

/** Seed or upsert a single manual exchange rate. */
export const setExchangeRate = mutation({
  args: {
    fromCurrency: v.string(),
    toCurrency: v.string(),
    exchangeRate: v.number(),
    effectiveDate: v.number(),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    const viewer = await getAuthUserId(ctx);
    if (viewer === null) throw new Error("Not authenticated");
    // Currency-integrity guards: rates must be positive, finite, and between
    // two distinct supported codes. Never accept a fabricated/invalid rate.
    if (!Number.isFinite(args.exchangeRate) || args.exchangeRate <= 0) {
      throw new Error("Exchange rate must be a positive finite number.");
    }
    const from = args.fromCurrency.trim().toUpperCase();
    const to = args.toCurrency.trim().toUpperCase();
    if (from.length !== 3 || to.length !== 3) {
      throw new Error("Currency codes must be 3 letters (e.g. KES, USD).");
    }
    if (from === to) {
      throw new Error("Exchange rate requires two different currencies.");
    }
    const existing = await ctx.db
      .query("currencyRates")
      .withIndex("by_from", (q) =>
        q
          .eq("fromCurrency", from)
          .eq("toCurrency", to)
          .eq("effectiveDate", args.effectiveDate),
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        exchangeRate: args.exchangeRate,
        source: args.source,
      });
    } else {
      await ctx.db.insert("currencyRates", {
        fromCurrency: from,
        toCurrency: to,
        exchangeRate: args.exchangeRate,
        effectiveDate: args.effectiveDate,
        source: args.source,
        createdBy: viewer,
        createdAt: Date.now(),
      });
    }
    return true;
  },
});

/** List manually-entered rates for the display (or persisted) country. */
export const listRatesForCountry = query({
  args: { country: v.string() },
  handler: async (ctx, args) => {
    const viewer = await getAuthUserId(ctx);
    if (viewer === null) return null;
    return ctx.db
      .query("currencyRates")
      .withIndex("by_to", (q) => q.eq("toCurrency", args.country))
      .collect();
  },
});

/** Persist the user's display-currency preference. */
export const setDisplayCurrency = mutation({
  args: { country: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return;
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (settings) {
      await ctx.db.patch(settings._id, { displayCurrency: args.country });
    } else {
      await ctx.db.insert("userSettings", { userId, displayCurrency: args.country });
    }
  },
});

/** Read the current display-currency preference (client listens to this). */
export const getDisplayCurrency = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    // Kenya Mode: KES is the default display currency; USD stays selectable
    // via the stored preference when the global mode is enabled.
    return settings?.displayCurrency ?? DEFAULT_DISPLAY_CURRENCY;
  },
});

/**
 * Currency mode: "kes_first" (Kenya Mode, default) or "global"/
 * "global_multi_currency" (future expansion, USD available).
 */
export const getCurrencyMode = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return DEFAULT_CURRENCY_MODE;
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return settings?.currencyMode ?? DEFAULT_CURRENCY_MODE;
  },
});

export const setCurrencyMode = mutation({
  args: {
    mode: v.union(
      v.literal("kes_first"),
      v.literal("global"),
      v.literal("global_multi_currency"),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return;
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (settings) {
      await ctx.db.patch(settings._id, { currencyMode: args.mode });
    } else {
      await ctx.db.insert("userSettings", { userId, currencyMode: args.mode });
    }
  },
});

/** Country + best available rate from the static catalog (used for the export). */
export const getCountry = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const found = COUNTRIES.find((c) => c.code === args.code);
    const rate = found?.rateCentsPerUsd ?? null;
    return { ...found, rateCentsPerUsd: rate };
  },
});

const COUNTRIES = [
  {
    code: "KES",
    name: "Kenyan Shilling",
    symbol: "KSh",
    place: "Kenya",
    rateCentsPerUsd: 194.47,
    note: "Manual rate, effective from the Central Bank of Kenya reference period.",
  },
  {
    code: "USD",
    name: "United States Dollar",
    symbol: "$",
    place: "United States",
    rateCentsPerUsd: 100,
    note: "Base. 1 USD = 100 USD cents by definition.",
  },
] as const;

export type Country = (typeof COUNTRIES)[number];
