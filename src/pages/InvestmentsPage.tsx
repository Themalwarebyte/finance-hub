import { AccountDialog } from "@/components/finance/AccountDialog";
import { InvestmentsTab } from "@/components/finance/InvestmentsTab";
import { PageHeader } from "@/components/finance/PageParts";
import type { InvestmentRow } from "@/components/finance/InvestmentsTab";
import { useState } from "react";

export default function InvestmentsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InvestmentRow | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Investments"
        subtitle="Holdings, estimated returns, and how they feed the projection."
      />
      <InvestmentsTab
        onAdd={() => {
          setEditing(null);
          setDialogOpen(true);
        }}
        onEdit={(account) => {
          setEditing(account);
          setDialogOpen(true);
        }}
      />

      <AccountDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        account={editing}
      />
    </div>
  );
}
