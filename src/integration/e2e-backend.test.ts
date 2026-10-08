/**
 * Phase 4.1 — REAL end-to-end integration tests against the LIVE Convex
 * deployment (the same API surface the browser uses).
 *
 * Uses ConvexHttpClient + Convex Auth sessions (anonymous provider) so every
 * call is a genuine authenticated request from a distinct user identity.
 * All test data is clearly labeled `E2E-ITEST` and cleaned up where the
 * existing API supports deletion.
 *
 * Run: bun test src/integration/e2e-backend.test.ts
 */
import { ConvexHttpClient, type AnyApiRef } from "convex/browser";
import { api } from "../convex/_generated/api";

const URL = process.env.VITE_CONVEX_URL;
if (!URL) throw new Error("VITE_CONVEX_URL not configured");

const LABEL = "E2E-ITEST";

/** Sign in a fresh anonymous user; returns a client bound to that session. */
async function signInAnonymously(): Promise<ConvexHttpClient> {
  const client = new ConvexHttpClient(URL);
  // auth.signIn is an Action (providers may perform external calls).
  const res = (await client.action(api.auth.signIn as AnyApiRef, {
    provider: "anonymous",
    params: {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)) as { tokens?: { token: string } };
  const token = res?.tokens?.token;
  if (!token) throw new Error("Anonymous sign-in returned no token");
  client.setAuth(token);
  return client;
}

describe("Phase 4.1 — live backend integration", () => {
  it("authenticates a real anonymous session (login works)", async () => {
    const client = await signInAnonymously();
    const user = await client.query(api.users.currentUser, {});
    expect(user).not.toBeNull();
    expect(user!.isAnonymous).toBe(true);
    
  }, 30_000);

  it("two users are isolated: each sees only their own workspace data", async () => {
    const alice = await signInAnonymously();
    const bob = await signInAnonymously();

    // Each user gets (or has) their own workspace.
    const aliceHousehold = await alice.mutation(api.households.create, {
      name: `${LABEL}-A`,
    });
    const bobHousehold = await bob.mutation(api.households.create, {
      name: `${LABEL}-B`,
    });
    expect(aliceHousehold).toBeTruthy();
    expect(bobHousehold).toBeTruthy();

    // Alice creates an account in HER workspace.
    const aliceAccount = await alice.mutation(api.accounts.create, {
      name: `${LABEL}-alice-account`,
      kind: "checking",
      openingBalance: 12_345,
      currency: "KES",
    });

    // Alice sees exactly her account; Bob cannot see it.
    const aliceAccounts = await alice.query(api.accounts.list, {});
    expect(aliceAccounts.some((a: { _id: string }) => a._id === aliceAccount)).toBe(true);
    const bobAccounts = await bob.query(api.accounts.list, {});
    expect(bobAccounts.some((a: { _id: string }) => a._id === aliceAccount)).toBe(false);

    // Bob attempts a cross-user write against Alice's account → rejected.
    let rejected = "";
    try {
      await bob.mutation(api.transactions.create, {
        accountId: aliceAccount,
        direction: "out",
        amount: 100,
        description: `${LABEL} cross-attempt`,
        category: "Test",
        date: Date.now(),
      });
    } catch (err) {
      rejected = err instanceof Error ? err.message : String(err);
    }
    expect(rejected.length).toBeGreaterThan(0);

    // Cleanup: Alice's labeled account (households have no delete API).
    await alice.mutation(api.accounts.remove, { accountId: aliceAccount });
    
    
  }, 45_000);

  it("display-currency switch never mutates stored amounts", async () => {
    const client = await signInAnonymously();
    await client.mutation(api.households.create, { name: `${LABEL}-FX` });

    const before = await client.mutation(api.accounts.create, {
      name: `${LABEL}-fx-account`,
      kind: "savings",
      openingBalance: 77_700,
      currency: "KES",
    });

    // Switch display currency both ways; storage must not change.
    await client.mutation(api.currency.setDisplayCurrency, { country: "KES" });
    await client.mutation(api.currency.setDisplayCurrency, { country: "USD" });
    await client.mutation(api.currency.setDisplayCurrency, { country: "KES" });

    const listed = await client.query(api.accounts.list, {});
    const row = listed.find((a: { _id: string }) => a._id === before);
    expect(row).toBeDefined();
    expect(row!.openingBalance).toBe(77_700); // original cents preserved
    expect(row!.currency).toBe("KES"); // original currency preserved

    await client.mutation(api.accounts.remove, { accountId: before });
    
  }, 45_000);

  it("exchange-rate CRUD enforces integrity (positive, distinct currencies)", async () => {
    const client = await signInAnonymously();
    const now = Date.now();

    // Valid manual rate is stored and readable.
    await client.mutation(api.currency.setExchangeRate, {
      fromCurrency: "USD",
      toCurrency: "KES",
      exchangeRate: 129.5,
      effectiveDate: now,
      source: `${LABEL} synthetic test rate`,
    });
    const rate = await client.query(api.currency.getExchangeRate, {
      fromCurrency: "USD",
      toCurrency: "KES",
    });
    expect(rate).toBe(129.5);

    // Invalid rates are rejected by the deployed guards.
    const invalids: Array<[number, string, string]> = [
      [-5, "USD", "KES"],
      [0, "USD", "KES"],
      [1, "USD", "USD"],
    ];
    for (const [bad, from, to] of invalids) {
      let rejected = "";
      try {
        await client.mutation(api.currency.setExchangeRate, {
          fromCurrency: from,
          toCurrency: to,
          exchangeRate: bad,
          effectiveDate: now,
          source: `${LABEL} invalid`,
        });
      } catch (err) {
        rejected = err instanceof Error ? err.message : String(err);
      }
      expect(rejected.length).toBeGreaterThan(0);
    }

    // Unsupported pair (USD→EUR) has no stored rate → null → UI shows "n/a".
    const missing = await client.query(api.currency.getExchangeRate, {
      fromCurrency: "USD",
      toCurrency: "EUR",
    });
    expect(missing).toBeNull();

    
  }, 45_000);

  it("conversion math reconciles KES↔USD with a manual test rate", async () => {
    // Client-side converter must agree with the stored rate exactly.
    const { convertCents } = await import("../lib/currency");
    const rate = 129.5; // 1 USD = 129.5 KES (labeled test rate)
    const rateCentsPerUsd = rate * 100; // 1 USD = 12,950 KES cents
    const usd = convertCents(10_000, "USD", "KES", rateCentsPerUsd);
    // 100 USD -> 12,950 KES = 1,295,000 KES cents
    expect(usd.cents).toBe(1_295_000);

    const back = convertCents(usd.cents ?? 0, "KES", "USD", rateCentsPerUsd);
    // Round-trip returns the original 10,000 cents (within rounding).
    expect(Math.abs((back.cents ?? 0) - 10_000)).toBeLessThanOrEqual(1);

    // Missing rate → null (never fabricated).
    const none = convertCents(100, "USD", "EUR", null);
    expect(none.cents).toBeNull();
  }, 15_000);
});
