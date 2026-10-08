import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AccountDialog } from "@/components/finance/AccountDialog";
import { AccountsTab } from "@/components/finance/AccountsTab";
import { PageHeader } from "@/components/finance/PageParts";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
export default function AccountsPage() {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx(PageHeader, { title: "Accounts", subtitle: "Every place money sits \u2014 bank, cash, M-PESA, SACCO, cards, loans, investments.", actions: _jsxs(Button, { onClick: () => {
                        setEditing(null);
                        setDialogOpen(true);
                    }, className: "gap-2", children: [_jsx(Plus, { className: "size-4" }), "Add account"] }) }), _jsx(AccountsTab, { onAdd: () => {
                    setEditing(null);
                    setDialogOpen(true);
                }, onEdit: (account) => {
                    setEditing(account);
                    setDialogOpen(true);
                } }), _jsx(AccountDialog, { open: dialogOpen, onOpenChange: setDialogOpen, account: editing })] }));
}
