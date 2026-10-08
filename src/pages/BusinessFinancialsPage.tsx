import { BizPageHeader, BizStatCard, useEnsureGHub } from "@/components/finance/BizParts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import {
  consolidatedExpensesCents,
  consolidatedIncomeCents,
  operatingExpensesCents,
  OWNER_MOVEMENT_CATEGORIES,
} from "@/lib/business";
import { formatMoney, formatShortDate, parseAmountToCents } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const OUT_CATEGORIES = [
  "Operating Expense",
  "Salaries",
  "Rent",
  "Software",
  "Transport",
  "Money Market Fund",
  "Owner Drawings",
] as const;

const IN_CATEGORIES = [
  "Client Payment",
  "Other Income",
  "Owner Capital",
] as const;

export default function BusinessFinancialsPage() {
  useEnsureGHub();
  const ledger = useQuery(api.business.listLedger, {});
  const overview = useQuery(api.business.overview, {});
  const addEntry = useMutation(api.business.addLedgerEntry);
  const removeEntry = useMutation(api.business.removeLedgerEntry);

  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<"in" | "out">("out");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("Operating Expense");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  if (ledger === undefined) {
    return <div className="text-muted-foreground text-sm">Loading ledger…</div>;
  }

  const rows = [...ledger].sort((a, b) => b.date - a.date);
  const opex = operatingExpensesCents(
    rows.map((row) => ({ direction: row.direction, amount: row.amount, category: row.category })),
  );
  const externalIncome = consolidatedIncomeCents(rows);
  const ownerOut = rows
    .filter((row) => row.direction === "out" && (OWNER_MOVEMENT_CATEGORIES as readonly string[]).includes(row.category))
    .reduce((sum, row) => sum + row.amount, 0);
  const ordinaryConsumption = consolidatedExpensesCents(rows);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const cents = parseAmountToCents(amount);
    if (cents === null) {
      toast.error("Enter a valid amount.");
      return;
    }
    setSaving(true);
    try {
      await addEntry({
        direction,
        amount: cents,
        category,
        description: description.trim() || category,
        date: Date.now(),
      });
      toast.success("Ledger entry recorded");
      setOpen(false);
      setAmount("");
      setDescription("");
    } catch {
      toast.error("Could not record the entry.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <BizPageHeader
        title="Business Financials"
        subtitle="Separate business ledger — never mixes with household transactions."
      >
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" /> Record entry
        </Button>
      </BizPageHeader>

      {overview && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <BizStatCard label="Revenue YTD" value={formatMoney(overview.revenueYtd)} />
          <BizStatCard label="Operating expenses" value={formatMoney(opex)} />
          <BizStatCard label="Owner drawings" value={formatMoney(ownerOut)} hint="Not a business expense" />
          <BizStatCard
            label="Ordinary consumption (consolidated basis)"
            value={formatMoney(ordinaryConsumption)}
            hint="Transfers and owner moves excluded"
          />
        </div>
      )}

      <div className="surface-card overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border/70 text-muted-foreground border-b text-left text-xs uppercase tracking-wider">
              <th className="px-4 py-2.5">Date</th>
              <th className="px-4 py-2.5">Description</th>
              <th className="px-4 py-2.5">Category</th>
              <th className="px-4 py-2.5 text-right">Amount</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row._id} className="border-border/60 border-b last:border-0">
                <td className="text-muted-foreground px-4 py-3 text-xs">
                  {formatShortDate(row.date)}
                </td>
                <td className="px-4 py-3">{row.description}</td>
                <td className="text-muted-foreground px-4 py-3 text-xs">{row.category}</td>
                <td
                  className={`px-4 py-3 text-right font-semibold tabular-nums ${
                    row.direction === "in" ? "text-positive" : ""
                  }`}
                >
                  {row.direction === "in" ? "+" : "\u2212"}
                  {formatMoney(row.amount)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete entry"
                    onClick={() =>
                      void removeEntry({ entryId: row._id })
                        .then(() => toast.success("Entry removed"))
                        .catch(() => toast.error("Only the owner can delete entries."))
                    }
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="text-muted-foreground px-4 py-10 text-center text-sm">
                  No ledger entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record business entry</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Direction</Label>
              <Select
                value={direction}
                onValueChange={(next) => {
                  setDirection(next as "in" | "out");
                  setCategory(next === "in" ? "Client Payment" : "Operating Expense");
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Money in (revenue / capital)</SelectItem>
                  <SelectItem value="out">Money out (expense / drawing)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(direction === "in" ? IN_CATEGORIES : OUT_CATEGORIES).map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ledger-amount">Amount (KSh)</Label>
              <Input
                id="ledger-amount"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ledger-desc">Description</Label>
              <Input
                id="ledger-desc"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="animate-spin" />} Record
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
