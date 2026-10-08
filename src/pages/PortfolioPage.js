import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BizPageHeader, BizStatCard } from "@/components/finance/BizParts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import { formatMoney, formatRelativeDate } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
export default function PortfolioPage() {
    const portfolio = useQuery(api.invest.portfolio, {});
    const updatePrice = useMutation(api.invest.updatePrice);
    const [editing, setEditing] = useState(null);
    const [price, setPrice] = useState("");
    const [source, setSource] = useState("manual");
    const [saving, setSaving] = useState(false);
    if (portfolio === undefined) {
        return _jsx("div", { className: "text-muted-foreground text-sm", children: "Loading holdings\u2026" });
    }
    const handleSavePrice = async () => {
        if (!editing)
            return;
        const cents = Math.round(Number.parseFloat(price || "0") * 100);
        if (!Number.isFinite(cents) || cents <= 0) {
            toast.error("Enter a positive price.");
            return;
        }
        setSaving(true);
        try {
            await updatePrice({
                securityId: editing._id,
                priceCents: cents,
                source,
            });
            toast.success("Price recorded (manual entry)");
            setEditing(null);
        }
        catch {
            toast.error("Couldn't record the price.");
        }
        finally {
            setSaving(false);
        }
    };
    const rows = portfolio.rows;
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx(BizPageHeader, { title: "Portfolio Holdings", subtitle: "Quantities are fixed-point exact; unknown cost bases are marked for entry." }), _jsxs("div", { className: "grid gap-3 sm:grid-cols-3", children: [_jsx(BizStatCard, { label: "Market value (priced only)", value: formatMoney(portfolio.totals.marketValueCents) }), _jsx(BizStatCard, { label: "Cost basis", value: formatMoney(portfolio.totals.costBasisCents) }), _jsx(BizStatCard, { label: "Needing price / cost entry", value: portfolio.totals.unknownPriceCount, hint: "Marked below \u2014 nothing is invented" })] }), _jsx("div", { className: "surface-card overflow-x-auto rounded-xl border", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-border/70 text-muted-foreground border-b text-left text-xs uppercase tracking-wider", children: [_jsx("th", { className: "px-4 py-2.5", children: "Security" }), _jsx("th", { className: "px-4 py-2.5", children: "Qty" }), _jsx("th", { className: "px-4 py-2.5", children: "Avg cost" }), _jsx("th", { className: "px-4 py-2.5", children: "Price (manual)" }), _jsx("th", { className: "px-4 py-2.5", children: "Value" }), _jsx("th", { className: "px-4 py-2.5", children: "Unrealized" }), _jsx("th", { className: "px-4 py-2.5" })] }) }), _jsxs("tbody", { children: [rows.map((row) => (_jsxs("tr", { className: "border-border/60 border-b last:border-0", children: [_jsxs("td", { className: "px-4 py-3", children: [_jsx("div", { className: "font-medium", children: row.symbol }), _jsxs("div", { className: "text-muted-foreground text-xs", children: [row.name, " \u00B7 ", row.assetClass.replace(/_/g, " "), row.avgCostCents === null && row.qtyDisplay !== "0" && (_jsx("span", { className: "ml-1 text-amber-600", children: "\u00B7 cost basis needed" }))] })] }), _jsx("td", { className: "px-4 py-3 tabular-nums", children: row.qtyDisplay }), _jsx("td", { className: "px-4 py-3 tabular-nums", children: row.avgCostCents === null ? "—" : formatMoney(row.avgCostCents) }), _jsx("td", { className: "px-4 py-3 tabular-nums", children: row.priceCents === null ? (_jsx("span", { className: "text-amber-600", children: "Enter price" })) : (_jsxs("div", { children: [formatMoney(row.priceCents), _jsxs("div", { className: "text-muted-foreground text-xs", children: [row.priceSource, " \u00B7 ", row.priceAt ? formatRelativeDate(row.priceAt) : ""] })] })) }), _jsx("td", { className: "px-4 py-3 tabular-nums", children: row.marketValueCents === null ? "—" : formatMoney(row.marketValueCents) }), _jsx("td", { className: "px-4 py-3 text-right tabular-nums", children: row.unrealizedCents === null
                                                ? "—"
                                                : `${row.unrealizedCents >= 0 ? "+" : "−"}${formatMoney(Math.abs(row.unrealizedCents))}` }), _jsx("td", { className: "px-4 py-3 text-right", children: _jsx(Button, { variant: "ghost", size: "icon-sm", "aria-label": `Update price for ${row.symbol}`, onClick: () => {
                                                    setEditing(row);
                                                    setPrice(row.priceCents ? (row.priceCents / 100).toFixed(2) : "");
                                                }, children: _jsx(Pencil, { className: "size-3.5" }) }) })] }, row._id))), rows.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 7, className: "text-muted-foreground px-4 py-10 text-center text-sm", children: "No securities yet \u2014 open the dashboard once to seed the NSE starting positions." }) }))] })] }) }), _jsx(Dialog, { open: editing !== null, onOpenChange: (open) => !open && setEditing(null), children: _jsxs(DialogContent, { className: "sm:max-w-sm", children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { children: ["Update price \u2014 ", editing?.symbol] }) }), _jsx("p", { className: "text-muted-foreground text-xs", children: "Manual entry with source and timestamp. This is not a live market price." }), _jsxs("form", { onSubmit: (event) => {
                                event.preventDefault();
                                void handleSavePrice();
                            }, className: "flex flex-col gap-4", children: [_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "price-input", children: "Price (KSh per share/unit)" }), _jsx(Input, { id: "price-input", inputMode: "decimal", value: price, onChange: (event) => setPrice(event.target.value), autoFocus: true })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "price-source", children: "Source" }), _jsx(Input, { id: "price-source", value: source, onChange: (event) => setSource(event.target.value), placeholder: "e.g. NSE close, broker statement" })] }), _jsx(DialogFooter, { children: _jsxs(Button, { type: "submit", disabled: saving, children: [saving && _jsx(Loader2, { className: "animate-spin" }), " Save price"] }) })] })] }) })] }));
}
