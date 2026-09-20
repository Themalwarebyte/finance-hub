import { GoalDialog } from "@/components/finance/GoalDialog";
import { GoalContributeDialog } from "@/components/finance/GoalContributeDialog";
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
import { useMutation, useQuery } from "convex/react";
import { Pencil, Plus, Target, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type GoalRow = NonNullable<
  Awaited<ReturnType<typeof useQuery<typeof api.goals.list>>>
>[number];

export default function GoalsPage() {
  const goals = useQuery(api.goals.list, {});
  const removeGoal = useMutation(api.goals.remove);

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<GoalRow | null>(null);
  const [contributing, setContributing] = useState<GoalRow | null>(null);
  const [confirmId, setConfirmId] = useState<Id<"goals"> | null>(null);
  const [deleting, setDeleting] = useState(false);

  const rows = goals ?? [];
  const totalSaved = rows.reduce((sum, goal) => sum + goal.saved, 0);
  const totalTarget = rows.reduce((sum, goal) => sum + goal.targetAmount, 0);

  const handleDelete = async () => {
    if (!confirmId) return;
    setDeleting(true);
    try {
      await removeGoal({ goalId: confirmId });
      toast.success("Goal removed — contributions stay in your ledger");
    } catch {
      toast.error("Couldn't remove that goal.");
    } finally {
      setDeleting(false);
      setConfirmId(null);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Savings goals"
          subtitle="Progress comes from real contributions recorded in your ledger."
          actions={
            <Button onClick={() => setAddOpen(true)} className="gap-2">
              <Plus className="size-4" />
              New goal
            </Button>
          }
        />

        {rows.length > 0 && (
          <div className="surface-card flex flex-wrap gap-8 p-5">
            <div>
              <p className="text-muted-foreground text-xs">Total saved</p>
              <p className="text-positive mt-1 text-lg font-semibold tabular-nums">
                {formatMoney(totalSaved, { cents: false })}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Total targeted</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {formatMoney(totalTarget, { cents: false })}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Active goals</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{rows.length}</p>
            </div>
          </div>
        )}

        {goals === undefined ? (
          <LoadingCard label="Loading goals…" />
        ) : rows.length === 0 ? (
          <EmptyCard
            icon={<Target className="size-6" />}
            title="No savings goals yet"
            body="Set a target — emergency fund, school fees, a car — and record contributions from any account. Progress builds from the ledger."
            action={
              <Button onClick={() => setAddOpen(true)} className="gap-2">
                <Plus className="size-4" />
                Create your first goal
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((goal) => (
              <div key={goal._id} className="surface-card flex flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{goal.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {goal.accountName ? `Saves into ${goal.accountName}` : "Unlinked"}
                      {goal.targetDate
                        ? ` · by ${new Date(goal.targetDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit ${goal.name}`}
                      onClick={() => setEditing(goal)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${goal.name}`}
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setConfirmId(goal._id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>

                <div>
                  <div className="flex items-baseline justify-between">
                    <p className="text-xl font-semibold tabular-nums">
                      {formatMoney(goal.saved, { cents: false })}
                      <span className="text-muted-foreground text-sm font-normal">
                        {" "}
                        / {formatMoney(goal.targetAmount, { cents: false })}
                      </span>
                    </p>
                    <span
                      className={
                        goal.status === "completed"
                          ? "text-positive text-xs font-medium"
                          : goal.status === "behind"
                            ? "text-amber-600 text-xs font-medium"
                            : "text-muted-foreground text-xs font-medium"
                      }
                    >
                      {goal.status === "completed"
                        ? "Goal reached"
                        : goal.status === "behind"
                          ? "Behind pace"
                          : `${Math.round(goal.progressPct)}%`}
                    </span>
                  </div>
                  <Progress className="mt-2 h-2" value={goal.progressPct} />
                </div>

                <div className="text-muted-foreground text-xs leading-5">
                  {goal.remaining > 0 ? (
                    <>
                      {formatMoney(goal.remaining, { cents: false })} to go
                      {goal.monthlyRequired > 0 && (
                        <> · {formatMoney(goal.monthlyRequired, { cents: false })}/mo needed</>
                      )}
                    </>
                  ) : (
                    "Target reached — nicely done."
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="mt-auto w-full gap-2"
                  onClick={() => setContributing(goal)}
                  disabled={goal.status === "completed"}
                >
                  <Plus className="size-4" />
                  Record contribution
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <GoalDialog
        open={addOpen || editing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAddOpen(false);
            setEditing(null);
          }
        }}
        goal={editing}
      />

      <GoalContributeDialog
        goal={contributing}
        onOpenChange={(open) => !open && setContributing(null)}
      />

      <AlertDialog open={confirmId !== null} onOpenChange={(open) => !open && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this goal?</AlertDialogTitle>
            <AlertDialogDescription>
              Contributions already recorded stay in your transaction history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              Delete goal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
