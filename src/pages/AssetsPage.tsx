import { BizPageHeader } from "@/components/finance/BizParts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatMoney, formatShortDate } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const ASSET_CLASSES = [
  { value: "money_market_fund", label: "Money market fund" },
  { value: "sacco_deposit", label: "SACCO deposits (liquid)" },
  { value: "sacco_share_capital", label: "SACCO share capital (locked-in)" },
  { value: "treasury_bill", label: "Treasury bill (discount)" },
  { value: "treasury_bond", label: "Treasury bond (coupon)" },
  { value: "infrastructure_bond", label: "Infrastructure bond (tax-free coupon)" },
] as const;

export default function AssetsPage() {
  const securities = useQuery(api.invest.listSecurities, {});
  const createSecurity = useMutation(api.invest.createSecurity);
  const recordTxn = useMutation(api.invest.recordTxn);
  const updatePrice = useMutation(api.invest.updatePrice);

  const [open, setOpen] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [assetClass, setAssetClass] = useState<string>("money_market_fund");
  const [qty, setQty] = useState("1");
  const [saving, setSaving] = useState(false);

  const [cashOpen, setCashOpen] = useState(false);
  const [cashSecurity, setCashSecurity] = useState("");
  const [cashKind, setCashKind] = useState("contribution");
  const [cashAmount, setCashAmount] = useState("");
  const [cashSaving, setCashSaving] = useState(false);

  if (securities === undefined) {
    return <div className="text-muted-foreground text-sm">Loading assets…</div>;
  }

  const fundAssets = securities.filter((security) => security.assetClass !== "equity" && security.assetClass !== "etf");

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!symbol.trim() || !name.trim()) {
      toast.error("Symbol and name are required.");
      return;
    }
    setSaving(true);
    try {
      await createSecurity({
        symbol: symbol.trim(),
        name: name.trim(),
        assetClass: assetClass as typeof ASSET_CLASSES[number]["value"],
        qtyInput: qty.trim() || "1",
      });
      toast.success("Asset added");
      setOpen(false);
      setSymbol("");
      setName("");
    } catch {
      toast.error("Couldn't add the asset.");
    } finally {
      setSaving(false);
    }
  };

  const handleCash = async (event: React.FormEvent) => {
    event.preventDefault();
    const cents = Math.round(Number.parseFloat(cashAmount || "0") * 100);
    if (!cashSecurity || !Number.isFinite(cents) || cents <= 0) {
      toast.error("Choose an asset and a positive amount.");
      return;
    }
    setCashSaving(true);
    try {
      await recordTxn({
        securityId: cashSecurity as Id<"securities">,
        kind: cashKind as "contribution" | "withdrawal" | "interest" | "fee",
        amountCents: cents,
      });
      toast.success("Cash movement recorded");
      setCashOpen(false);
      setCashAmount("");
    } catch {
      toast.error("Couldn't record the movement.");
    } finally {
      setCashSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <BizPageHeader
        title="Other Investment Assets"
        subtitle="Money market funds, SACCO deposits vs share capital, and government securities. SACCO deposits and share capital are tracked separately — their liquidity and returns differ."
      >
        <Button onClick={() => setCashOpen(true)}>Record deposit / withdrawal</Button>
        <Button variant="outline" onClick={() => setOpen(true)}>
          <Plus className="size-4" /> Add asset
        </Button>
      </BizPageHeader>

      <p className="text-muted-foreground text-xs">
        Performance comes only from recorded deposits, withdrawals and distributions — no fixed
        hypothetical rate is applied anywhere.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {fundAssets.map((asset) => (
          <div key={asset._id} className="surface-card flex flex-col gap-2 rounded-xl border p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">{asset.name}</p>
                <p className="text-muted-foreground text-xs">
                  {ASSET_CLASSES.find((c) => c.value === asset.assetClass)?.label ?? asset.assetClass}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCashSecurity(asset._id);
                  setCashKind("interest");
                  setCashOpen(true);
                }}
              >
                Record distribution
              </Button>
            </div>
            <div className="text-muted-foreground text-xs">
              Latest valuation:{" "}
              {asset.latestPrice
                ? `${formatMoney(asset.latestPrice.priceCents)} (${asset.latestPrice.source}, ${formatShortDate(asset.latestPrice.recordedAt)})`
                : "no valuation entered yet"}
            </div>
          </div>
        ))}
        {fundAssets.length === 0 && (
          <div className="text-muted-foreground surface-card rounded-xl border p-8 text-center text-sm sm:col-span-2">
            No fund/SACCO/government assets yet — add one to start tracking deposits and terms.
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add investment asset</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Asset type</Label>
              <Select value={assetClass} onValueChange={setAssetClass}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSET_CLASSES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="asset-symbol">Symbol / short code</Label>
                <Input id="asset-symbol" value={symbol} onChange={(event) => setSymbol(event.target.value)} placeholder="MMF1" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="asset-qty">Units</Label>
                <Input id="asset-qty" value={qty} onChange={(event) => setQty(event.target.value)} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="asset-name">Name</Label>
              <Input id="asset-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="CIC MMF" />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="animate-spin" />} Add asset
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={cashOpen} onOpenChange={setCashOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Record cash movement</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCash} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Asset</Label>
              <Select value={cashSecurity} onValueChange={setCashSecurity}>
                <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
                <SelectContent>
                  {fundAssets.map((asset) => (
                    <SelectItem key={asset._id} value={asset._id}>{asset.symbol}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Type</Label>
              <Select value={cashKind} onValueChange={setCashKind}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="contribution">Deposit</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal</SelectItem>
                  <SelectItem value="interest">Distribution / interest</SelectItem>
                  <SelectItem value="fee">Fee</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cash-amount">Amount (KSh)</Label>
              <Input id="cash-amount" inputMode="decimal" value={cashAmount} onChange={(event) => setCashAmount(event.target.value)} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={cashSaving}>
                {cashSaving && <Loader2 className="animate-spin" />} Record
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
