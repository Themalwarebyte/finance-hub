import { BudgetDialog } from "@/components/finance/BudgetDialog";
import { AppShell } from "@/components/finance/AppShell";
import { EmptyCard, LoadingCard, PageHeader } from "@/components/finance/PageParts";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { Copy, PiggyBank, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type BudgetRow = NonNullable<
  Awaited<ReturnType<typeof useQuery<typeof api.budgets.list>>>
>[number];

export default function BudgetsPage() {
  const budgets = useQuery(api.budgets.list, {});
  const removeBudget = useMutation(api.budgets.remove);
  const copyPrevious = useMutation(api.budgets.copyPrevious);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetRow | null>(null);
  const [deletingId, setDeletingId] = useState<Id<"budgets"> | null>(null);
  const [confirmId, setConfirmId] = useState<Id<"budgets"> | null>(null);
  const [copying, setCopying] = useState(false);

  const rows = budgets ?? [];

  const handleDelete = async () => {
    if (!confirmId) return;
    setDeletingId(confirmId);
    try {
      await removeBudget({ budgetId: confirmId });
      toast.success("Budget removed");
    } catch {
      toast.error("Couldn't remove that budget.");
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  const handleCopy = async () => {
    setCopying(true);
    try {
      const copied = await copyPrevious({});
      toast.success(copied > 0 ? `${copied} budget${copied === 1 ? "" : "s"} copied` : "Nothing to copy");
    } catch {
      toast.error("Couldn't copy budgets.");
    } finally {
      setCopying(false);
    }
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Budgets"
          subtitle="Spending plans per category, measured against real transactions."
          actions={
            <>
              <Button variant="outline" onClick={() => void handleCopy()} disabled={copying} className="gap-2">
                <Copy className="size-4" />
                Copy last month
              </Button>
              <Button
                onClick={() => {
                  setEditing(null);
                  setDialogOpen(true);
                }}
                className="gap-2"
              >
                <Plus className="size-4" />
                New budget
              </Button>
            </>
          }
        />

        {budgets === undefined ? (
          <LoadingCard label="Loading budgets…" />
        ) : rows.length === 0 ? (
          <EmptyCard
            icon={<PiggyBank className="size-6" />}
            title="No budgets yet"
            body="Create a monthly budget for a category like Groceries or Transport. Tally measures it against what you actually spend."
            action={
              <Button
                onClick={() => {
                  setEditing(null);
                  setDialogOpen(true);
                }}
                className="gap-2"
              >
                <Plus className="size-4" />
                Create your first budget
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((budget) => {
              const over = budget.remaining < 0;
              return (
                <div key={budget._id} className="surface-card flex flex-col gap-4 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{budget.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {budget.category}
                        {budget.subcategory ? ` · ${budget.subcategory}` : ""} ·{" "}
                        {budget.period === "custom" ? "Custom period" : budget.period === "annual" ? "Annual" : "Monthly"}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${budget.name}`}
                        onClick={() => {
                          setEditing(budget);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${budget.name}`}
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setConfirmId(budget._id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-baseline justify-between">
                      <p className="text-xl font-semibold tabular-nums">
                        {formatMoney(budget.spent, { cents: false })}
                        <span className="text-muted-foreground text-sm font-normal">
                          {" "}
                          / {formatMoney(budget.amount, { cents: false })}
                        </span>
                      </p>
                      <span
                        className={cn(
                          "text-xs font-medium tabular-nums",
                          over ? "text-negative" : budget.usedPct >= 80 ? "text-amber-600" : "text-positive",
                        )}
                      >
                        {Math.round(budget.usedPct)}%
                      </span>
                    </div>
                    <Progress
                      className="mt-2 h-2"
                      value={Math.min(100, budget.usedPct)}
                    />
                  </div>

                  <div className="text-muted-foreground flex items-center justify-between text-xs">
                    <span>
                      {over
                        ? `${formatMoney(Math.abs(budget.remaining))} over budget`
                        : `${formatMoney(budget.remaining)} left`}
                    </span>
                    <span>{budget.daysRemaining}d left · proj. {formatMoney(budget.projected, { cents: false })}</span>
                  </div>
                  {budget.overBudget && (
                    <span className="text-negative text-xs font-medium">Over budget this period</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BudgetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        budget={editing}
      />

      <AlertDialog open={confirmId !== null} onOpenChange={(open) => !open && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this budget?</AlertDialogTitle>
            <AlertDialogDescription>
              The budget is removed but your transactions stay untouched.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              disabled={deletingId !== null}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              Delete budget
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
