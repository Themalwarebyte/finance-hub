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
  ACCOUNT_KINDS,
  COLORS,
  colorMeta,
  type AccountKind,
  type ReturnBasis,
  RETURN_BASES,
} from "@/lib/finance";
import { centsToInput } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type EditableAccount = {
  _id: Id<"accounts">;
  name: string;
  kind: AccountKind;
  institution?: string | null;
  openingBalance: number;
  color: string;
  estimatedReturnPct?: number | null;
  returnBasis?: ReturnBasis | null;
};

function signedCents(input: string): number {
  const cleaned = input.replace(/[^0-9.]/g, "");
  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value)) return 0;
  const negative = input.trim().startsWith("-");
  return Math.round((negative ? -Math.abs(value) : value) * 100);
}

export function AccountDialog({
  open,
  onOpenChange,
  account,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: EditableAccount | null;
}) {
  const createAccount = useMutation(api.accounts.create);
  const updateAccount = useMutation(api.accounts.update);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [kind, setKind] = useState<AccountKind>("checking");
  const [institution, setInstitution] = useState("");
  const [balance, setBalance] = useState("");
  const [color, setColor] = useState<string>("teal");
  const [returnPct, setReturnPct] = useState("");
  const [returnBasis, setReturnBasis] = useState<ReturnBasis>("annual");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(account?.name ?? "");
    setKind(account?.kind ?? "checking");
    setInstitution(account?.institution ?? "");
    setBalance(centsToInput(account?.openingBalance ?? 0));
    setColor(account?.color ?? "teal");
    setReturnPct(
      account?.estimatedReturnPct !== null &&
      account?.estimatedReturnPct !== undefined
        ? String(account.estimatedReturnPct)
        : "",
    );
    setReturnBasis(account?.returnBasis ?? "annual");
    setError(null);
  }, [open, account]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length === 0) {
      setError("Give this account a name.");
      return;
    }
    let estimatedReturnPct: number | undefined;
    if (returnPct.trim().length > 0) {
      const cleaned = returnPct.replace(/[^0-9.\-]/g, "");
      const value = Number.parseFloat(cleaned);
      if (!Number.isFinite(value) || Math.abs(value) > 100) {
        setError("Return estimate must be between -100% and 100%.");
        return;
      }
      estimatedReturnPct = value;
    }
    setSaving(true);
    setError(null);
    try {
      const openingBalance = signedCents(balance);
      if (account) {
        await updateAccount({
          accountId: account._id,
          name,
          kind,
          institution,
          openingBalance,
          color,
          estimatedReturnPct,
          returnBasis: estimatedReturnPct === undefined ? undefined : returnBasis,
        });
        toast.success("Account updated");
      } else {
        await createAccount({
          name,
          kind,
          institution,
          openingBalance,
          color,
          estimatedReturnPct,
          returnBasis: estimatedReturnPct === undefined ? undefined : returnBasis,
        });
        toast.success("Account added");
      }
      onOpenChange(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Something went wrong.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{account ? "Edit account" : "Add an account"}</DialogTitle>
          <DialogDescription>
            Every account you add shows up in your balances view and in
            projections.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="account-name">Name</Label>
            <Input
              id="account-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Everyday Checking"
              autoFocus
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Type</Label>
              <Select value={kind} onValueChange={(value) => setKind(value as AccountKind)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_KINDS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="account-institution">Institution</Label>
              <Input
                id="account-institution"
                value={institution}
                onChange={(event) => setInstitution(event.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="account-balance">Current balance</Label>
            <div className="relative">
              <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                $
              </span>
              <Input
                id="account-balance"
                value={balance}
                onChange={(event) => setBalance(event.target.value)}
                inputMode="decimal"
                className="pl-7 tabular-nums"
                placeholder="0.00"
              />
            </div>
            <p className="text-muted-foreground text-xs">
              Use a minus sign for money you owe, like a card balance.
            </p>
          </div>

          {kind === "investment" && (
            <div className="bg-muted/40 border-border/70 rounded-xl border p-3.5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="account-return">Estimated return %</Label>
                  <div className="relative">
                    <Input
                      id="account-return"
                      value={returnPct}
                      onChange={(event) => setReturnPct(event.target.value)}
                      inputMode="decimal"
                      className="pr-8 tabular-nums"
                      placeholder="e.g. 7"
                    />
                    <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                      %
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Rate is</Label>
                  <Select
                    value={returnBasis}
                    onValueChange={(value) => setReturnBasis(value as ReturnBasis)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RETURN_BASES.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-muted-foreground mt-2.5 text-xs leading-5">
                Compounds daily into the balance projection for this account.
                Negative rates are allowed.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label>Colour</Label>
            <div className="flex gap-2">
              {COLORS.map((option) => {
                const meta = colorMeta(option);
                return (
                  <button
                    key={option}
                    type="button"
                    aria-label={meta.label}
                    onClick={() => setColor(option)}
                    className={cn(
                      "size-7 rounded-full transition-transform",
                      meta.dot,
                      color === option
                        ? "ring-ring ring-2 ring-offset-2 ring-offset-[var(--card)]"
                        : "hover:scale-110",
                    )}
                  />
                );
              })}
            </div>
          </div>

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
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              {account ? "Save changes" : "Add account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
