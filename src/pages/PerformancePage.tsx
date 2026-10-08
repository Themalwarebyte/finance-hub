import { BizPageHeader, BizStatCard } from "@/components/finance/BizParts";
import { api } from "@/convex/_generated/api";
import { formatMoney, formatShortDate } from "@/lib/format";
import { useQuery } from "convex/react";

export default function PerformancePage() {
  const portfolio = useQuery(api.invest.portfolio, {});
  const audit = useQuery(api.invest.listAudit, {});

  if (portfolio === undefined || audit === undefined) {
    return <div className="text-muted-foreground text-sm">Loading performance…</div>;
  }

  const totals = portfolio.totals;
  const unrealized = portfolio.rows.reduce(
    (sum, row) => sum + (row.unrealizedCents ?? 0),
    0,
  );
  const income = (totals.dividendsCents ?? 0) + (totals.interestCents ?? 0);
  const totalReturn = (totals.realizedCents ?? 0) + income;
  const contributed = portfolio.contributedCents;

  return (
    <div className="flex flex-col gap-6">
      <BizPageHeader
        title="Investment Performance"
        subtitle="Returns are separated from contributions. Valuations come from your manual price entries."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <BizStatCard label="Portfolio market value" value={formatMoney(totals.marketValueCents)} />
        <BizStatCard label="Contributed capital" value={formatMoney(contributed)} hint="Money you put in" />
        <BizStatCard label="Unrealized gain/loss" value={formatMoney(unrealized)} hint="Paper — vs manual prices" />
        <BizStatCard label="Realized gains" value={formatMoney(totals.realizedCents ?? 0)} />
        <BizStatCard label="Dividends received" value={formatMoney(totals.dividendsCents ?? 0)} />
        <BizStatCard label="Interest received" value={formatMoney(totals.interestCents ?? 0)} />
        <BizStatCard
          label="Total return"
          value={formatMoney(totalReturn)}
          hint="Realized + dividends + interest"
        />
        <BizStatCard
          label="Return on contributed capital"
          value={contributed > 0 ? `${((totalReturn / contributed) * 100).toFixed(1)}%` : "—"}
          hint="Total return ÷ money contributed"
        />
      </div>

      <p className="text-muted-foreground text-xs leading-5">
        Methodology: <strong>Total return = realized gains + dividends + interest</strong>.
        Unrealized gains are valuations against manually entered prices and are displayed
        separately — they never count toward total return until a sale realizes them. Contributions
        are shown apart from returns so market growth is never confused with deposits.
      </p>

      <section className="surface-card rounded-xl border p-4">
        <h2 className="text-sm font-semibold">Individual security performance</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left text-xs uppercase tracking-wider">
                <th className="py-2 pr-4">Security</th>
                <th className="py-2 pr-4">Qty</th>
                <th className="py-2 pr-4">Cost</th>
                <th className="py-2 pr-4">Value</th>
                <th className="py-2 pr-4">Unrealized</th>
                <th className="py-2 pr-4">Realized</th>
                <th className="py-2">Dividends + interest</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.rows.map((row) => (
                <tr key={row._id} className="border-border/60 border-b last:border-0">
                  <td className="py-2.5 pr-4 font-medium">{row.symbol}</td>
                  <td className="py-2.5 pr-4 tabular-nums">{row.qtyDisplay}</td>
                  <td className="py-2.5 pr-4 tabular-nums">{formatMoney(row.costBasisCents)}</td>
                  <td className="py-2.5 pr-4 tabular-nums">
                    {row.marketValueCents === null ? "—" : formatMoney(row.marketValueCents)}
                  </td>
                  <td className="py-2.5 pr-4 tabular-nums">
                    {row.unrealizedCents === null
                      ? "—"
                      : `${row.unrealizedCents >= 0 ? "+" : "−"}${formatMoney(Math.abs(row.unrealizedCents))}`}
                  </td>
                  <td className="py-2.5 pr-4 tabular-nums">{formatMoney(row.realizedCents)}</td>
                  <td className="py-2.5 tabular-nums">
                    {formatMoney(row.dividendsCents + row.interestCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="surface-card rounded-xl border p-4">
        <h2 className="text-sm font-semibold">Audit trail</h2>
        <p className="text-muted-foreground mt-1 text-xs">
          Every price update, manual correction and transaction is recorded here.
        </p>
        <ul className="mt-3 max-h-72 divide-y overflow-y-auto">
          {audit
            .slice()
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((entry) => (
              <li key={entry._id} className="py-2 text-sm">
                <span className="text-muted-foreground text-xs">
                  {formatShortDate(entry.createdAt)} · {entry.action}
                </span>
                <p>{entry.detail}</p>
              </li>
            ))}
          {audit.length === 0 && (
            <li className="text-muted-foreground py-4 text-sm">No audit entries yet.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
