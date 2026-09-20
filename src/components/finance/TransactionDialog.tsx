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
import { categoriesFor, type Direction } from "@/lib/finance";
import { dateInputToMs, msToDateInput, parseAmountToCents } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type EntryMode = "in" | "out" | "transfer";

const MODES: { value: EntryMode; label: string; icon: typeof ArrowDownLeft }[] = [
  { value: "in", label: "Money in", icon: ArrowDownLeft },
  { value: "out", label: "Money out", icon: ArrowUpRight },
  { value: "transfer", label: "Transfer", icon: ArrowRightLeft },
];

export function TransactionDialog({
  open,
  onOpenChange,
  defaultDirection = "out",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDirection?: Direction;
}) {
  const accounts = useQuery(api.accounts.list, {});
  const createTransaction = useMutation(api.transactions.create);

  const [mode, setMode] = useState<EntryMode>(
    defaultDirection === "in" ? "in" : defaultDirection === "transfer" ? "transfer" : "out",
  );
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState<string>("");
  const [transferAccountId, setTransferAccountId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Groceries");
  const [merchant, setMerchant] = useState("");
  const [date, setDate] = useState(msToDateInput(Date.now()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeAccounts = accounts ?? [];

  useEffect(() => {
    if (!open) return;
    setMode(
      defaultDirection === "in" ? "in" : defaultDirection === "transfer" ? "transfer" : "out",
    );
    setAmount("");
    setDescription("");
    setMerchant("");
    setCategory(defaultDirection === "in" ? "Salary" : "Groceries");
    setDate(msToDateInput(Date.now()));
    setError(null);
  }, [open, defaultDirection]);

  useEffect(() => {
    if (!open || activeAccounts.length === 0) return;
    if (!activeAccounts.some((a) => a._id === accountId)) {
      setAccountId(activeAccounts[0]._id);
    }
    if (!activeAccounts.some((a) => a._id === transferAccountId)) {
      const second = activeAccounts.find((a) => a._id !== accountId) ?? activeAccounts[0];
      setTransferAccountId(second._id);
    }
  }, [accounts, accountId, transferAccountId, open]);

  const switchMode = (next: EntryMode) => {
    setMode(next);
    const options = categoriesFor(next);
    if (!options.includes(category)) setCategory(options[0]);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const cents = parseAmountToCents(amount);
    if (cents === null) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (!accountId) {
      setError("Add an account first.");
      return;
    }
    if (mode === "transfer" && transferAccountId === accountId) {
      setError("Pick two different accounts for a transfer.");
      return;
    }
    if (description.trim().length === 0) {
      setError("Add a short description.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createTransaction({
        accountId: accountId as Id<"accounts">,
        direction: mode,
        amount: cents,
        description,
        category,
        date: dateInputToMs(date),
        transferAccountId:
          mode === "transfer" ? (transferAccountId as Id<"accounts">) : undefined,
        merchant: merchant.trim() || undefined,
      });
      toast.success(
        mode === "in" ? "Money in recorded" : mode === "out" ? "Money out recorded" : "Transfer recorded",
      );
      onOpenChange(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Something went wrong.",
      );
    } finally {
      setSaving(false);
    }
  };

  const noAccounts = accounts !== undefined && activeAccounts.length < (mode === "transfer" ? 2 : 1);
  const categoryOptions = categoriesFor(mode);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record money</DialogTitle>
          <DialogDescription>
            Income, expenses and transfers all land in the same ledger — balances
            update instantly.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="bg-muted grid grid-cols-3 gap-1 rounded-lg p-1">
            {MODES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => switchMode(option.value)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition-all sm:text-sm",
                  mode === option.value
                    ? "bg-card shadow-[var(--shadow-soft)]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <option.icon
                  className={cn(
                    "size-4",
                    mode === option.value && option.value === "in" && "text-positive",
                    mode === option.value && option.value === "out" && "text-negative",
                  )}
                />
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="transaction-amount">Amount</Label>
            <div className="relative">
              <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                $
              </span>
              <Input
                id="transaction-amount"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="decimal"
                className="h-11 pl-7 text-lg font-semibold tabular-nums"
                placeholder="0.00"
                autoFocus
              />
            </div>
          </div>

          {mode === "transfer" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>From</Label>
                <Select value={accountId} onValueChange={setAccountId} disabled={noAccounts}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="From account" />
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
              <div className="flex flex-col gap-2">
                <Label>To</Label>
                <Select
                  value={transferAccountId}
                  onValueChange={setTransferAccountId}
                  disabled={noAccounts}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="To account" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeAccounts
                      .filter((account) => account._id !== accountId)
                      .map((account) => (
                        <SelectItem key={account._id} value={account._id}>
                          {account.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>Account</Label>
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
              <div className="flex flex-col gap-2">
                <Label>{mode === "in" ? "Income source" : "Category"}</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="transaction-description">Description</Label>
            <Input
              id="transaction-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={
                mode === "in" ? "Salary" : mode === "transfer" ? "Move to savings" : "Weekly groceries"
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="transaction-merchant">Merchant / payee</Label>
              <Input
                id="transaction-merchant"
                value={merchant}
                onChange={(event) => setMerchant(event.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="transaction-date">Date</Label>
              <Input
                id="transaction-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
          </div>

          {noAccounts && (
            <p className="text-muted-foreground text-sm">
              {mode === "transfer"
                ? "You need at least two accounts before transferring money."
                : "You need at least one account before recording money."}
            </p>
          )}
          {error && <p className="text-destructive text-sm">{error}</p>}

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || noAccounts}>
              {saving && <Loader2 className="animate-spin" />}
              {mode === "transfer" ? "Transfer" : "Record"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
