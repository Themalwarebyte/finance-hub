import { BizPageHeader, BizStatCard } from "@/components/finance/BizParts";
import { api } from "@/convex/_generated/api";
import {
  GHUB_ACQUISITION,
  GHUB_VISION_TARGETS,
  SCENARIOS,
  fiveYearCheckpoints,
  planGhub,
  planNse,
  type ScenarioKind,
} from "@/lib/forecast";
import { formatMoney, formatCompactMoney } from "@/lib/format";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";

type Mode = "nse" | "ghub";

export default function RoadmapsPage() {
  const portfolio = useQuery(api.invest.portfolio, {});
  const business = useQuery(api.business.overview, {});
  const [mode, setMode] = useState<Mode>("nse");
  const [monthly, setMonthly] = useState("1000");
  const [growth, setGrowth] = useState("5");
  const [scenario, setScenario] = useState<ScenarioKind>("base");
  const [applyAcq, setApplyAcq] = useState(false);
  const [monthlyRevenue, setMonthlyRevenue] = useState("1000");
  const [margin, setMargin] = useState("25");
  const [drawPct, setDrawPct] = useState("40");

  const monthlyCents = Math.round(Number.parseFloat(monthly || "0") * 100);
  const startBalance = portfolio?.totals.marketValueCents ?? 0;

  const nsePlan = useMemo(
    () =>
      planNse({
        startBalanceCents: startBalance,
        monthlyBudgetCents: monthlyCents,
        contributionGrowthPctPerYear: Number.parseFloat(growth || "0"),
        scenario,
        annualFeePct: 1.2,
        dividendYieldPct: 4,
        reinvestDividends: true,
      }),
    [startBalance, monthlyCents, growth, scenario],
  );

  const ghubPlan = useMemo(
    () =>
      planGhub({
        monthlyRevenueCents: Math.round(Number.parseFloat(monthlyRevenue || "0") * 100),
        monthlyRevenueGrowthPctPerYear: 8,
        profitMarginPct: Number.parseFloat(margin || "0"),
        ownerDrawPct: Number.parseFloat(drawPct || "0"),
        startBusinessEquityCents: business?.availableCash ?? 0,
        monthlyPersonalInvestmentCents: monthlyCents,
        scenario,
        contributionGrowthPctPerYear: Number.parseFloat(growth || "0"),
        annualFeePct: 1.2,
        dividendYieldPct: 4,
        startPersonalInvestmentsCents: startBalance,
        applyHypotheticalAcquisition: applyAcq,
      }),
    [business, startBalance, monthlyCents, growth, scenario, applyAcq, monthlyRevenue, margin, drawPct],
  );

  const checkpoints = fiveYearCheckpoints(nsePlan);
  const visionByYear = new Map(GHUB_VISION_TARGETS.map((t) => [t.year, t]));

  return (
    <div className="flex flex-col gap-6">
      <BizPageHeader
        title="Long-Term Roadmaps"
        subtitle="30-year NSE strategy (Oct 2026 – Sep 2056) and the 33-year GHub master plan (Oct 2026 – Sep 2059). All projections are HYPOTHETICAL — clearly labeled assumptions, never actual results."
      />

      <div className="bg-muted flex w-fit rounded-lg p-1">
        <button
          type="button"
          onClick={() => setMode("nse")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium ${mode === "nse" ? "bg-card text-foreground shadow-[var(--shadow-soft)]" : "text-muted-foreground"}`}
        >
          NSE 30-year
        </button>
        <button
          type="button"
          onClick={() => setMode("ghub")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium ${mode === "ghub" ? "bg-card text-foreground shadow-[var(--shadow-soft)]" : "text-muted-foreground"}`}
        >
          GHub 33-year
        </button>
      </div>

      <section className="surface-card rounded-xl border p-4">
        <h2 className="text-sm font-semibold">Editable assumptions (no code changes needed)</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {mode === "ghub" && (
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-muted-foreground">Monthly business revenue (KSh)</span>
              <input className="border-border rounded-md border px-2 py-1.5 tabular-nums" inputMode="decimal" value={monthlyRevenue} onChange={(e) => setMonthlyRevenue(e.target.value)} />
            </label>
          )}
          {mode === "ghub" && (
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-muted-foreground">Net profit margin %</span>
              <input className="border-border rounded-md border px-2 py-1.5 tabular-nums" inputMode="decimal" value={margin} onChange={(e) => setMargin(e.target.value)} />
            </label>
          )}
          {mode === "ghub" && (
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-muted-foreground">Owner draw % of profit</span>
              <input className="border-border rounded-md border px-2 py-1.5 tabular-nums" inputMode="decimal" value={drawPct} onChange={(e) => setDrawPct(e.target.value)} />
            </label>
          )}
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">Monthly investment (KSh — any amount)</span>
            <input className="border-border rounded-md border px-2 py-1.5 tabular-nums" inputMode="decimal" value={monthly} onChange={(e) => setMonthly(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">Contribution growth %/yr</span>
            <input className="border-border rounded-md border px-2 py-1.5 tabular-nums" inputMode="decimal" value={growth} onChange={(e) => setGrowth(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">Scenario (hypothetical)</span>
            <select className="border-border rounded-md border px-2 py-1.5" value={scenario} onChange={(e) => setScenario(e.target.value as ScenarioKind)}>
              <option value="conservative">Conservative — 3%/yr, 5% inflation</option>
              <option value="base">Base — 8%/yr, 5% inflation</option>
              <option value="ambitious">Ambitious — 12%/yr, 5% inflation</option>
            </select>
          </label>
          {mode === "ghub" && (
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={applyAcq} onChange={(e) => setApplyAcq(e.target.checked)} />
              <span>Include hypothetical Year-19 acquisition (speculative)</span>
            </label>
          )}
        </div>
        <p className="text-muted-foreground mt-3 text-xs">
          Scenario presets: conservative {SCENARIOS.conservative.annualReturnPct}% · base{" "}
          {SCENARIOS.base.annualReturnPct}% · ambitious {SCENARIOS.ambitious.annualReturnPct}% annual
          returns, all with {SCENARIOS.base.annualInflationPct}% inflation. Fees 1.2%/yr and 4%
          dividend yield modeled and reinvested. Forecast assumptions — NOT verified performance.
        </p>
      </section>

      {mode === "nse" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <BizStatCard label="Start (actual portfolio)" value={formatMoney(startBalance)} />
            <BizStatCard label="Projected end (nominal)" value={formatCompactMoney(nsePlan.totals.endBalanceCents)} hint="Hypothetical" />
            <BizStatCard label="Projected end (real, inflation-adj.)" value={formatCompactMoney(nsePlan.totals.endRealBalanceCents)} hint="Hypothetical" />
            <BizStatCard label="Total contributions" value={formatCompactMoney(nsePlan.totals.contributionsCents)} hint="Money you put in" />
            <BizStatCard label="Modeled returns" value={formatCompactMoney(nsePlan.totals.returnsCents)} hint="Hypothetical growth" />
            <BizStatCard label="Modeled dividends (reinvested)" value={formatCompactMoney(nsePlan.totals.dividendsCents)} />
            <BizStatCard label="Modeled fees" value={formatCompactMoney(nsePlan.totals.feesCents)} />
            <BizStatCard label="360-month engine" value="OK" hint="Oct 2026 → Sep 2056" />
          </div>

          <section className="surface-card rounded-xl border p-4">
            <h2 className="text-sm font-semibold">Five-year milestones (projected, hypothetical)</h2>
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left text-xs uppercase">
                  <th className="py-2 pr-4">Year</th>
                  <th className="py-2 pr-4">Nominal</th>
                  <th className="py-2 pr-4">Real (today's KSh)</th>
                  <th className="py-2">Cumulative contributions</th>
                </tr>
              </thead>
              <tbody>
                {checkpoints.map((row) => (
                  <tr key={row.year} className="border-border/60 border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">Year {row.year}</td>
                    <td className="py-2 pr-4 tabular-nums">{formatCompactMoney(row.endBalanceCents)}</td>
                    <td className="py-2 pr-4 tabular-nums">{formatCompactMoney(row.realBalanceCents)}</td>
                    <td className="py-2 tabular-nums">
                      {formatCompactMoney(nsePlan.yearly.slice(0, row.year).reduce((s, y) => s + y.contributionsCents, 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <BizStatCard label="Start business equity (actual)" value={formatMoney(business?.availableCash ?? 0)} />
            <BizStatCard label="Year-33 total wealth (nominal)" value={formatCompactMoney(ghubPlan.years[32]?.totalWealthCents ?? 0)} hint="HYPOTHETICAL projection" />
            <BizStatCard label="Year-33 liquid investments" value={formatCompactMoney(ghubPlan.years[32]?.liquidInvestmentsCents ?? 0)} />
            <BizStatCard label="Year-33 business equity (illiquid)" value={formatCompactMoney(ghubPlan.years[32]?.businessEquityCents ?? 0)} />
          </div>

          <p className="text-muted-foreground text-xs leading-5">
            Liquid vs illiquid are tracked separately at every year: owner draws route to personal
            investments (liquid); retained earnings build business equity (illiquid). The
            hypothetical acquisition (70% of GHub at KSh 7.5B EV → ~KSh 4.2B post-tax) exists only
            inside this projection when enabled — it is never written to actual records and never
            counted as realized wealth.
          </p>

          <section className="surface-card overflow-x-auto rounded-xl border p-4">
            <h2 className="text-sm font-semibold">Vision targets vs projection (both hypothetical except start)</h2>
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left text-xs uppercase">
                  <th className="py-2 pr-4">Year</th>
                  <th className="py-2 pr-4">Vision net worth</th>
                  <th className="py-2 pr-4">Projected total wealth</th>
                  <th className="py-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {GHUB_VISION_TARGETS.map((target) => (
                  <tr key={target.year} className="border-border/60 border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">Year {target.year}</td>
                    <td className="py-2 pr-4 tabular-nums">
                      {target.netWorthCents === null ? "—" : formatCompactMoney(target.netWorthCents)}
                    </td>
                    <td className="py-2 pr-4 tabular-nums">
                      {formatCompactMoney(ghubPlan.years[target.year - 1]?.totalWealthCents ?? 0)}
                    </td>
                    <td className="text-muted-foreground py-2 text-xs">
                      {target.label ?? (target.revenueCents !== null ? `Revenue vision ${formatCompactMoney(target.revenueCents)}` : "")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-muted-foreground mt-2 text-xs">
              Acquisition constants: year {GHUB_ACQUISITION.year}, {GHUB_ACQUISITION.stakePct}% stake,
              EV {formatCompactMoney(GHUB_ACQUISITION.enterpriseValueCents)}, proceeds{" "}
              {formatCompactMoney(GHUB_ACQUISITION.hypotheticalProceedsCents)} — SPECULATIVE.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
