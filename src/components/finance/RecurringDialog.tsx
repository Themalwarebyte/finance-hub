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
import {
  FREQUENCIES,
  categoriesFor,
  type Direction,
  type Frequency,
} from "@/lib/finance";
import { dateInputToMs, msToDateInput, parseAmountToCents } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { ArrowDownLeft, ArrowUpRight, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function RecurringDialog({
  open,
  onOpenChange,
  defaultDirection = "out",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDirection?: Direction;
}) {
  const accounts = useQuery(api.accounts.list, {});
  const createRecurring = useMutation(api.recurring.create);

  const [direction, setDirection] = useState<Direction>(defaultDirection);
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Housing");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [nextDate, setNextDate] = useState(msToDateInput(Date.now()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDirection(defaultDirection);
    setAmount("");
    setDescription("");
    setCategory(defaultDirection === "in" ? "Income" : "Housing");
    setFrequency("monthly");
    setNextDate(msToDateInput(Date.now()));
    setError(null);
  }, [open, defaultDirection]);

  useEffect(() => {
    if (!open) return;
    if (accounts && accounts.length > 0 && !accounts.some((a) => a._id === accountId)) {
      setAccountId(accounts[0]._id);
    }
  }, [accounts, accountId, open]);

  const switchDirection = (next: Direction) => {
    setDirection(next);
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
    if (description.trim().length === 0) {
      setError("Add a short description.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createRecurring({
        accountId: accountId as Id<"accounts">,
        direction,
        amount: cents,
        description,
        category,
        frequency,
        nextDate: dateInputToMs(nextDate),
      });
      toast.success("Added to your projection");
      onOpenChange(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Something went wrong.",
      );
    } finally {
      setSaving(false);
    }
  };

  const noAccounts = accounts !== undefined && accounts.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule repeating money</DialogTitle>
          <DialogDescription>
            Rent, paychecks, subscriptions — anything predictable used to project
            balances ahead.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="bg-muted grid grid-cols-2 gap-1 rounded-lg p-1">
            <button
              type="button"
              onClick={() => switchDirection("in")}
              className={cn(
                "flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-all",
                direction === "in"
                  ? "bg-card text-positive shadow-[var(--shadow-soft)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <ArrowDownLeft className="size-4" />
              Money in
            </button>
            <button
              type="button"
              onClick={() => switchDirection("out")}
              className={cn(
                "flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-all",
                direction === "out"
                  ? "bg-card text-negative shadow-[var(--shadow-soft)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <ArrowUpRight className="size-4" />
              Money out
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="recurring-amount">Amount</Label>
              <div className="relative">
                <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                  $
                </span>
                <Input
                  id="recurring-amount"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="decimal"
                  className="pl-7 tabular-nums"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Repeats</Label>
              <Select
                value={frequency}
                onValueChange={(value) => setFrequency(value as Frequency)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="recurring-description">Description</Label>
            <Input
              id="recurring-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={direction === "in" ? "Paycheck" : "Rent"}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Account</Label>
              <Select
                value={accountId}
                onValueChange={setAccountId}
                disabled={noAccounts}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose account" />
                </SelectTrigger>
                <SelectContent>
                  {(accounts ?? []).map((account) => (
                    <SelectItem key={account._id} value={account._id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoriesFor(direction).map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="recurring-date">Next date</Label>
            <Input
              id="recurring-date"
              type="date"
              value={nextDate}
              onChange={(event) => setNextDate(event.target.value)}
            />
          </div>

          {noAccounts && (
            <p className="text-muted-foreground text-sm">
              You need at least one account before scheduling money.
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
              Add to projection
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
