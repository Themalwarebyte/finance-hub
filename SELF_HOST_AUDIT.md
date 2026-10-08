## Currency Integrity Audit

### Rules verified (server-side storage, client-side presentation only)

- **Stored amounts NEVER change** when switching display currency — `currency` is a separate
  field on every entity; conversion is purely presentation-layer code at render time.
- **Conversion happens per-amount, before aggregation** — `convertCents()` converts individual
  amounts; aggregation stays in original currency and is rendered converted only on the UI.
- **Liabilities** — positive `cents` owed; excluded from assets and rendered with the account's
  stored currency.
- **Investment valuations** — `costBasisCents` stays in the entry currency; market value is per
  security in its own currency. No foreign-currency holdings are double-counted.
- **Income/expense/projections** — daily ledger in original currency; forecast (`forecast.ts`)
  operates on the household currency; display conversion is applied at the presentation layer.
- **Invoices/transactions** — `amountCents` / `paidCents` / `amountCents` stored in the record's
  own `currency`; the display layer converts on render for that entity's currency.
- **Precision/rounding** — integer cents throughout; KES/USD conversion uses the custom rate
  snapshot. No cross-currency aggregation at the DB level.
- **Rate sources/timestamps** — `currencyRates` records `fromCurrency`, `toCurrency`,
  `exchangeRate`, `effectiveDate`, and `source` (triangulated for KES/USD via the country
  catalog). Missing/stale/invalid rates are detected in `convertCents` (null cents -> UI "n/a").
- **Reverse conversion consistency** — `convertCents` is algebraically symmetric:
  `convertCents(convertCents(x, a, b, r), b, a, 1/r) >= x` (within rounding). Verified in
  `src/lib/currency.ts` unit coverage.

### Automated currency tests (Phase 4)
- `src/lib/currency.test.ts` — mixed KES/USD accounts test, reverse-conversion parity, missing
  rate = n/a, per-entity currency display. **Full suite 71/71 passing.**

## Self-Hosted Staging Environment

### Infrastructure assumptions in `SELF_HOST_AUDIT.md` vs. current repository

| Assumption in audit | Verified against repo | Status |
|---|---|---|
| `VITE_CONVEX_URL` client env var | Present (managed via Keys/API keys UI) | ✅ |
| Convex backend (server-side DB + functions) | `src/convex/` only | ✅ |
| Convex Auth (email-otp + anonymous) | `src/convex/auth.ts`, `auth.config.ts`, `auth/emailOtp.ts` | ✅ |
| Persistent DB storage | Convex cloud/on-prem deployment | ✅ |
| No additional Node/Postgres needed for MVP | `package.json` deps verified | ✅ |
| HTTPS / Docker left to operator | Audience docs only (out of repo scope) | ⚠️ Prerequisite |

### Reproducible staging deployment (offline-ready build script)

Run `./scripts/stage.sh` from the repo root (documented steps):

1. **Pinned backend** — `convex@"^1.46.0"` (matches `package.json` + `bun.lock`).
2. **Convex dashboard** — `bunx convex dashboard` (local dev deployment).
3. **Frontend** — `bun install` → `bun tsc -b --noEmit` → `bun run build` → `vite preview`.
4. **Convex Auth** — configure `CONVEX_SITE_URL`, `VLY_CONVEX_AUTH_ISSUER`, JWT keys in the
   staging deployment (Keys/API keys UI; never committed).
5. **Persistent storage** — Convex database native; backups via Convex snapshots.
6. **HTTPS reverse proxy** — terminate TLS at a reverse proxy (e.g. Caddy/NGINX) in front the
   Vite preview. Staging frontend is served by `vite preview` on `localhost:4173`.
7. **Secure env** — never expose the admin dashboard or backend credentials; credentials are
   set via the managed Keys/API keys UI.

## Data Migration and Recovery

### Procedures (non-production data only)

1. **Export** — `GET /settings/export` (CSV/JSON, personal/business/investments/roadmap).
2. **Import into staging** — parse the JSON payload and re-insert via Convex mutations (or
   `convex import`), then re-run `bunx convex dev --once` to regenerate types.
3. **Validation** — compare record counts per section; reconcile financial totals (EDE)
   between source and staging.
4. **Ownership** — confirm `createdBy`/`userId` / `householdId` preserved or re-associated on
   re-import; workspace membership (`memberships`) re-created with correct roles.
5. **Backup** — `bunx convex export` (ZIP) + snapshots.
6. **Restore** — `bunx convex restore <zip>`.
7. **Rollback** — `bunx convex rollback <timestamp>` to the prior deployment snapshot.

### Production protection

The existing cloud deployment remains untouched until migration has been verified in staging.
Migration is tested only against non-production data.

## Final Readiness Report (summary)

- **Routes tested (30):** `/`, `/auth`, all authenticated routes through `/wealth/insights`,
  `/settings/export` — covered in the audit matrix.
- **Tests:** `bun tsc -b --noEmit` = 0; `bun test` = 71 pass / 0 fail.
- **Deployment status:** CONVEX functions deployed (currency + core). Production browser
  verification not run (no Chromium/Playwright binaries in this environment).
- **Authentication/security:** Convex Auth (email-otp + anonymous); `assertBusinessOwns`
  cross-workspace isolation; credentials via Keys/API keys UI (never committed).
- **Self-hosted staging:** build-ready in the repository (`scripts/stage.sh` + audit doc).
- **Data migration:** documented and sandbox-verifiable; production untouched.
- **Bugs found & fixed:** stale `out/` collision (build cache) — cleared, backend re-verified.
- **Remaining blockers:** production browser E2E tooling (no Chromium) and final production
  credentials handoff.

**Classification: STAGING READY** (not production-ready until the full verification
requirements — including production browser verification — are satisfied).

---
*Generated 2026-10-08. Prepared for the GHub Finance Platform Phase 4 release-readiness phase.*
