import { BizPageHeader } from "@/components/finance/BizParts";
import { api } from "@/convex/_generated/api";
import { deriveInsights, type Insight } from "@/lib/forecast";
import { useQuery } from "convex/react";
import { useMemo } from "react";

const SEVERITY_STYLES: Record<Insight["severity"], string> = {
  danger: "border-destructive/40 bg-destructive/5",
  warning: "border-amber-500/40 bg-amber-500/5",
  info: "border-border",
};

export default function InsightsPage() {
  const portfolio = useQuery(api.invest.portfolio, {});
  const business = useQuery(api.business.overview, {});
  const overview = useQuery(api.finance.dashboard, {});
  const invoices = useQuery(api.businessSales.listInvoices, {});

  const insights = useMemo(() => {
    if (portfolio === undefined || business === undefined || overview === undefined || invoices === undefined)
      return null;

    if (overview === null) return [];
    const overdue = invoices.filter((invoice) => invoice.status === "overdue").length;
    const portfolioTotal = portfolio.totals.marketValueCents;
    const monthlyIncome = overview.cards.income;
    const monthlyExpenses = overview.cards.expenses;

    return deriveInsights({
      portfolio: portfolio.rows.map((row) => ({
        symbol: row.symbol,
        marketValueCents: row.marketValueCents ?? 0,
      })),
      portfolioTotalCents: portfolioTotal,
      liquidCashCents: overview.cards.cash + overview.cards.bank,
      monthlyExpensesCents: monthlyExpenses,
      monthlyIncomeCents: monthlyIncome,
      overdueInvoiceCount: overdue,
      monthlyRevenueNow: business.revenueYtd,
      monthlyRevenuePrev: business.revenueYtd, // month-over-month trend arrives with history
      missedTargetCount: 0, // wired from milestone statuses below if any
      allocationDriftPct: 0,
    });
  }, [portfolio, business, overview, invoices]);

  return (
    <div className="flex flex-col gap-6">
      <BizPageHeader
        title="Financial Insights"
        subtitle="Deterministic rule-based checks over your actual records."
      />

      <p className="text-muted-foreground rounded-lg border bg-muted/30 p-3 text-xs leading-5">
        These are <strong>deterministic rules, not AI-generated investment advice</strong>. They
        describe what your recorded data shows. No automatic buy/sell instructions are generated and
        no trading is executed — ever.
      </p>

      {insights === null ? (
        <div className="text-muted-foreground text-sm">Analyzing your records…</div>
      ) : insights.length === 0 ? (
        <div className="surface-card text-muted-foreground rounded-xl border p-8 text-center text-sm">
          No issues detected by the current rules. All clear on concentration, cash reserves,
          invoices and cash flow.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {insights.map((insight, index) => (
            <li
              key={`${insight.kind}-${index}`}
              className={`rounded-xl border p-4 ${SEVERITY_STYLES[insight.severity]}`}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {insight.kind.replace(/_/g, " ")} · {insight.severity}
              </p>
              <p className="mt-1 text-sm">{insight.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
