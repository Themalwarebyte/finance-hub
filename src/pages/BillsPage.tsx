import { AppShell } from "@/components/finance/AppShell";
import { RecurringDialog } from "@/components/finance/RecurringDialog";
import { ScheduledTab } from "@/components/finance/ScheduledTab";
import { PageHeader } from "@/components/finance/PageParts";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";

export default function BillsPage() {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Bills & recurring"
          subtitle="Predictable money in and out — the engine behind forecasts and upcoming bills."
          actions={
            <Button onClick={() => setAddOpen(true)} className="gap-2">
              <Plus className="size-4" />
              Schedule money
            </Button>
          }
        />
        <ScheduledTab onAdd={() => setAddOpen(true)} />
      </div>

      <RecurringDialog open={addOpen} onOpenChange={setAddOpen} />
    </AppShell>
  );
}
