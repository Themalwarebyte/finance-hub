import { AppShell } from "@/components/finance/AppShell";
import { AccountDialog } from "@/components/finance/AccountDialog";
import { AccountsTab } from "@/components/finance/AccountsTab";
import { PageHeader } from "@/components/finance/PageParts";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import type { AccountRow } from "@/components/finance/AccountsTab";

export default function AccountsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AccountRow | null>(null);

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Accounts"
          subtitle="Every place money sits — bank, cash, M-PESA, SACCO, cards, loans, investments."
          actions={
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="size-4" />
              Add account
            </Button>
          }
        />
        <AccountsTab
          onAdd={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
          onEdit={(account) => {
            setEditing(account);
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
