import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { PageHeader } from "@/components/finance/PageParts";
import { RecurringDialog } from "@/components/finance/RecurringDialog";
import { ScheduledTab } from "@/components/finance/ScheduledTab";
import { useState } from "react";
export default function BillsPage() {
    const [dialogOpen, setDialogOpen] = useState(false);
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx(PageHeader, { title: "Bills & recurring", subtitle: "Rent, salary, subscriptions \u2014 everything that repeats, feeding the forecast." }), _jsx(ScheduledTab, { onAdd: () => setDialogOpen(true) }), _jsx(RecurringDialog, { open: dialogOpen, onOpenChange: setDialogOpen, defaultDirection: "out" })] }));
}
