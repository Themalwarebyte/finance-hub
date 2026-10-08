import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AccountDialog } from "@/components/finance/AccountDialog";
import { InvestmentsTab } from "@/components/finance/InvestmentsTab";
import { PageHeader } from "@/components/finance/PageParts";
import { useState } from "react";
export default function InvestmentsPage() {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx(PageHeader, { title: "Investments", subtitle: "Holdings, estimated returns, and how they feed the projection." }), _jsx(InvestmentsTab, { onAdd: () => {
                    setEditing(null);
                    setDialogOpen(true);
                }, onEdit: (account) => {
                    setEditing(account);
                    setDialogOpen(true);
                } }), _jsx(AccountDialog, { open: dialogOpen, onOpenChange: setDialogOpen, account: editing })] }));
}
