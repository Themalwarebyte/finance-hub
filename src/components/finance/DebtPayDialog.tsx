import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { parseAmountToCents } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type DebtRow = {
  _id: string;
  name: string;
  outstandingBalance: number;
  monthlyPayment: number;
  interestRatePct?: number | null;
};

export function DebtPayDialog({
  debt,
  onOpenChange,
}: {
  debt: DebtRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const accounts = useQuery(api.accounts.list, {});
  const payDebt = useMutation(api.debts.pay);

  const [amount, setAmount] = useState("");
  const [interestPortion, setInterestPortion] = useState("");
  const [accountId, setAccountId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeAccounts = accounts ?? [];

  useEffect(() => {
    if (!debt) return;
    setAmount(debt.monthlyPayment ? (debt.monthlyPayment / 100).toFixed(2) : "");
    setInterestPortion("");
    setError(null);
    if (activeAccounts.length > 0) {
      setAccountId(activeAccounts.find((a) => a.kind !== "credit")?._id ?? activeAccounts[0]._id);
    }
  }, [debt, activeAccounts]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!debt) return;
    const cents = parseAmountToCents(amount);
    if (cents === null) {
      setError("Enter an amount greater than zero.");
      return;
    }
    const interest = interestPortion.trim() ? parseAmountToCents(interestPortion) : 0;
    if (interest === null) {
      setError("Enter a valid interest portion.");
      return;
    }
    if (!accountId) {
      setError("Add an account first.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await payDebt({
        debtId: debt._id as Id<"debts">,
        accountId: accountId as Id<"accounts">,
        amount: cents,
        interestPortion: interest ?? 0,
      });
      toast.success("Payment recorded");
      onOpenChange(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const noAccounts = accounts !== undefined && activeAccounts.length === 0;

  return (
    <Dialog open={debt !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pay {debt?.name ?? "debt"}</DialogTitle>
          <DialogDescription>
            Records a Debt Payments transaction and reduces the tracked balance.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="debt-pay-amount">Amount</Label>
              <div className="relative">
                <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                  $
                </span>
                <Input
                  id="debt-pay-amount"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="decimal"
                  className="pl-7 text-lg font-semibold tabular-nums"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="debt-pay-interest">Interest portion</Label>
              <div className="relative">
                <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                  $
                </span>
                <Input
                  id="debt-pay-interest"
                  value={interestPortion}
                  onChange={(event) => setInterestPortion(event.target.value)}
                  inputMode="decimal"
                  className="pl-7 tabular-nums"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>From account</Label>
            <Select value={accountId} onValueChange={setAccountId} disabled={noAccounts}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose account" />
              </SelectTrigger>
              <SelectContent>
                {activeAccounts.map((account) => (
                  <SelectItem key={account._id} value={account._id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {noAccounts && (
            <p className="text-muted-foreground text-sm">
              You need at least one account to record a payment.
            </p>
          )}
          {error && <p className="text-destructive text-sm">{error}</p>}

          <DialogFooter className="mt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || noAccounts}>
              {saving && <Loader2 className="animate-spin" />}
              Record payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
