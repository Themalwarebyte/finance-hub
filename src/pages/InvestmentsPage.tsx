import { AppShell } from "@/components/finance/AppShell";
import { InvestmentsTab } from "@/components/finance/InvestmentsTab";
import { AccountDialog } from "@/components/finance/AccountDialog";
import { PageHeader } from "@/components/finance/PageParts";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import type { InvestmentRow } from "@/components/finance/InvestmentsTab";

export default function InvestmentsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InvestmentRow | null>(null);

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Investments"
          subtitle="Portfolios with return estimates — growth flows into your projection."
          actions={
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="size-4" />
              Add investment
            </Button>
          }
        />
        <InvestmentsTab
          onAdd={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
          onEdit={(investment) => {
            setEditing(investment);
            setDialogOpen(true);
          }}
        />
      </div>

      <AccountDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        account={editing}
      />
    </AppShell>
  );
}
