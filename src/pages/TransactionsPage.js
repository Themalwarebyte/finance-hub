import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ActivityTab } from "@/components/finance/ActivityTab";
import { PageHeader } from "@/components/finance/PageParts";
import { TransactionDialog } from "@/components/finance/TransactionDialog";
import { useState } from "react";
export default function TransactionsPage() {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [direction, setDirection] = useState("out");
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx(PageHeader, { title: "Transactions", subtitle: "The central ledger \u2014 every entry, grouped by day." }), _jsx(ActivityTab, { onAdd: (next) => {
                    setDirection(next);
                    setDialogOpen(true);
                } }), _jsx(TransactionDialog, { open: dialogOpen, onOpenChange: setDialogOpen, defaultDirection: direction })] }));
}
