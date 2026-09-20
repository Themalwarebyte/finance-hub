import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { returnBasisLabel, type ReturnBasis } from "@/lib/finance";
import { formatMoney, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Info,
  LineChart,
  Pencil,
  Plus,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";

export type InvestmentRow = {
  _id: Id<"accounts">;
  name: string;
  kind: "investment";
  institution?: string | null;
  openingBalance: number;
  color: string;
  archived: boolean;
  balance: number;
  estimatedReturnPct?: number | null;
  returnBasis?: ReturnBasis | null;
};

/** Yearly estimate for one account, compounded from its own basis. */
function accountEstimates(row: InvestmentRow) {
  const pct = row.estimatedReturnPct ?? null;
  const basis: ReturnBasis = row.returnBasis === "monthly" ? "monthly" : "annual";
  if (pct === null || row.balance === 0) {
    return { pct, basis, annual: null as number | null, monthly: null as number | null };
  }
  const dollars = Math.abs(row.balance) / 100;
  const sign = row.balance < 0 ? -1 : 1;
  const growth =
    basis === "annual"
      ? dollars * (Math.pow(1 + pct / 100, 1) - 1)
      : dollars * (Math.pow(1 + pct / 100, 12) - 1);
  const annualCents = Math.round(growth * 100 * sign);
  return {
    pct,
    basis,
    annual: annualCents,
    monthly: Math.round(annualCents / 12),
  };
}

function sumEstimates(rows: InvestmentRow[], key: "annual" | "monthly"): number | null {
  const values = rows
    .map(accountEstimates)
    .map((estimate) => estimate[key])
    .filter((value): value is number => value !== null);
  if (rows.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0);
}

export function InvestmentsTab({
  onAdd,
  onEdit,
}: {
  onAdd: () => void;
  onEdit: (account: InvestmentRow) => void;
}) {
  const accounts = useQuery(api.accounts.list, {});
  const [view, setView] = useState<"monthly" | "annual">("monthly");

  const rows = (accounts ?? []).filter(
    (account) => account.kind === "investment",
  ) as InvestmentRow[];

  const invested = rows.reduce((sum, row) => sum + row.balance, 0);
  const monthlyEstimate = sumEstimates(rows, "monthly");
  const annualEstimate = sumEstimates(rows, "annual");
  const estimate = view === "monthly" ? monthlyEstimate : annualEstimate;
  const estimateLabel = view === "monthly" ? "Estimated next month" : "Estimated next year";

  if (accounts === undefined) {
    return (
      <div className="surface-card text-muted-foreground p-10 text-center text-sm">
        Loading investments…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        <div className="surface-card flex flex-col items-center px-6 py-14 text-center">
          <span className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-xl">
            <TrendingUp className="size-6" />
          </span>
          <h2 className="mt-5 text-lg font-semibold tracking-tight">
            No investments yet
          </h2>
          <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-6">
            Add an Investment account with an estimated return — monthly or annual
            — and its growth is folded into the balance projection.
          </p>
          <Button onClick={onAdd} className="mt-6 gap-2">
            <Plus className="size-4" />
            Add an investment
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="surface-card flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex flex-wrap gap-8">
          <div>
            <p className="text-muted-foreground text-xs">Invested balance</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {formatMoney(invested)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">{estimateLabel}</p>
            <p
              className={cn(
                "mt-1 text-lg font-semibold tabular-nums",
                (estimate ?? 0) >= 0 ? "text-positive" : "text-negative",
              )}
            >
              {(estimate ?? 0) >= 0 ? "+" : "\u2212"}
              {formatMoney(Math.abs(estimate ?? 0))}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-muted flex rounded-lg p-1">
            <button
              type="button"
              onClick={() => setView("monthly")}
              className={cn(
                "rounded-md px-3.5 py-1.5 text-sm font-medium transition-all",
                view === "monthly"
                  ? "bg-card text-foreground shadow-[var(--shadow-soft)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setView("annual")}
              className={cn(
                "rounded-md px-3.5 py-1.5 text-sm font-medium transition-all",
                view === "annual"
                  ? "bg-card text-foreground shadow-[var(--shadow-soft)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Annual
            </button>
          </div>
          <Button onClick={onAdd} className="gap-2">
            <Plus className="size-4" />
            Add investment
          </Button>
        </div>
      </div>

      <div className="surface-card p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <TrendingUp className="text-muted-foreground size-4" />
            Holdings &amp; return estimates
          </h2>
          <p className="text-muted-foreground hidden text-xs sm:block">
            Shown for each account&apos;s own rate basis
          </p>
        </div>

        <ul className="mt-2 flex flex-col">
          {rows.map((row, index) => {
            const estimateInfo = accountEstimates(row);
            const displayValue = view === "monthly" ? estimateInfo.monthly : estimateInfo.annual;
            const positive = (displayValue ?? 0) >= 0;
            return (
              <li key={row._id}>
                <div className="flex items-center gap-3 py-3.5">
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg",
                      positive
                        ? "bg-positive/10 text-positive"
                        : "bg-negative/10 text-negative",
                    )}
                  >
                    {positive ? (
                      <ArrowUpRight className="size-4" />
                    ) : (
                      <ArrowDownRight className="size-4" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{row.name}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {formatMoney(row.balance)}
                      {row.institution ? ` · ${row.institution}` : ""}
                    </p>
                  </div>

                  <div className="hidden shrink-0 text-right sm:block">
                    <p
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        positive ? "text-positive" : "text-negative",
                      )}
                    >
                      {displayValue === null
                        ? "—"
                        : `${positive ? "+" : "\u2212"}${formatMoney(Math.abs(displayValue))}`}
                    </p>
                    <p className="text-muted-foreground text-xs tabular-nums">
                      {view === "monthly" ? "this month" : "this year"}
                    </p>
                  </div>

                  {estimateInfo.pct !== null && (
                    <span className="border-border/70 bg-muted/60 text-muted-foreground hidden shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium tabular-nums md:inline-flex">
                      {formatPct(estimateInfo.pct)}/{returnBasisLabel(row.returnBasis ?? "annual")}
                    </span>
                  )}

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${row.name}`}
                    onClick={() => onEdit(row)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                </div>
                {index < rows.length - 1 && <Separator className="opacity-60" />}
              </li>
            );
          })}
        </ul>

        <Separator className="my-4" />
        <div className="text-muted-foreground flex items-start gap-2.5 text-xs leading-5">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <p>
            These estimates compound daily inside the balance projection — see the
            Overview tab. Estimates only: actual market returns vary.
          </p>
        </div>
      </div>

      <div className="surface-card flex items-center gap-3 p-5">
        <LineChart className="text-muted-foreground size-4 shrink-0" />
        <p className="text-muted-foreground text-sm">
          Estimated returns are included in the projection on the Overview tab
          automatically — nothing else to switch on.
        </p>
      </div>
    </div>
  );
}
