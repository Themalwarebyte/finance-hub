import { BizPageHeader, BizStatCard } from "@/components/finance/BizParts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatMoney } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

const CYCLES = [
  {
    key: "A" as const,
    label: "Month A",
    fixed: "SMWF Global ETF 55% · Safaricom 25% · KenGen 20%",
  },
  {
    key: "B" as const,
    label: "Month B",
    fixed: "Safaricom 35% · Co-op Bank 20% · Equity 20% · TotalEnergies 25%",
  },
  {
    key: "C" as const,
    label: "Month C",
    fixed: "SMWF 50% · KenGen 25% · KCB 20% · TotalEnergies 5%",
  },
];

export default function AllocationsPage() {
  const allocations = useQuery(api.invest.listAllocations, {});
  const securities = useQuery(api.invest.listSecurities, {});
  const upsertAllocation = useMutation(api.invest.upsertAllocation);
  const removeAllocation = useMutation(api.invest.removeAllocation);
  const [budget, setBudget] = useState("1000");
  const [cycle, setCycle] = useState<"A" | "B" | "C">("A");
  const [newPct, setNewPct] = useState("");
  const [newSecurity, setNewSecurity] = useState("");

  const handleAdd = async () => {
    const pct = Number.parseFloat(newPct);
    if (!newSecurity || !Number.isFinite(pct) || pct <= 0 || pct > 100) {
      toast.error("Choose an investment and a percent between 0 and 100.");
      return;
    }
    try {
      await upsertAllocation({
        cycle,
        securityId: newSecurity as Id<"securities">,
        pct,
        active: true,
      });
      const total = allocations
        ?.filter((row) => row.cycle === cycle)
        .reduce((sum, row) => sum + row.pct, pct) ?? pct;
      if (Math.abs(total - 100) > 1e-9)
        toast.warning(`Cycle ${cycle} now totals ${total}% — adjust to exactly 100%.`);
      else toast.success(`Added to cycle ${cycle} (total 100%)`);
      setNewPct("");
      setNewSecurity("");
    } catch {
      toast.error("Couldn't add the allocation.");
    }
  };

  const handleSubstitute = async (
    allocationId: string,
    securityId: string,
    event: { target: { value: string } },
  ) => {
    try {
      // Substitution = remove old row, add same pct for the new security.
      await removeAllocation({ allocationId: allocationId as Id<"investAllocations"> });
      await upsertAllocation({
        cycle,
        securityId: event.target.value as Id<"securities">,
        pct: allocations?.find((row) => row._id === allocationId)?.pct ?? 0,
        active: true,
      });
      void securityId;
      toast.success("Investment substituted");
    } catch {
      toast.error("Substitution failed.");
    }
  };

  const budgetCents = Math.round(Number.parseFloat(budget || "0") * 100);
  const plan = useQuery(
    api.invest.planPreview,
    budgetCents > 0 ? { cycle, budgetCents, carriedCents: 0 } : "skip",
  );

  if (allocations === undefined) {
    return <div className="text-muted-foreground text-sm">Loading allocations…</div>;
  }

  const grouped = CYCLES.map((cycleMeta) => ({
    ...cycleMeta,
    rows: allocations.filter((row) => row.cycle === cycleMeta.key),
    totalPct: allocations
      .filter((row) => row.cycle === cycleMeta.key)
      .reduce((sum, row) => sum + row.pct, 0),
  }));

  return (
    <div className="flex flex-col gap-6">
      <BizPageHeader
        title="Monthly Allocation Strategy"
        subtitle="Percent-based plan over a repeating A → B → C cycle. Every month must total exactly 100%. Nothing is auto-traded — this is a planning surface only."
      />

      <div className="grid gap-3 lg:grid-cols-3">
        {grouped.map((cycleMeta) => (
          <div key={cycleMeta.key} className="surface-card rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{cycleMeta.label}</h3>
              <span
                className={`text-xs font-medium tabular-nums ${cycleMeta.totalPct === 100 ? "text-positive" : "text-amber-600"}`}
              >
                {cycleMeta.totalPct}%
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">{cycleMeta.fixed}</p>
            <ul className="mt-3 divide-y">
              {cycleMeta.rows.map((row) => (
                <li key={row._id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                  <span>{row.securityId}</span>
                  <div className="flex items-center gap-2">
                    <Select
                      value={row.securityId}
                      onValueChange={(next) =>
                        void handleSubstitute(row._id, row.securityId, { target: { value: next } })
                      }
                    >
                      <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(securities ?? []).map((security) => (
                          <SelectItem key={security._id} value={security._id}>
                            {security.symbol}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="tabular-nums">{row.pct}%</span>
                    <Switch
                      checked={row.active}
                      onCheckedChange={(active) => {
                        void removeAllocation({ allocationId: row._id as Id<"investAllocations"> })
                          .then(() =>
                            upsertAllocation({
                              cycle: row.cycle,
                              securityId: row.securityId as Id<"securities">,
                              pct: row.pct,
                              active,
                            }),
                          )
                          .then(() => toast.success(active ? "Purchases active" : "Purchases paused"))
                          .catch(() => toast.error("Couldn't pause purchases."));
                      }}
                      aria-label={`${row.active ? "Pause" : "Resume"} purchases for ${row.securityId}`}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground h-7 px-2"
                      onClick={() =>
                        void removeAllocation({ allocationId: row._id as Id<"investAllocations"> })
                          .then(() => toast.success("Allocation removed"))
                          .catch(() => toast.error("Couldn't remove."))
                      }
                    >
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
              {cycleMeta.rows.length === 0 && (
                <li className="text-muted-foreground py-2 text-xs">Not configured yet.</li>
              )}
            </ul>
          </div>
        ))}
      </div>

      <section className="surface-card rounded-xl border p-4">
        <h2 className="text-sm font-semibold">Plan a month (no trades executed)</h2>
        <p className="text-muted-foreground mt-1 text-xs">
          To edit: pick the cycle month, add an investment with its percent, substitute via the
          dropdown, pause purchases with the switch, or remove a row. The cycle must total exactly
          100% before the planner will run.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-muted-foreground text-xs" htmlFor="alloc-cycle-edit">Cycle month</label>
            <select
              id="alloc-cycle-edit"
              value={cycle}
              onChange={(event) => setCycle(event.target.value as "A" | "B" | "C")}
              className="border-border rounded-md border px-2 py-1.5 text-sm"
            >
              {CYCLES.map((cycleMeta) => (
                <option key={cycleMeta.key} value={cycleMeta.key}>{cycleMeta.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-muted-foreground text-xs">Investment</label>
            <Select value={newSecurity} onValueChange={setNewSecurity}>
              <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Choose" /></SelectTrigger>
              <SelectContent>
                {(securities ?? []).map((security) => (
                  <SelectItem key={security._id} value={security._id}>{security.symbol}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-muted-foreground text-xs" htmlFor="alloc-pct">Percent</label>
            <Input
              id="alloc-pct"
              inputMode="decimal"
              value={newPct}
              onChange={(event) => setNewPct(event.target.value)}
              className="w-20"
              placeholder="25"
            />
          </div>
          <Button onClick={() => void handleAdd()}>Add allocation</Button>
        </div>
      </section>

      <section className="surface-card rounded-xl border p-4">
        <h2 className="text-sm font-semibold">Planner preview</h2>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-muted-foreground text-xs" htmlFor="alloc-budget">
              Monthly budget (KSh)
            </label>
            <input
              id="alloc-budget"
              type="number"
              min="0"
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
              className="border-border w-32 rounded-md border px-2 py-1.5 text-sm tabular-nums"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-muted-foreground text-xs" htmlFor="alloc-cycle">
              Cycle month
            </label>
            <select
              id="alloc-cycle"
              value={cycle}
              onChange={(event) => setCycle(event.target.value as "A" | "B" | "C")}
              className="border-border rounded-md border px-2 py-1.5 text-sm"
            >
              {CYCLES.map((cycleMeta) => (
                <option key={cycleMeta.key} value={cycleMeta.key}>
                  {cycleMeta.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {plan && (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <BizStatCard label="Allocated & purchasable" value={formatMoney(plan.spentCents)} />
              <BizStatCard label="Remaining (carried forward)" value={formatMoney(plan.remainingCents)} />
              <BizStatCard
                label="Blocked (missing price)"
                value={formatMoney(plan.unallocatedCents)}
                hint="Add manual prices to unblock"
              />
            </div>
            <ul className="mt-4 divide-y">
              {plan.lines.map((line) => (
                <li key={line.securityId} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-medium">{line.name}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {formatMoney(line.allocatedCents)} →{" "}
                    {line.wholeShares > 0
                      ? `${line.wholeShares} share${line.wholeShares === 1 ? "" : "s"} (${formatMoney(line.spentCents)})`
                      : "insufficient for a whole share — carried forward"}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
