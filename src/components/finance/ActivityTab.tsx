import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatMoney, formatRelativeDate, formatSignedMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Plus,
  Receipt,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type Filter = "all" | "in" | "out";

export function ActivityTab({
  onAdd,
}: {
  onAdd: (direction: "in" | "out") => void;
}) {
  const transactions = useQuery(api.transactions.list, { limit: 150 });
  const removeTransaction = useMutation(api.transactions.remove);
  const [filter, setFilter] = useState<Filter>("all");
  const [pendingId, setPendingId] = useState<Id<"transactions"> | null>(null);

  const rows = useMemo(() => {
    const all = transactions ?? [];
    return filter === "all" ? all : all.filter((row) => row.direction === filter);
  }, [transactions, filter]);

  const monthTotals = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    let moneyIn = 0;
    let moneyOut = 0;
    for (const row of transactions ?? []) {
      if (row.date < start) continue;
      if (row.direction === "in") moneyIn += row.amount;
      else moneyOut += row.amount;
    }
    return { moneyIn, moneyOut };
  }, [transactions]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof rows>();
    for (const row of rows) {
      const key = formatRelativeDate(row.date);
      const bucket = map.get(key) ?? [];
      bucket.push(row);
      map.set(key, bucket);
    }
    return Array.from(map.entries());
  }, [rows]);

  const handleDelete = async (id: Id<"transactions">) => {
    setPendingId(id);
    try {
      await removeTransaction({ transactionId: id });
      toast.success("Entry removed");
    } catch {
      toast.error("Couldn't remove that entry.");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="surface-card flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex flex-wrap gap-8">
          <div>
            <p className="text-muted-foreground text-xs">Money in this month</p>
            <p className="text-positive mt-1 text-lg font-semibold tabular-nums">
              +{formatMoney(monthTotals.moneyIn)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Money out this month</p>
            <p className="text-negative mt-1 text-lg font-semibold tabular-nums">
              {"\u2212"}
              {formatMoney(monthTotals.moneyOut)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Net this month</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {monthTotals.moneyIn - monthTotals.moneyOut >= 0 ? "+" : "\u2212"}
              {formatMoney(Math.abs(monthTotals.moneyIn - monthTotals.moneyOut))}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onAdd("in")} className="gap-2">
            <ArrowDownLeft className="size-4" />
            Money in
          </Button>
          <Button onClick={() => onAdd("out")} className="gap-2">
            <Plus className="size-4" />
            Money out
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {(
          [
            { value: "all", label: "All" },
            { value: "in", label: "Money in" },
            { value: "out", label: "Money out" },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
              filter === option.value
                ? "bg-foreground text-background border-transparent"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {transactions === undefined ? (
        <div className="surface-card text-muted-foreground p-10 text-center text-sm">
          Loading activity…
        </div>
      ) : rows.length === 0 ? (
        <div className="surface-card flex flex-col items-center px-6 py-14 text-center">
          <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-xl">
            <Receipt className="size-6" />
          </span>
          <h2 className="mt-5 text-lg font-semibold tracking-tight">
            No entries here yet
          </h2>
          <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-6">
            Record money in and money out and it will show up here, grouped by
            day.
          </p>
          <Button onClick={() => onAdd("out")} className="mt-6 gap-2">
            <Plus className="size-4" />
            Record money
          </Button>
        </div>
      ) : (
        <div className="surface-card flex flex-col p-6">
          {groups.map(([label, items], groupIndex) => (
            <div key={label} className={cn(groupIndex > 0 && "mt-6")}>
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-xs font-semibold tracking-[0.1em] uppercase">
                  {label}
                </p>
                <p className="text-muted-foreground text-xs tabular-nums">
                  {items.length} entr{items.length === 1 ? "y" : "ies"}
                </p>
              </div>
              <ul className="mt-2 flex flex-col">
                {items.map((item, index) => (
                  <li key={item._id}>
                    <div className="group flex items-center gap-3 py-3">
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-lg",
                          item.direction === "in"
                            ? "bg-positive/10 text-positive"
                            : "bg-negative/10 text-negative",
                        )}
                      >
                        {item.direction === "in" ? (
                          <ArrowDownLeft className="size-4" />
                        ) : (
                          <ArrowUpRight className="size-4" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {item.description}
                        </p>
                        <p className="text-muted-foreground flex items-center gap-1.5 truncate text-xs">
                          <Clock className="size-3" />
                          {item.category} · {item.accountName}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 text-sm font-semibold tabular-nums",
                          item.direction === "in"
                            ? "text-positive"
                            : "text-foreground",
                        )}
                      >
                        {formatSignedMoney(item.amount, item.direction)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${item.description}`}
                        onClick={() => void handleDelete(item._id)}
                        disabled={pendingId === item._id}
                        className="text-muted-foreground hover:text-destructive opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                    {index < items.length - 1 && (
                      <Separator className="opacity-60" />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
