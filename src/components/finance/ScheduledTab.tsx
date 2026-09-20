import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { frequencyLabel } from "@/lib/finance";
import { formatMoney, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function ScheduledTab({ onAdd }: { onAdd: () => void }) {
  const items = useQuery(api.recurring.list, {});
  const setActive = useMutation(api.recurring.setActive);
  const removeRecurring = useMutation(api.recurring.remove);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const rows = items ?? [];
  const activeRows = rows.filter((row) => row.active);

  const monthlyIn = activeRows
    .filter((row) => row.direction === "in")
    .reduce((sum, row) => sum + row.amount, 0);
  const monthlyOut = activeRows
    .filter((row) => row.direction === "out")
    .reduce((sum, row) => sum + row.amount, 0);

  const handleToggle = async (id: Id<"recurring">, active: boolean) => {
    try {
      await setActive({ recurringId: id, active });
      toast.success(active ? "Back in the projection" : "Paused");
    } catch {
      toast.error("Couldn't update that item.");
    }
  };

  const handleDelete = async (id: Id<"recurring">) => {
    setPendingId(id);
    try {
      await removeRecurring({ recurringId: id });
      toast.success("Scheduled item removed");
    } catch {
      toast.error("Couldn't remove that item.");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="surface-card flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex flex-wrap gap-8">
          <div>
            <p className="text-muted-foreground text-xs">Active items</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {activeRows.length}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Recurring money in</p>
            <p className="text-positive mt-1 text-lg font-semibold tabular-nums">
              +{formatMoney(monthlyIn)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Recurring money out</p>
            <p className="text-negative mt-1 text-lg font-semibold tabular-nums">
              {"\u2212"}
              {formatMoney(monthlyOut)}
            </p>
          </div>
        </div>
        <Button onClick={onAdd} className="gap-2">
          <Plus className="size-4" />
          Schedule money
        </Button>
      </div>

      <p className="text-muted-foreground text-xs leading-5">
        Totals above show each item&apos;s amount once — the projection handles how
        often it actually repeats.
      </p>

      {items === undefined ? (
        <div className="surface-card text-muted-foreground p-10 text-center text-sm">
          Loading scheduled money…
        </div>
      ) : rows.length === 0 ? (
        <div className="surface-card flex flex-col items-center px-6 py-14 text-center">
          <span className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-xl">
            <CalendarClock className="size-6" />
          </span>
          <h2 className="mt-5 text-lg font-semibold tracking-tight">
            Project your next month
          </h2>
          <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-6">
            Add rent, paychecks and subscriptions — Tally places them on the
            right days and draws your balance forward.
          </p>
          <Button onClick={onAdd} className="mt-6 gap-2">
            <Plus className="size-4" />
            Schedule your first item
          </Button>
        </div>
      ) : (
        <div className="surface-card flex flex-col p-6">
          <ul className="flex flex-col">
            {rows.map((item, index) => (
              <li key={item._id}>
                <div className="flex items-center gap-3 py-3.5">
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg",
                      item.direction === "in"
                        ? "bg-positive/10 text-positive"
                        : "bg-negative/10 text-negative",
                      !item.active && "opacity-40",
                    )}
                  >
                    {item.direction === "in" ? (
                      <ArrowDownLeft className="size-4" />
                    ) : (
                      <ArrowUpRight className="size-4" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate text-sm font-medium",
                        !item.active && "text-muted-foreground",
                      )}
                    >
                      {item.description}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {frequencyLabel(item.frequency)} · next{" "}
                      {formatShortDate(item.nextDate)} · {item.accountName}
                    </p>
                  </div>

                  <span
                    className={cn(
                      "hidden shrink-0 text-sm font-semibold tabular-nums sm:block",
                      !item.active
                        ? "text-muted-foreground"
                        : item.direction === "in"
                          ? "text-positive"
                          : "text-foreground",
                    )}
                  >
                    {item.direction === "in" ? "+" : "\u2212"}
                    {formatMoney(item.amount)}
                  </span>

                  <Switch
                    checked={item.active}
                    onCheckedChange={(checked) => void handleToggle(item._id, checked)}
                    aria-label={`${item.active ? "Pause" : "Resume"} ${item.description}`}
                  />

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${item.description}`}
                    onClick={() => void handleDelete(item._id)}
                    disabled={pendingId === item._id}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                {index < rows.length - 1 && <Separator className="opacity-60" />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
