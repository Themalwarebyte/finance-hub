import { PageHeader } from "@/components/finance/PageParts";
import { RecurringDialog } from "@/components/finance/RecurringDialog";
import { ScheduledTab } from "@/components/finance/ScheduledTab";
import { useState } from "react";

export default function BillsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Bills & recurring"
        subtitle="Rent, salary, subscriptions — everything that repeats, feeding the forecast."
      />
      <ScheduledTab onAdd={() => setDialogOpen(true)} />

      <RecurringDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultDirection="out"
      />
    </div>
  );
}
