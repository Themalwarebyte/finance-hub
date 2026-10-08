import { BizPageHeader, BizStatCard } from "@/components/finance/BizParts";
import { api } from "@/convex/_generated/api";
import { formatMoney, formatShortDate } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import { useEffect } from "react";
import { toast } from "sonner";

const NSE_STARTING_POSITIONS = [
  { symbol: "COOP", name: "Co-operative Bank", assetClass: "equity" as const, qtyInput: "3" },
  { symbol: "SCOM", name: "Safaricom", assetClass: "equity" as const, qtyInput: "2" },
  { symbol: "EQTY", name: "Equity Group", assetClass: "equity" as const, qtyInput: "1" },
  { symbol: "KCB", name: "KCB Group", assetClass: "equity" as const, qtyInput: "1" },
  { symbol: "KPC", name: "Kenya Pipeline", assetClass: "equity" as const, qtyInput: "10" },
];

export default function InvestmentsDashboardPage() {
  const seedPortfolio = useMutation(api.invest.seedNsePortfolio);
  const seedAllocations = useMutation(api.invest.seedAllocations);
  const seedRoadmaps = useMutation(api.invest.seedRoadmaps);
  const portfolio = useQuery(api.invest.portfolio, {});
  const roadmaps = useQuery(api.invest.listRoadmaps, {});

  useEffect(() => {
    void seedPortfolio({ positions: NSE_STARTING_POSITIONS }).catch(() => undefined);
    void seedAllocations({}).catch(() => undefined);
    void seedRoadmaps({}).catch(() => undefined);
  }, [seedPortfolio, seedAllocations, seedRoadmaps]);

  if (portfolio === undefined) {
    return <div className="text-muted-foreground text-sm">Loading portfolio…</div>;
  }

  const totals = portfolio.totals;
  const totalReturnCents =
    (totals.realizedCents ?? 0) + (totals.dividendsCents ?? 0) + (totals.interestCents ?? 0);

  return (
    <div className="flex flex-col gap-6">
      <BizPageHeader
        title="Investments — Dashboard"
        subtitle="Personal portfolio, separate from GHub business money. Prices are manual entries with source and time."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <BizStatCard
          label="Portfolio market value"
          value={
            totals.unknownPriceCount > 0
              ? `${formatMoney(totals.marketValueCents)} +`
              : formatMoney(totals.marketValueCents)
          }
          hint={
            totals.unknownPriceCount > 0
              ? `${totals.unknownPriceCount} position(s) need a price entry`
              : "From your latest manual price entries"
          }
        />
        <BizStatCard label="Cost basis (entered)" value={formatMoney(totals.costBasisCents)} />
        <BizStatCard label="Realized gains" value={formatMoney(totals.realizedCents ?? 0)} />
        <BizStatCard
          label="Dividends + interest"
          value={formatMoney((totals.dividendsCents ?? 0) + (totals.interestCents ?? 0))}
        />
        <BizStatCard label="Contributed capital" value={formatMoney(portfolio.contributedCents)} hint="Money you put in — not returns" />
        <BizStatCard
          label="Total return (realized + income)"
          value={formatMoney(totalReturnCents)}
          hint="Unrealized shown per position on Portfolio"
        />
      </div>

      <p className="text-muted-foreground text-xs">
        Methodology: total return = realized gains + dividends + interest. Unrealized gains are
        valuations against manually entered prices and are reported separately — they are not
        counted as returns until realized.
      </p>

      <section className="surface-card rounded-xl border p-4">
        <h2 className="text-sm font-semibold">Long-term roadmaps (registry)</h2>
        <ul className="mt-2 divide-y">
          {(roadmaps ?? []).map((roadmap) => (
            <li key={roadmap._id} className="flex items-center justify-between py-2.5 text-sm">
              <span className="font-medium">{roadmap.title}</span>
              <span className="text-muted-foreground text-xs">
                {formatShortDate(roadmap.startDate)} → {formatShortDate(roadmap.endDate)}
              </span>
            </li>
          ))}
          {(roadmaps ?? []).length === 0 && (
            <li className="text-muted-foreground py-3 text-sm">Seeding roadmaps…</li>
          )}
        </ul>
      </section>
    </div>
  );
}
