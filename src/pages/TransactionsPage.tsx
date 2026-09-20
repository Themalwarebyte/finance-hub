import { AppShell } from "@/components/finance/AppShell";
import { PageHeader } from "@/components/finance/PageParts";
import { ActivityTab } from "@/components/finance/ActivityTab";
import { TransactionDialog } from "@/components/finance/TransactionDialog";
import type { Direction } from "@/lib/finance";
import { useState } from "react";

export default function TransactionsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [direction, setDirection] = useState<Direction>("out");

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Transactions"
          subtitle="The central ledger — every entry, grouped by day."
        />
        <ActivityTab
          onAdd={(next) => {
            setDirection(next);
            setDialogOpen(true);
          }}
        />
      </div>

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultDirection={direction}
      />
    </AppShell>
  );
}
