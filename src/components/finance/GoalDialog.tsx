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
import { centsToInput, dateInputToMs, msToDateInput, parseAmountToCents } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type GoalRow = {
  _id: string;
  name: string;
  description?: string | null;
  targetAmount: number;
  targetDate?: number | null;
  linkedAccountId?: string | null;
  contributionAmount?: number | null;
};

export function GoalDialog({
  open,
  onOpenChange,
  goal,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: GoalRow | null;
}) {
  const accounts = useQuery(api.accounts.list, {});
  const createGoal = useMutation(api.goals.create);
  const updateGoal = useMutation(api.goals.update);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [accountId, setAccountId] = useState("");
  const [contributionAmount, setContributionAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(goal?.name ?? "");
    setDescription(goal?.description ?? "");
    setTargetAmount(goal ? centsToInput(goal.targetAmount) : "");
    setTargetDate(goal?.targetDate ? msToDateInput(goal.targetDate) : "");
    setAccountId(goal?.linkedAccountId ?? "");
    setContributionAmount(
      goal?.contributionAmount ? centsToInput(goal.contributionAmount) : "",
    );
    setError(null);
  }, [open, goal]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const target = parseAmountToCents(targetAmount);
    if (target === null) {
      setError("Enter a target amount greater than zero.");
      return;
    }
    if (name.trim().length === 0) {
      setError("Name the goal.");
      return;
    }
    const contribution = contributionAmount.trim() ? parseAmountToCents(contributionAmount) : null;
    if (contribution === null && contributionAmount.trim().length > 0) {
      setError("Enter a valid planned contribution.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (goal) {
        await updateGoal({
          goalId: goal._id as Id<"goals">,
          name,
          description,
          targetAmount: target,
          targetDate: targetDate ? dateInputToMs(targetDate) : undefined,
          linkedAccountId: accountId ? (accountId as Id<"accounts">) : undefined,
          contributionAmount: contribution ?? undefined,
        });
        toast.success("Goal updated");
      } else {
        await createGoal({
          name,
          description: description.trim() || undefined,
          targetAmount: target,
          targetDate: targetDate ? dateInputToMs(targetDate) : undefined,
          linkedAccountId: accountId ? (accountId as Id<"accounts">) : undefined,
          contributionAmount: contribution ?? undefined,
        });
        toast.success("Goal created");
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
          <DialogTitle>{goal ? "Edit goal" : "New savings goal"}</DialogTitle>
          <DialogDescription>
            Record contributions from any account and progress builds automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="goal-name">Goal name</Label>
            <Input
              id="goal-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Emergency fund"
              autoFocus
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="goal-target">Target amount</Label>
              <div className="relative">
                <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                  $
                </span>
                <Input
                  id="goal-target"
                  value={targetAmount}
                  onChange={(event) => setTargetAmount(event.target.value)}
                  inputMode="decimal"
                  className="pl-7 tabular-nums"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="goal-date">Target date</Label>
              <Input
                id="goal-date"
                type="date"
                value={targetDate}
                onChange={(event) => setTargetDate(event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Savings account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Not linked</SelectItem>
                  {(accounts ?? []).map((account) => (
                    <SelectItem key={account._id} value={account._id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="goal-contribution">Planned / month</Label>
              <div className="relative">
                <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                  $
                </span>
                <Input
                  id="goal-contribution"
                  value={contributionAmount}
                  onChange={(event) => setContributionAmount(event.target.value)}
                  inputMode="decimal"
                  className="pl-7 tabular-nums"
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="goal-description">Notes</Label>
            <Input
              id="goal-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is this goal for?"
            />
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <DialogFooter className="mt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              {goal ? "Save changes" : "Create goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
