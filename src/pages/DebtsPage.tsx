import { DebtDialog } from "@/components/finance/DebtDialog";
import { DebtPayDialog } from "@/components/finance/DebtPayDialog";
import { EmptyCard, LoadingCard, PageHeader, MiniStat } from "@/components/finance/PageParts";
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
import { CreditCard, Pencil, Plus, Scale, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type DebtRow = {
  _id: string;
  name: string;
  lender?: string | null;
  type: string;
  originalAmount: number;
  outstandingBalance: number;
  interestRatePct?: number | null;
  monthlyPayment: number;
  nextDueDate?: number | null;
  principalPaid: number;
  interestPaid: number;
  paidPct: number;
  monthsLeft: number;
  interestRemaining: number;
  payoffDate: number | null;
};

type DebtsData = {
  debts: DebtRow[];
  totals: { totalOutstanding: number; totalMonthly: number; count: number };
};

export default function DebtsPage() {
  const data = useQuery(api.debts.list, {}) as DebtsData | undefined;
  const removeDebt = useMutation(api.debts.remove);

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<DebtRow | null>(null);
  const [paying, setPaying] = useState<DebtRow | null>(null);
  const [confirmId, setConfirmId] = useState<Id<"debts"> | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [extra, setExtra] = useState(0); // extra monthly payment, dollars

  const rows = data?.debts ?? [];
  const totals = data?.totals ?? { totalOutstanding: 0, totalMonthly: 0, count: 0 };

  const planner = useQuery(api.debts.strategies, {
    extraMonthly: Math.round(extra * 100),
  });

  const baseline = planner?.baseline;
  const snowball = planner?.snowball;
  const avalanche = planner?.avalanche;

  const interestSaved = useMemo(() => {
    if (!baseline || !snowball || !avalanche) return null;
    return {
      snowball: Math.max(0, baseline.totalInterest - snowball.totalInterest),
      avalanche: Math.max(0, baseline.totalInterest - avalanche.totalInterest),
    };
  }, [baseline, snowball, avalanche]);

  const handleDelete = async () => {
    if (!confirmId) return;
    setDeleting(true);
    try {
      await removeDebt({ debtId: confirmId });
      toast.success("Debt removed — payment history stays in your ledger");
    } catch {
      toast.error("Couldn't remove that debt.");
    } finally {
      setDeleting(false);
      setConfirmId(null);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Debt manager"
          subtitle="Every loan tracked with real amortisation — payments are ledger transactions."
          actions={
            <Button onClick={() => setAddOpen(true)} className="gap-2">
              <Plus className="size-4" />
              Add debt
            </Button>
          }
        />

        {rows.length > 0 && (
          <div className="surface-card flex flex-wrap gap-8 p-5">
            <MiniStat label="Total debt" value={formatMoney(totals.totalOutstanding, { cents: false })} tone="negative" />
            <MiniStat label="Monthly payments" value={formatMoney(totals.totalMonthly, { cents: false })} />
            <MiniStat label="Active debts" value={String(totals.count)} />
          </div>
        )}

        {data === undefined ? (
          <LoadingCard label="Loading debts…" />
        ) : rows.length === 0 ? (
          <EmptyCard
            icon={<CreditCard className="size-6" />}
            title="No debts tracked"
            body="Add a loan, mortgage or card with its balance, rate and payment. Tally projects your debt-free date and interest costs from real numbers."
            action={
              <Button onClick={() => setAddOpen(true)} className="gap-2">
                <Plus className="size-4" />
                Add your first debt
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((debt) => (
              <div key={debt._id} className="surface-card flex flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{debt.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {debt.lender ? `${debt.lender} · ` : ""}
                      {debt.interestRatePct ? `${debt.interestRatePct}% APR` : "No rate set"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit ${debt.name}`}
                      onClick={() => setEditing(debt)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${debt.name}`}
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setConfirmId(debt._id as Id<"debts">)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-xl font-semibold tabular-nums">
                    {formatMoney(debt.outstandingBalance, { cents: false })}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    of {formatMoney(debt.originalAmount, { cents: false })} original
                  </p>
                  <Progress className="mt-2 h-2" value={debt.paidPct} />
                  <p className="text-muted-foreground mt-1 text-xs">
                    {Math.round(debt.paidPct)}% paid ·{" "}
                    {debt.payoffDate
                      ? `debt-free ${new Date(debt.payoffDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
                      : "payment too small to cover interest"}
                  </p>
                </div>

                <div className="text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <span>Payment: <span className="text-foreground font-medium">{formatMoney(debt.monthlyPayment)}</span></span>
                  <span>Months left: <span className="text-foreground font-medium">{debt.monthsLeft || "—"}</span></span>
                  <span>Interest paid: <span className="text-foreground font-medium">{formatMoney(debt.interestPaid)}</span></span>
                  <span>Interest left: <span className="text-foreground font-medium">{formatMoney(debt.interestRemaining)}</span></span>
                </div>

                <Button variant="outline" size="sm" className="mt-auto w-full gap-2" onClick={() => setPaying(debt)}>
                  <Plus className="size-4" />
                  Record payment
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Strategy planner */}
        {rows.length > 1 && (
          <section className="surface-card flex flex-col gap-4 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
                <Scale className="text-muted-foreground size-4" />
                Repayment strategies
              </h2>
              <label className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Extra per month</span>
                <input
                  type="number"
                  min={0}
                  value={extra || ""}
                  onChange={(event) => setExtra(Math.max(0, Number(event.target.value) || 0))}
                  className="border-input bg-background h-8 w-28 rounded-md border px-2 text-sm tabular-nums"
                  placeholder="0"
                />
              </label>
            </div>

            {planner === undefined ? (
              <p className="text-muted-foreground text-sm">Simulating strategies…</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { name: "Snowball", tagline: "Smallest balance first", result: snowball, saved: interestSaved?.snowball },
                  { name: "Avalanche", tagline: "Highest interest rate first", result: avalanche, saved: interestSaved?.avalanche },
                ].map((strategy) => (
                  <div key={strategy.name} className="border-border/70 rounded-xl border p-4">
                    <p className="text-sm font-semibold">{strategy.name}</p>
                    <p className="text-muted-foreground text-xs">{strategy.tagline}</p>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-muted-foreground text-xs">Debt-free in</p>
                        <p className="text-sm font-semibold tabular-nums">
                          {strategy.result ? Math.max(1, Math.round(strategy.result.months / 30.44)) || "—" : "—"} mo
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Total interest</p>
                        <p className="text-sm font-semibold tabular-nums">
                          {strategy.result ? formatMoney(strategy.result.totalInterest, { cents: false }) : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Interest saved</p>
                        <p className="text-positive text-sm font-semibold tabular-nums">
                          {strategy.saved !== null && strategy.saved !== undefined
                            ? formatMoney(strategy.saved, { cents: false })
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Payoff order</p>
                        <p className="text-foreground truncate text-xs">
                          {strategy.result?.order.join(" → ") || "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-muted-foreground text-xs leading-5">
              Both plans pay the same total monthly amount — they differ only in the order
              debts are cleared. Choose whichever keeps you motivated; the numbers above show
              the trade-off.
            </p>
          </section>
        )}
      </div>

      <DebtDialog
        open={addOpen || editing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAddOpen(false);
            setEditing(null);
          }
        }}
        debt={editing}
      />

      <DebtPayDialog debt={paying} onOpenChange={(open) => !open && setPaying(null)} />

      <AlertDialog open={confirmId !== null} onOpenChange={(open) => !open && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this debt?</AlertDialogTitle>
            <AlertDialogDescription>
              Payment history stays in your transactions; the debt record is removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              Delete debt
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
