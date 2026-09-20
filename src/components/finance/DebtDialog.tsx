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
import type { DebtType } from "@/convex/schema";
import { centsToInput, dateInputToMs, msToDateInput, parseAmountToCents } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const DEBT_TYPES: { value: DebtType; label: string }[] = [
  { value: "personal_loan", label: "Personal loan" },
  { value: "bank_loan", label: "Bank loan" },
  { value: "sacco_loan", label: "SACCO loan" },
  { value: "mortgage", label: "Mortgage" },
  { value: "car_loan", label: "Car loan" },
  { value: "credit_card", label: "Credit card" },
  { value: "student_loan", label: "Student loan" },
  { value: "family_loan", label: "Family loan" },
  { value: "business_loan", label: "Business loan" },
  { value: "other", label: "Other debt" },
];

export function DebtDialog({
  open,
  onOpenChange,
  debt,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debt?: {
    _id: string;
    name: string;
    lender?: string | null;
    outstandingBalance: number;
    interestRatePct?: number | null;
    monthlyPayment: number;
    nextDueDate?: number | null;
  } | null;
}) {
  const accounts = useQuery(api.accounts.list, {});
  const createDebt = useMutation(api.debts.create);
  const updateDebt = useMutation(api.debts.update);

  const [name, setName] = useState("");
  const [type, setType] = useState<DebtType>("personal_loan");
  const [lender, setLender] = useState("");
  const [originalAmount, setOriginalAmount] = useState("");
  const [outstandingBalance, setOutstandingBalance] = useState("");
  const [rate, setRate] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [nextDueDate, setNextDueDate] = useState("");
  const [accountId, setAccountId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(debt?.name ?? "");
    setType("personal_loan");
    setLender(debt?.lender ?? "");
    setOriginalAmount(debt ? centsToInput((debt as { originalAmount?: number }).originalAmount ?? 0) : "");
    setOutstandingBalance(debt ? centsToInput(debt.outstandingBalance) : "");
    setRate(debt?.interestRatePct ? String(debt.interestRatePct) : "");
    setMonthlyPayment(debt ? centsToInput(debt.monthlyPayment) : "");
    setNextDueDate(debt?.nextDueDate ? msToDateInput(debt.nextDueDate) : "");
    setAccountId("");
    setError(null);
  }, [open, debt]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const original = parseAmountToCents(originalAmount);
    const balance = parseAmountToCents(outstandingBalance);
    const payment = parseAmountToCents(monthlyPayment);
    if (name.trim().length === 0) {
      setError("Name the debt.");
      return;
    }
    if (original === null) {
      setError("Enter the original amount.");
      return;
    }
    if (balance === null) {
      setError("Enter the outstanding balance.");
      return;
    }
    if (payment === null) {
      setError("Enter the monthly payment.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (debt) {
        await updateDebt({
          debtId: debt._id as Id<"debts">,
          name,
          lender,
          outstandingBalance: balance,
          interestRatePct: rate.trim() ? Number(rate) : undefined,
          monthlyPayment: payment,
          nextDueDate: nextDueDate ? dateInputToMs(nextDueDate) : undefined,
        });
        toast.success("Debt updated");
      } else {
        await createDebt({
          name,
          type,
          lender: lender.trim() || undefined,
          originalAmount: original,
          outstandingBalance: balance,
          interestRatePct: rate.trim() ? Number(rate) : undefined,
          monthlyPayment: payment,
          nextDueDate: nextDueDate ? dateInputToMs(nextDueDate) : undefined,
          linkedAccountId: accountId ? (accountId as Id<"accounts">) : undefined,
        });
        toast.success("Debt added");
      }
      onOpenChange(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{debt ? "Edit debt" : "Add debt"}</DialogTitle>
          <DialogDescription>
            Tally amortises the balance at the given rate to project payoff and interest.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="debt-name">Name</Label>
              <Input
                id="debt-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Car loan"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(value) => setType(value as DebtType)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEBT_TYPES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="debt-lender">Lender</Label>
              <Input
                id="debt-lender"
                value={lender}
                onChange={(event) => setLender(event.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="debt-rate">Interest rate % (annual)</Label>
              <Input
                id="debt-rate"
                value={rate}
                onChange={(event) => setRate(event.target.value)}
                inputMode="decimal"
                className="tabular-nums"
                placeholder="e.g. 13.5"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="debt-original">Original amount</Label>
              <div className="relative">
                <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                  $
                </span>
                <Input
                  id="debt-original"
                  value={originalAmount}
                  onChange={(event) => setOriginalAmount(event.target.value)}
                  inputMode="decimal"
                  className="pl-7 tabular-nums"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="debt-balance">Outstanding balance</Label>
              <div className="relative">
                <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                  $
                </span>
                <Input
                  id="debt-balance"
                  value={outstandingBalance}
                  onChange={(event) => setOutstandingBalance(event.target.value)}
                  inputMode="decimal"
                  className="pl-7 tabular-nums"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="debt-payment">Monthly payment</Label>
              <div className="relative">
                <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                  $
                </span>
                <Input
                  id="debt-payment"
                  value={monthlyPayment}
                  onChange={(event) => setMonthlyPayment(event.target.value)}
                  inputMode="decimal"
                  className="pl-7 tabular-nums"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="debt-due">Next due date</Label>
              <Input
                id="debt-due"
                type="date"
                value={nextDueDate}
                onChange={(event) => setNextDueDate(event.target.value)}
              />
            </div>
          </div>

          {!debt && (
            <div className="flex flex-col gap-2">
              <Label>Linked loan account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {(accounts ?? []).map((account) => (
                    <SelectItem key={account._id} value={account._id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {error && <p className="text-destructive text-sm">{error}</p>}

          <DialogFooter className="mt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              {debt ? "Save changes" : "Add debt"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
