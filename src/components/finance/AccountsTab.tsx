import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { KIND_LABELS, colorMeta, returnBasisLabel, type AccountKind } from "@/lib/finance";
import { formatMoney, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export type AccountRow = {
  _id: Id<"accounts">;
  name: string;
  kind: AccountKind;
  institution?: string | null;
  openingBalance: number;
  color: string;
  archived: boolean;
  balance: number;
  estimatedReturnPct?: number | null;
  returnBasis?: "annual" | "monthly" | null;
};

export function AccountsTab({
  onAdd,
  onEdit,
}: {
  onAdd: () => void;
  onEdit: (account: AccountRow) => void;
}) {
  const accounts = useQuery(api.accounts.list, {});
  const removeAccount = useMutation(api.accounts.remove);
  const [deletingId, setDeletingId] = useState<Id<"accounts"> | null>(null);

  const rows = (accounts ?? []) as AccountRow[];

  const handleDelete = async (accountId: Id<"accounts">) => {
    setDeletingId(accountId);
    try {
      await removeAccount({ accountId });
      toast.success("Account removed");
    } catch {
      toast.error("Couldn't remove that account.");
    } finally {
      setDeletingId(null);
    }
  };

  if (accounts === undefined) {
    return (
      <div className="surface-card text-muted-foreground p-10 text-center text-sm">
        Loading accounts…
      </div>
    );
  }

  const held = rows
    .filter((row) => row.kind !== "credit")
    .reduce((sum, row) => sum + row.balance, 0);
  const owed = rows
    .filter((row) => row.kind === "credit")
    .reduce((sum, row) => sum + Math.abs(row.balance), 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="surface-card flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex flex-wrap gap-8">
          <div>
            <p className="text-muted-foreground text-xs">Accounts</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{rows.length}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Money you hold</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {formatMoney(held)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Money you owe</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {formatMoney(owed)}
            </p>
          </div>
        </div>
        <Button onClick={onAdd} className="gap-2">
          <Plus className="size-4" />
          Add account
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="surface-card flex flex-col items-center px-6 py-14 text-center">
          <span className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-xl">
            <Wallet className="size-6" />
          </span>
          <h2 className="mt-5 text-lg font-semibold tracking-tight">
            No accounts yet
          </h2>
          <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-6">
            Add checking, savings, cards and cash to build your full balance
            picture.
          </p>
          <Button onClick={onAdd} className="mt-6 gap-2">
            <Plus className="size-4" />
            Add your first account
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((account) => {
            const meta = colorMeta(account.color);
            return (
              <div key={account._id} className="surface-card flex flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className={cn("size-2.5 shrink-0 rounded-full", meta.dot)} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{account.name}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {KIND_LABELS[account.kind]}
                        {account.institution ? ` · ${account.institution}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit ${account.name}`}
                      onClick={() => onEdit(account)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Delete ${account.name}`}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Delete {account.name}?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This also removes every transaction and scheduled
                            item tied to this account. It can&apos;t be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep it</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => void handleDelete(account._id)}
                            disabled={deletingId === account._id}
                            className="bg-destructive hover:bg-destructive/90 text-white"
                          >
                            Delete account
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                <div>
                  <p
                    className={cn(
                      "text-2xl font-semibold tracking-tight tabular-nums",
                      account.balance < 0 && "text-negative",
                    )}
                  >
                    {formatMoney(account.balance)}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Started at {formatMoney(account.openingBalance)}
                  </p>
                </div>

                {account.kind === "investment" && account.estimatedReturnPct != null && (
                  <span className="border-border/70 bg-muted/60 text-muted-foreground w-fit rounded-full border px-2.5 py-1 text-xs font-medium tabular-nums">
                    {formatPct(account.estimatedReturnPct)}/
                    {returnBasisLabel(account.returnBasis ?? "annual")} est. return
                  </span>
                )}

                <Separator className="opacity-60" />
                <p className="text-muted-foreground text-xs">
                  Movements: {formatMoney(account.balance - account.openingBalance)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
