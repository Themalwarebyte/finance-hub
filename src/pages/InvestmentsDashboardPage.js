import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BizPageHeader, BizStatCard } from "@/components/finance/BizParts";
import { api } from "@/convex/_generated/api";
import { formatMoney, formatShortDate } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import { useEffect } from "react";
const NSE_STARTING_POSITIONS = [
    { symbol: "COOP", name: "Co-operative Bank", assetClass: "equity", qtyInput: "3" },
    { symbol: "SCOM", name: "Safaricom", assetClass: "equity", qtyInput: "2" },
    { symbol: "EQTY", name: "Equity Group", assetClass: "equity", qtyInput: "1" },
    { symbol: "KCB", name: "KCB Group", assetClass: "equity", qtyInput: "1" },
    { symbol: "KPC", name: "Kenya Pipeline", assetClass: "equity", qtyInput: "10" },
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
        return _jsx("div", { className: "text-muted-foreground text-sm", children: "Loading portfolio\u2026" });
    }
    const totals = portfolio.totals;
    const totalReturnCents = (totals.realizedCents ?? 0) + (totals.dividendsCents ?? 0) + (totals.interestCents ?? 0);
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx(BizPageHeader, { title: "Investments \u2014 Dashboard", subtitle: "Personal portfolio, separate from GHub business money. Prices are manual entries with source and time." }), _jsxs("div", { className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-4", children: [_jsx(BizStatCard, { label: "Portfolio market value", value: totals.unknownPriceCount > 0
                            ? `${formatMoney(totals.marketValueCents)} +`
                            : formatMoney(totals.marketValueCents), hint: totals.unknownPriceCount > 0
                            ? `${totals.unknownPriceCount} position(s) need a price entry`
                            : "From your latest manual price entries" }), _jsx(BizStatCard, { label: "Cost basis (entered)", value: formatMoney(totals.costBasisCents) }), _jsx(BizStatCard, { label: "Realized gains", value: formatMoney(totals.realizedCents ?? 0) }), _jsx(BizStatCard, { label: "Dividends + interest", value: formatMoney((totals.dividendsCents ?? 0) + (totals.interestCents ?? 0)) }), _jsx(BizStatCard, { label: "Contributed capital", value: formatMoney(portfolio.contributedCents), hint: "Money you put in \u2014 not returns" }), _jsx(BizStatCard, { label: "Total return (realized + income)", value: formatMoney(totalReturnCents), hint: "Unrealized shown per position on Portfolio" })] }), _jsx("p", { className: "text-muted-foreground text-xs", children: "Methodology: total return = realized gains + dividends + interest. Unrealized gains are valuations against manually entered prices and are reported separately \u2014 they are not counted as returns until realized." }), _jsxs("section", { className: "surface-card rounded-xl border p-4", children: [_jsx("h2", { className: "text-sm font-semibold", children: "Long-term roadmaps (registry)" }), _jsxs("ul", { className: "mt-2 divide-y", children: [(roadmaps ?? []).map((roadmap) => (_jsxs("li", { className: "flex items-center justify-between py-2.5 text-sm", children: [_jsx("span", { className: "font-medium", children: roadmap.title }), _jsxs("span", { className: "text-muted-foreground text-xs", children: [formatShortDate(roadmap.startDate), " \u2192 ", formatShortDate(roadmap.endDate)] })] }, roadmap._id))), (roadmaps ?? []).length === 0 && (_jsx("li", { className: "text-muted-foreground py-3 text-sm", children: "Seeding roadmaps\u2026" }))] })] })] }));
}
