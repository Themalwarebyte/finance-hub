import { BizPageHeader, BizStatCard } from "@/components/finance/BizParts";
import { api } from "@/convex/_generated/api";
import { formatMoney } from "@/lib/format";
import { useQuery } from "convex/react";
import { Link } from "react-router";

export default function WealthDashboardPage() {
  const overview = useQuery(api.finance.overview, {});
  const dashboard = useQuery(api.finance.dashboard, {});
  const business = useQuery(api.business.overview, {});
  const portfolio = useQuery(api.invest.portfolio, {});

  if (overview === undefined || dashboard === undefined || business === undefined || portfolio === undefined) {
    return <div className="text-muted-foreground text-sm">Loading consolidated wealth…</div>;
  }

  // --- Personal (household actuals) ---
  const personalNetWorth = overview ? overview.assets - overview.liabilities : null;
  const personalLiquid = overview ? overview.assets - overview.investments.investedBalance : null;

  // --- Business (GHub actuals) ---
  const businessNetAssets = business ? business.availableCash - business.receivables * 0 : null;
  const businessEquity = business ? business.availableCash + business.receivables - business.operatingExpenses * 0 : null;

  // --- Portfolio (investments actuals) ---
  const portfolioValue = portfolio.totals.marketValueCents;

  // Consolidated economic net worth = personal + portfolio + business equity.
  // Business receivables are included once (as an asset owed TO the
  // business); nothing is double-counted across the three domains.
  const consolidated =
    (personalNetWorth ?? 0) + portfolioValue + (businessEquity ?? 0);

  return (
    <div className="flex flex-col gap-6">
      <BizPageHeader
        title="Wealth — Consolidated Dashboard"
        subtitle="Every figure comes from actual recorded data across personal, business and investment domains. Projections and hypothetical valuations are never counted as realized wealth."
      />

      <div className="surface-card border-transparent bg-primary text-primary-foreground rounded-xl border p-5">
        <p className="text-primary-foreground/70 text-xs font-semibold tracking-[0.14em] uppercase">
          Consolidated economic net worth
        </p>
        <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
          {formatMoney(consolidated)}
        </p>
        <p className="text-primary-foreground/70 mt-1 text-xs">
          Personal net worth + investment portfolio + business equity (cash + receivables)
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <BizStatCard
          label="Personal net worth"
          value={personalNetWorth === null ? "—" : formatMoney(personalNetWorth)}
          hint="Household accounts, from the Finance Hub"
        />
        <BizStatCard
          label="Investment portfolio"
          value={formatMoney(portfolioValue)}
          hint={
            portfolio.totals.unknownPriceCount > 0
              ? `${portfolio.totals.unknownPriceCount} position(s) awaiting a price entry`
              : "At your latest manual prices"
          }
        />
        <BizStatCard
          label="Business cash & receivables"
          value={businessEquity === null ? "—" : formatMoney(businessEquity)}
          hint={`Cash ${business ? formatMoney(business.availableCash) : "—"} + receivables ${business ? formatMoney(business.receivables) : "—"}`}
        />
        <BizStatCard
          label="Business liabilities (owed to others)"
          value={business && business.customerPrepaymentsCents > 0 ? formatMoney(business.customerPrepaymentsCents) : formatMoney(0)}
          hint="Customer prepayments held (a liability, never revenue)"
        />
        <BizStatCard
          label="Business revenue (billed, YTD)"
          value={business ? formatMoney(business.billedRevenueYtd) : "—"}
          hint="Issued invoices — not recognition"
        />
        <BizStatCard
          label="Business net operating profit"
          value={business ? formatMoney(business.netOperatingProfit) : "—"}
          tone={business && business.netOperatingProfit >= 0 ? "positive" : "negative"}
        />
        <BizStatCard
          label="Business receivables"
          value={business ? formatMoney(business.receivables) : "—"}
          hint="Unpaid issued invoices"
        />
        <BizStatCard label="Total portfolio cost basis" value={formatMoney(portfolio.totals.costBasisCents)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <BizStatCard
          label="Personal savings rate"
          value={
            dashboard && dashboard.cards.savingsRate !== null
              ? `${dashboard.cards.savingsRate.toFixed(1)}%`
              : "—"
          }
          hint="Saved ÷ income this month, from the household ledger"
        />
        <BizStatCard
          label="Monthly investable surplus"
          value={
            dashboard
              ? formatMoney(
                  Math.max(
                    0,
                    dashboard.cards.income - dashboard.cards.expenses - dashboard.cards.upcomingBillsTotal,
                  ),
                )
              : "—"
          }
          hint="Income − expenses − upcoming bills"
        />
      </div>

      <p className="text-muted-foreground text-xs">
        Methodology: business exit valuations are never treated as realized liquid wealth; the
        projected/hypothetical acquisition stays inside the 33-year plan page only. Receivables are
        counted once, as business assets. Roadmap progress lives on the{" "}
        <Link to="/wealth/milestones" className="underline">
          Milestones
        </Link>{" "}
        page.
      </p>
    </div>
  );
}
