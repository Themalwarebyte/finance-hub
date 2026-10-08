import { BizPageHeader, BizStatCard } from "@/components/finance/BizParts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatMoney, formatRelativeDate } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Row = {
  _id: string;
  symbol: string;
  name: string;
  assetClass: string;
  qtyDisplay: string;
  avgCostCents: number | null;
  priceCents: number | null;
  priceSource: string | null;
  priceAt: number | null;
  costBasisCents: number;
  marketValueCents: number | null;
  unrealizedCents: number | null;
};

export default function PortfolioPage() {
  const portfolio = useQuery(api.invest.portfolio, {});
  const updatePrice = useMutation(api.invest.updatePrice);
  const [editing, setEditing] = useState<Row | null>(null);
  const [price, setPrice] = useState("");
  const [source, setSource] = useState("manual");
  const [saving, setSaving] = useState(false);

  if (portfolio === undefined) {
    return <div className="text-muted-foreground text-sm">Loading holdings…</div>;
  }

  const handleSavePrice = async () => {
    if (!editing) return;
    const cents = Math.round(Number.parseFloat(price || "0") * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      toast.error("Enter a positive price.");
      return;
    }
    setSaving(true);
    try {
      await updatePrice({
        securityId: editing._id as Id<"securities">,
        priceCents: cents,
        source,
      });
      toast.success("Price recorded (manual entry)");
      setEditing(null);
    } catch {
      toast.error("Couldn't record the price.");
    } finally {
      setSaving(false);
    }
  };

  const rows = portfolio.rows as unknown as Row[];

  return (
    <div className="flex flex-col gap-6">
      <BizPageHeader
        title="Portfolio Holdings"
        subtitle="Quantities are fixed-point exact; unknown cost bases are marked for entry."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <BizStatCard label="Market value (priced only)" value={formatMoney(portfolio.totals.marketValueCents)} />
        <BizStatCard label="Cost basis" value={formatMoney(portfolio.totals.costBasisCents)} />
        <BizStatCard
          label="Needing price / cost entry"
          value={portfolio.totals.unknownPriceCount}
          hint="Marked below — nothing is invented"
        />
      </div>

      <div className="surface-card overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border/70 text-muted-foreground border-b text-left text-xs uppercase tracking-wider">
              <th className="px-4 py-2.5">Security</th>
              <th className="px-4 py-2.5">Qty</th>
              <th className="px-4 py-2.5">Avg cost</th>
              <th className="px-4 py-2.5">Price (manual)</th>
              <th className="px-4 py-2.5">Value</th>
              <th className="px-4 py-2.5">Unrealized</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row._id} className="border-border/60 border-b last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium">{row.symbol}</div>
                  <div className="text-muted-foreground text-xs">
                    {row.name} · {row.assetClass.replace(/_/g, " ")}
                    {row.avgCostCents === null && row.qtyDisplay !== "0" && (
                      <span className="ml-1 text-amber-600">· cost basis needed</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 tabular-nums">{row.qtyDisplay}</td>
                <td className="px-4 py-3 tabular-nums">
                  {row.avgCostCents === null ? "—" : formatMoney(row.avgCostCents)}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {row.priceCents === null ? (
                    <span className="text-amber-600">Enter price</span>
                  ) : (
                    <div>
                      {formatMoney(row.priceCents)}
                      <div className="text-muted-foreground text-xs">
                        {row.priceSource} · {row.priceAt ? formatRelativeDate(row.priceAt) : ""}
                      </div>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {row.marketValueCents === null ? "—" : formatMoney(row.marketValueCents)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {row.unrealizedCents === null
                    ? "—"
                    : `${row.unrealizedCents >= 0 ? "+" : "−"}${formatMoney(Math.abs(row.unrealizedCents))}`}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Update price for ${row.symbol}`}
                    onClick={() => {
                      setEditing(row);
                      setPrice(row.priceCents ? (row.priceCents / 100).toFixed(2) : "");
                    }}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="text-muted-foreground px-4 py-10 text-center text-sm">
                  No securities yet — open the dashboard once to seed the NSE starting positions.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Update price — {editing?.symbol}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-xs">
            Manual entry with source and timestamp. This is not a live market price.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleSavePrice();
            }}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="price-input">Price (KSh per share/unit)</Label>
              <Input
                id="price-input"
                inputMode="decimal"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="price-source">Source</Label>
              <Input
                id="price-source"
                value={source}
                onChange={(event) => setSource(event.target.value)}
                placeholder="e.g. NSE close, broker statement"
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="animate-spin" />} Save price
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
