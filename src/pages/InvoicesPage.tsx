import { BizPageHeader, useEnsureGHub } from "@/components/finance/BizParts";
import { Badge } from "@/components/ui/badge";
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
import { receivablesCents } from "@/lib/business";
import { formatMoney, formatDate } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type InvoiceRow = {
  _id: string;
  number: string;
  clientName: string;
  amountCents: number;
  paidCents: number;
  issueDate: number;
  dueDate: number;
  status: string;
  etimsRef?: string | null;
  etimsStatus?: string | null;
};

export default function InvoicesPage() {
  useEnsureGHub();
  const invoices = useQuery(api.businessSales.listInvoices, {});
  const recordPayment = useMutation(api.businessSales.recordInvoicePayment);
  const setEtims = useMutation(api.businessSales.setEtimsReference);

  const [payFor, setPayFor] = useState<InvoiceRow | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("M-PESA");
  const [saving, setSaving] = useState(false);

  if (invoices === undefined) {
    return <div className="text-muted-foreground text-sm">Loading invoices…</div>;
  }

  const receivables = receivablesCents(
    invoices.map((i) => ({
      amountCents: i.amountCents,
      paidCents: i.paidCents,
      status: i.status,
    })),
  );

  const handlePay = async () => {
    if (!payFor) return;
    const cents = Math.round(Number.parseFloat(payAmount || "0") * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      toast.error("Enter a payment amount above zero.");
      return;
    }
    setSaving(true);
    try {
      await recordPayment({
        invoiceId: payFor._id as Id<"invoices">,
        amountCents: cents,
        method: payMethod,
      });
      toast.success("Payment recorded");
      setPayFor(null);
      setPayAmount("");
    } catch {
      toast.error("Payment rejected — check the outstanding balance.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <BizPageHeader
        title="Invoices & Payments"
        subtitle={`Outstanding receivables: ${formatMoney(receivables)}`}
      />

      <p className="text-muted-foreground text-xs">
        Invoice records aren't submitted to KRA eTIMS automatically — references are stored
        manually for your own reconciliation. This is not eTIMS compliance.
      </p>

      <div className="surface-card overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border/70 text-muted-foreground border-b text-left text-xs uppercase tracking-wider">
              <th className="px-4 py-2.5">Invoice</th>
              <th className="px-4 py-2.5">Client</th>
              <th className="px-4 py-2.5">Amount</th>
              <th className="px-4 py-2.5">Paid</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">eTIMS</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => invoice as unknown as InvoiceRow).map((invoice) => (
              <tr key={invoice._id} className="border-border/60 border-b last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium">{invoice.number}</div>
                  <div className="text-muted-foreground text-xs">
                    due {formatDate(invoice.dueDate)}
                  </div>
                </td>
                <td className="px-4 py-3">{invoice.clientName}</td>
                <td className="px-4 py-3 tabular-nums">{formatMoney(invoice.amountCents)}</td>
                <td className="px-4 py-3 tabular-nums">{formatMoney(invoice.paidCents)}</td>
                <td className="px-4 py-3">
                  <Badge variant={invoice.status === "paid" ? "default" : "secondary"}>
                    {invoice.status.replace(/_/g, " ")}
                  </Badge>
                </td>
                <td className="text-muted-foreground px-4 py-3 text-xs">
                  {invoice.etimsRef ?? "—"}
                  {invoice.etimsStatus ? ` (${invoice.etimsStatus})` : ""}
                </td>
                <td className="px-4 py-3 text-right">
                  {invoice.status !== "paid" && invoice.status !== "draft" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setPayFor(invoice);
                        setPayAmount(((invoice.amountCents - invoice.paidCents) / 100).toFixed(2));
                      }}
                    >
                      Record payment
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={7} className="text-muted-foreground px-4 py-10 text-center text-sm">
                  No invoices yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={payFor !== null} onOpenChange={(open) => !open && setPayFor(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Record payment — {payFor?.number}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handlePay();
            }}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="pay-amount">Amount (KSh)</Label>
              <Input
                id="pay-amount"
                inputMode="decimal"
                value={payAmount}
                onChange={(event) => setPayAmount(event.target.value)}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pay-method">Method</Label>
              <Input
                id="pay-method"
                value={payMethod}
                onChange={(event) => setPayMethod(event.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="animate-spin" />} Record
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
