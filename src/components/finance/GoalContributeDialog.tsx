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

type GoalRow = {
  _id: string;
  name: string;
  saved: number;
  targetAmount: number;
};

export function GoalContributeDialog({
  goal,
  onOpenChange,
}: {
  goal: GoalRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const accounts = useQuery(api.accounts.list, {});
  const contribute = useMutation(api.goals.contribute);

  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeAccounts = accounts ?? [];

  useEffect(() => {
    if (!goal) return;
    setAmount("");
    setError(null);
    if (activeAccounts.length > 0) {
      const preferred = activeAccounts.find((a) => a.kind === "savings") ?? activeAccounts[0];
      setAccountId(preferred._id);
    }
  }, [goal, activeAccounts]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!goal) return;
    const cents = parseAmountToCents(amount);
    if (cents === null) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (!accountId) {
      setError("Add an account first.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await contribute({
        goalId: goal._id as Id<"goals">,
        accountId: accountId as Id<"accounts">,
        amount: cents,
      });
      toast.success("Contribution recorded");
      onOpenChange(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const noAccounts = accounts !== undefined && activeAccounts.length === 0;

  return (
    <Dialog open={goal !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contribute to {goal?.name ?? "goal"}</DialogTitle>
          <DialogDescription>
            This records a real money-out transaction tagged to the goal.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="contribution-amount">Amount</Label>
            <div className="relative">
              <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                $
              </span>
              <Input
                id="contribution-amount"
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
              You need at least one account to record a contribution.
            </p>
          )}
          {error && <p className="text-destructive text-sm">{error}</p>}

          <DialogFooter className="mt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || noAccounts}>
              {saving && <Loader2 className="animate-spin" />}
              Record contribution
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
