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
import { Switch } from "@/components/ui/switch";
import { api } from "@/convex/_generated/api";
import { CATEGORIES } from "@/lib/finance";
import { centsToInput, dateInputToMs, parseAmountToCents } from "@/lib/format";
import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type BudgetRow = {
  _id: string;
  name: string;
  category: string;
  subcategory?: string | null;
  period: "monthly" | "annual" | "custom";
  amount: number;
};

export function BudgetDialog({
  open,
  onOpenChange,
  budget,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget?: BudgetRow | null;
}) {
  const createBudget = useMutation(api.budgets.create);
  const updateBudget = useMutation(api.budgets.update);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Groceries");
  const [period, setPeriod] = useState<"monthly" | "annual" | "custom">("monthly");
  const [amount, setAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rollover, setRollover] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(budget?.name ?? "");
    setCategory(budget?.category ?? "Groceries");
    setPeriod(budget?.period ?? "monthly");
    setAmount(budget ? centsToInput(budget.amount) : "");
    setError(null);
  }, [open, budget]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const cents = parseAmountToCents(amount);
    if (cents === null) {
      setError("Enter a budget amount greater than zero.");
      return;
    }
    if (name.trim().length === 0) {
      setError("Name the budget.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (budget) {
        await updateBudget({ budgetId: budget._id as never, name, amount: cents });
        toast.success("Budget updated");
      } else {
        await createBudget({
          name,
          category,
          period,
          amount: cents,
          rollover,
          startDate: period === "custom" && startDate ? dateInputToMs(startDate) : undefined,
          endDate: period === "custom" && endDate ? dateInputToMs(endDate) : undefined,
        });
        toast.success("Budget created");
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
          <DialogTitle>{budget ? "Edit budget" : "New budget"}</DialogTitle>
          <DialogDescription>
            Budgets measure real spending in a category for the chosen period.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="budget-name">Name</Label>
            <Input
              id="budget-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Monthly groceries"
              autoFocus
            />
          </div>

          {!budget && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.filter((option) => option !== "Transfer").map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Period</Label>
                  <Select
                    value={period}
                    onValueChange={(value) => setPeriod(value as "monthly" | "annual" | "custom")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                      <SelectItem value="custom">Custom dates</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {period === "custom" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="budget-start">Start</Label>
                    <Input
                      id="budget-start"
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="budget-end">End</Label>
                    <Input
                      id="budget-end"
                      type="date"
                      value={endDate}
                      onChange={(event) => setEndDate(event.target.value)}
                    />
                  </div>
                </div>
              )}

              <label className="flex items-center justify-between gap-3 rounded-lg border px-3.5 py-3">
                <span>
                  <span className="text-sm font-medium">Rollover</span>
                  <span className="text-muted-foreground block text-xs">
                    Unused budget carries into the next period.
                  </span>
                </span>
                <Switch checked={rollover} onCheckedChange={setRollover} />
              </label>
            </>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="budget-amount">Amount per period</Label>
            <div className="relative">
              <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                $
              </span>
              <Input
                id="budget-amount"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="decimal"
                className="pl-7 tabular-nums"
                placeholder="0.00"
              />
            </div>
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <DialogFooter className="mt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              {budget ? "Save changes" : "Create budget"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
