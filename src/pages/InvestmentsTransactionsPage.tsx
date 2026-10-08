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

const KINDS = [
  "purchase",
  "sale",
  "dividend",
  "interest",
  "fee",
  "contribution",
  "withdrawal",
  "split",
  "adjustment",
] as const;

type Kind = (typeof KINDS)[number];

export default function InvestmentsTransactionsPage() {
  const txns = useQuery(api.invest.listTxns, {});
  const securities = useQuery(api.invest.listSecurities, {});
  const recordTxn = useMutation(api.invest.recordTxn);

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("purchase");
  const [securityId, setSecurityId] = useState("");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [fee, setFee] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  if (txns === undefined || securities === undefined) {
    return <div className="text-muted-foreground text-sm">Loading transactions…</div>;
  }

  const needsQty = kind === "purchase" || kind === "sale" || kind === "split" || kind === "adjustment";
  const needsPrice = kind === "purchase" || kind === "sale";
  const needsAmount = ["dividend", "interest", "fee", "contribution", "withdrawal"].includes(kind);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!securityId) {
      toast.error("Choose a security.");
      return;
    }
    const priceCents = needsPrice ? Math.round(Number.parseFloat(price || "0") * 100) : undefined;
    if (needsPrice && (!priceCents || priceCents <= 0)) {
      toast.error("Enter a positive price.");
      return;
    }
    const amountCents = needsAmount ? Math.round(Number.parseFloat(amount || "0") * 100) : undefined;
    const feeCents = fee.trim() ? Math.round(Number.parseFloat(fee) * 100) : undefined;

    setSaving(true);
    try {
      await recordTxn({
        securityId: securityId as Id<"securities">,
        kind,
        qtyInput: needsQty && qty.trim() ? qty : undefined,
        priceCents: needsPrice ? priceCents : undefined,
        amountCents: needsAmount ? amountCents : undefined,
        feeCents,
        note: note.trim() || undefined,
      });
      toast.success("Transaction recorded");
      setOpen(false);
      setQty("");
      setPrice("");
      setAmount("");
      setFee("");
      setNote("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't record the transaction.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <BizPageHeader
        title="Investment Transactions"
        subtitle="Purchases, sales, dividends, fees, splits and adjustments — all in integer cents."
      >
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" /> Record transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Record investment transaction</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Type</Label>
                  <Select value={kind} onValueChange={(next) => setKind(next as Kind)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {KINDS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Security</Label>
                  <Select value={securityId} onValueChange={setSecurityId}>
                    <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
                    <SelectContent>
                      {securities.map((security) => (
                        <SelectItem key={security._id} value={security._id}>
                          {security.symbol}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {needsQty && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="txn-qty">Quantity (fractional allowed, e.g. 0.5)</Label>
                  <Input id="txn-qty" value={qty} onChange={(event) => setQty(event.target.value)} placeholder="1" />
                </div>
              )}
              {needsPrice && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="txn-price">Price (KSh)</Label>
                    <Input id="txn-price" inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="txn-fee">Fee (KSh)</Label>
                    <Input id="txn-fee" inputMode="decimal" value={fee} onChange={(event) => setFee(event.target.value)} />
                  </div>
                </div>
              )}
              {needsAmount && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="txn-amount">Amount (KSh)</Label>
                  <Input id="txn-amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Label htmlFor="txn-note">Note</Label>
                <Input id="txn-note" value={note} onChange={(event) => setNote(event.target.value)} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="animate-spin" />} Record
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </BizPageHeader>

      <div className="surface-card overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border/70 text-muted-foreground border-b text-left text-xs uppercase tracking-wider">
              <th className="px-4 py-2.5">Date</th>
              <th className="px-4 py-2.5">Type</th>
              <th className="px-4 py-2.5">Security</th>
              <th className="px-4 py-2.5">Qty</th>
              <th className="px-4 py-2.5 text-right">Cash effect</th>
              <th className="px-4 py-2.5 text-right">Realized gain</th>
            </tr>
          </thead>
          <tbody>
            {txns.map((txn) => (
              <tr key={txn._id} className="border-border/60 border-b last:border-0">
                <td className="text-muted-foreground px-4 py-3 text-xs">{formatShortDate(txn.date)}</td>
                <td className="px-4 py-3">{txn.kind}</td>
                <td className="px-4 py-3 font-medium">{txn.symbol}</td>
                <td className="px-4 py-3 tabular-nums">{txn.qtyMicro ? txn.qtyMicro / 1_000_000 : "—"}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">
                  {txn.amountCents >= 0 ? "+" : "−"}
                  {formatMoney(Math.abs(txn.amountCents))}
                </td>
                <td className="text-muted-foreground px-4 py-3 text-right tabular-nums">
                  {txn.realizedGainCents === undefined || txn.realizedGainCents === null
                    ? "—"
                    : formatMoney(txn.realizedGainCents)}
                </td>
              </tr>
            ))}
            {txns.length === 0 && (
              <tr>
                <td colSpan={6} className="text-muted-foreground px-4 py-10 text-center text-sm">
                  No transactions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
