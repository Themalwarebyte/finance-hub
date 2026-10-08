import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { BrandMark, PRODUCT_NAME } from "@/components/BrandMark";
import { SetupWorkspace } from "@/components/finance/SetupWorkspace";
import { TransactionDialog } from "@/components/finance/TransactionDialog";
import { WorkspaceDialog } from "@/components/finance/WorkspaceDialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, } from "@/components/ui/tooltip";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { Globe } from "lucide-react";
import { ArrowRightLeft, Briefcase, Building2, CalendarClock, CreditCard, FileText, Gauge, KanbanSquare, LayoutDashboard, Landmark, LineChart, Menu, PanelLeftClose, PanelLeftOpen, PiggyBank, Receipt, Settings, Target, TrendingUp, Users, Wallet, } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
const NAV_GROUPS = [
    {
        label: "",
        items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
    },
    {
        label: "Money",
        items: [
            { to: "/accounts", label: "Accounts", icon: Wallet },
            { to: "/transactions", label: "Transactions", icon: ArrowRightLeft },
            { to: "/bills", label: "Bills & recurring", icon: CalendarClock },
        ],
    },
    {
        label: "Planning",
        items: [
            { to: "/budgets", label: "Budgets", icon: PiggyBank },
            { to: "/goals", label: "Savings goals", icon: Target },
            { to: "/forecast", label: "Forecast", icon: LineChart },
        ],
    },
    {
        label: "Wealth",
        items: [
            { to: "/net-worth", label: "Net worth", icon: Landmark },
            { to: "/investments", label: "Investments", icon: TrendingUp },
        ],
    },
    {
        label: "Debt",
        items: [{ to: "/debts", label: "Debt manager", icon: CreditCard }],
    },
    {
        label: "More",
        items: [
            { to: "/reports", label: "Reports", icon: Receipt, soon: true },
            { to: "/tax", label: "Tax centre", icon: FileText, soon: true },
            { to: "/documents", label: "Documents", icon: FileText, soon: true },
        ],
    },
    {
        label: "GHub Business",
        items: [
            { to: "/ghub/command-center", label: "CEO command center", icon: Gauge },
            { to: "/ghub/dashboard", label: "GHub dashboard", icon: Building2 },
            { to: "/ghub/leads", label: "Lead pipeline", icon: KanbanSquare },
            { to: "/ghub/clients", label: "Clients & leads", icon: Users },
            { to: "/ghub/services", label: "Services catalogue", icon: Briefcase },
            { to: "/ghub/contracts", label: "Proposals & contracts", icon: FileText },
            { to: "/ghub/invoices", label: "Invoices & payments", icon: Receipt },
            { to: "/ghub/financials", label: "Business financials", icon: Landmark },
            { to: "/ghub/roadmap", label: "Business roadmap", icon: Target },
        ],
    },
    {
        label: "Investments",
        items: [
            { to: "/investments/dashboard", label: "Investments", icon: TrendingUp },
            { to: "/investments/portfolio", label: "Portfolio", icon: Wallet },
            { to: "/investments/transactions", label: "Transactions", icon: ArrowRightLeft },
            { to: "/investments/assets", label: "Other assets", icon: Landmark },
            { to: "/investments/allocations", label: "Allocations", icon: Target },
            { to: "/investments/performance", label: "Performance", icon: LineChart },
        ],
    },
    {
        label: "Wealth & Planning",
        items: [
            { to: "/wealth/dashboard", label: "Wealth dashboard", icon: Landmark },
            { to: "/wealth/roadmaps", label: "Long-term roadmaps", icon: LineChart },
            { to: "/wealth/milestones", label: "Milestones", icon: Target },
            { to: "/wealth/insights", label: "Insights", icon: FileText },
        ],
    },
];
const SIDEBAR_KEY = "financeHub.sidebarCollapsed";
const EXPANDED_W = "280px";
const COLLAPSED_W = "76px";
function initialsFor(label) {
    return label.trim().slice(0, 1).toUpperCase() || "?";
}
function NavItems({ pathname, collapsed, onNavigate, }) {
    return (_jsx(TooltipProvider, { delayDuration: 150, children: _jsx("nav", { className: "flex flex-col gap-5", children: NAV_GROUPS.map((group, groupIndex) => (_jsxs("div", { className: "flex flex-col gap-1", children: [collapsed ? (groupIndex > 0 && _jsx("div", { className: "border-border/60 mx-3 border-t" })) : (group.label && (_jsx("p", { className: "text-muted-foreground/70 px-3 text-[10px] font-semibold tracking-[0.14em] uppercase", children: group.label }))), group.items.map((item) => {
                        const link = (_jsxs(NavLink, { to: item.to, onClick: onNavigate, "aria-disabled": item.soon, "aria-label": collapsed ? item.label : undefined, className: cn("flex items-center gap-2.5 rounded-lg text-sm font-medium transition-colors", collapsed ? "mx-auto w-10 justify-center px-0 py-2" : "px-3 py-2", pathname === item.to
                                ? "bg-primary/10 text-primary"
                                : item.soon
                                    ? "text-muted-foreground/50 cursor-not-allowed"
                                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"), children: [_jsx(item.icon, { className: "size-4 shrink-0" }), !collapsed && (_jsxs(_Fragment, { children: [_jsx("span", { className: "flex-1", children: item.label }), item.soon && (_jsx("span", { className: "bg-muted text-muted-foreground/70 rounded-full px-1.5 py-0.5 text-[10px] font-medium", children: "soon" }))] }))] }, item.to));
                        if (item.soon) {
                            return collapsed ? (_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("span", { role: "presentation", children: link }) }), _jsx(TooltipContent, { side: "right", children: `${item.label} · soon` })] }, item.to)) : (_jsx("span", { "aria-disabled": true, className: "cursor-not-allowed", children: link }, item.to));
                        }
                        return collapsed ? (_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: link }), _jsx(TooltipContent, { side: "right", children: item.label })] }, item.to)) : (link);
                    })] }, group.label || `group-${groupIndex}`))) }) }));
}
/** Brand block; collapses to the logo mark alone. */
function SidebarBrand({ collapsed, onToggle }) {
    return (_jsxs("div", { className: cn("flex items-center pb-4", collapsed ? "flex-col gap-2 px-0" : "justify-between gap-2 px-2"), children: [_jsxs(NavLink, { to: "/dashboard", className: cn("flex items-center gap-2.5", collapsed && "justify-center"), "aria-label": PRODUCT_NAME, children: [_jsx(BrandMark, {}), !collapsed && (_jsx("span", { className: "text-[15px] font-semibold tracking-tight", children: PRODUCT_NAME }))] }), _jsx(Button, { variant: "ghost", size: "icon", onClick: onToggle, className: "text-muted-foreground hover:text-foreground size-8", "aria-label": collapsed ? "Expand sidebar" : "Collapse sidebar", children: collapsed ? _jsx(PanelLeftOpen, { className: "size-4" }) : _jsx(PanelLeftClose, { className: "size-4" }) })] }));
}
export function AppShell() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const household = useQuery(api.households.current);
    const loadSample = useMutation(api.sample.load);
    const displayCurrency = useQuery(api.currency.getDisplayCurrency, {});
    const countryRate = useQuery(api.currency.getCountry, {
        code: displayCurrency ?? "",
    });
    const rateCentsPerUsd = countryRate?.rateCentsPerUsd ?? null;
    const [recordOpen, setRecordOpen] = useState(false);
    const [workspaceOpen, setWorkspaceOpen] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [loadingSample, setLoadingSample] = useState(false);
    const [collapsed, setCollapsed] = useState(() => {
        if (typeof window === "undefined")
            return false;
        try {
            return window.localStorage.getItem(SIDEBAR_KEY) === "true";
        }
        catch {
            return false;
        }
    });
    // Persist the preference; route changes must never reset it.
    useEffect(() => {
        try {
            window.localStorage.setItem(SIDEBAR_KEY, String(collapsed));
        }
        catch {
            // Storage unavailable (private mode etc.) — collapse state just won't persist.
        }
    }, [collapsed]);
    const toggleCollapsed = () => setCollapsed((value) => !value);
    if (household === undefined) {
        return (_jsx("div", { className: "bg-background flex min-h-screen items-center justify-center", children: _jsx("div", { className: "text-muted-foreground animate-pulse text-sm", children: "Loading Finance Hub\u2026" }) }));
    }
    if (household === null) {
        return _jsx(SetupWorkspace, {});
    }
    const handleSignOut = async () => {
        await signOut();
        navigate("/");
    };
    const handleLoadSample = async () => {
        setLoadingSample(true);
        try {
            await loadSample({});
            toast.success("Example data loaded");
        }
        catch {
            toast.error("Couldn't load example data.");
        }
        finally {
            setLoadingSample(false);
        }
    };
    const memberLabels = household.members.map((member) => member.name || member.email || "Member");
    const workspaceButton = (_jsxs("button", { type: "button", onClick: () => setWorkspaceOpen(true), className: "border-border/70 hover:bg-muted/60 flex items-center gap-2.5 rounded-full border py-1.5 pr-3 pl-1.5 transition-colors", children: [_jsx("span", { className: "flex -space-x-2", children: memberLabels.slice(0, 2).map((label, index) => (_jsx("span", { className: cn("border-background flex size-6 items-center justify-center rounded-full border-2 text-[10px] font-semibold", index === 0 ? "bg-primary/15 text-primary" : "bg-accent text-accent-foreground"), children: initialsFor(label) }, `${label}-${index}`))) }), _jsx("span", { className: "max-w-[140px] truncate text-sm font-medium", children: household.household.name }), _jsx(Users, { className: "text-muted-foreground size-3.5" })] }));
    return (_jsxs("div", { className: "bg-background min-h-screen", style: { "--sidebar-w": collapsed ? COLLAPSED_W : EXPANDED_W }, children: [_jsxs("aside", { className: "border-border/70 bg-background/80 fixed inset-y-0 left-0 z-30 hidden flex-col overflow-hidden border-r px-3 py-5 backdrop-blur-xl transition-[width] duration-200 ease-in-out lg:flex", style: { width: "var(--sidebar-w)" }, children: [_jsx(SidebarBrand, { collapsed: collapsed, onToggle: toggleCollapsed }), _jsx("div", { className: "flex-1 overflow-y-auto", children: _jsx(NavItems, { pathname: location.pathname, collapsed: collapsed }) }), _jsx("div", { className: "border-border/70 mt-4 border-t pt-4", children: collapsed ? (_jsx(TooltipProvider, { delayDuration: 150, children: _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx(Button, { variant: "ghost", size: "icon", onClick: () => void handleSignOut(), className: "text-muted-foreground hover:text-foreground mx-auto flex size-9", "aria-label": "Sign out", children: _jsx(Settings, { className: "size-4" }) }) }), _jsx(TooltipContent, { side: "right", children: "Sign out" })] }) })) : (_jsxs("button", { type: "button", onClick: () => void handleSignOut(), className: "text-muted-foreground hover:text-foreground flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors", children: [_jsx(Settings, { className: "size-4" }), "Sign out"] })) })] }), _jsxs("div", { className: "transition-[padding] duration-200 ease-in-out lg:pl-[var(--sidebar-w)]", style: { "--sidebar-w": collapsed ? COLLAPSED_W : EXPANDED_W }, children: [_jsx("header", { className: "border-border/70 bg-background/85 sticky top-0 z-20 border-b backdrop-blur-xl", children: _jsxs("div", { className: "flex h-14 w-full items-center justify-between gap-3 px-4 sm:px-6", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs(Sheet, { open: mobileNavOpen, onOpenChange: setMobileNavOpen, children: [_jsx(SheetTrigger, { asChild: true, children: _jsx(Button, { variant: "ghost", size: "icon", className: "lg:hidden", "aria-label": "Open navigation", children: _jsx(Menu, { className: "size-5" }) }) }), _jsxs(SheetContent, { side: "left", className: "w-72 p-0", children: [_jsx(SheetHeader, { className: "border-border/70 border-b px-5 py-4", children: _jsxs(SheetTitle, { className: "flex items-center gap-2.5 text-left", children: [_jsx(BrandMark, {}), _jsx("span", { className: "text-[15px]", children: PRODUCT_NAME })] }) }), _jsx("div", { className: "px-4 py-5", children: _jsx(NavItems, { pathname: location.pathname, collapsed: false, onNavigate: () => setMobileNavOpen(false) }) })] })] }), _jsx("div", { className: "lg:hidden", children: _jsx(BrandMark, {}) })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "hidden sm:block", children: workspaceButton }), _jsx("div", { className: "hidden sm:flex items-center gap-1.5", children: _jsxs("div", { className: "flex items-center gap-1.5 rounded-full border border-border/70 px-3 py-1.5", children: [_jsx(Globe, { className: "size-3.5 text-muted-foreground" }), _jsxs("select", { value: displayCurrency ?? "USD", onChange: (e) => {
                                                            const next = e.target.value;
                                                            void api.currency.setDisplayCurrency({ country: next });
                                                        }, className: "bg-transparent text-sm font-medium text-foreground outline-none focus:ring-0", "aria-label": "Display currency", children: [_jsx("option", { value: "USD", children: "USD (US Dollar)" }), _jsx("option", { value: "KES", children: "KES (Kenyan Shilling)" })] })] }) }), _jsxs(Button, { className: "gap-2", onClick: () => setRecordOpen(true), children: [_jsx(ArrowRightLeft, { className: "size-4" }), _jsx("span", { className: "hidden sm:inline", children: "Record money" }), _jsx("span", { className: "sm:hidden", children: "Record" })] })] })] }) }), _jsx("main", { className: "mx-auto w-full max-w-7xl px-4 pt-6 pb-20 sm:px-6", children: _jsx(Outlet, {}) })] }), _jsx(TransactionDialog, { open: recordOpen, onOpenChange: setRecordOpen }), _jsx(WorkspaceDialog, { open: workspaceOpen, onOpenChange: setWorkspaceOpen, household: {
                    _id: household.household._id,
                    name: household.household.name,
                    inviteCode: household.household.inviteCode,
                }, members: household.members, myUserId: household.myUserId, onSignOut: () => void handleSignOut() })] }));
}
