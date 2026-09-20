import { BrandMark, PRODUCT_NAME } from "@/components/BrandMark";
import { SetupWorkspace } from "@/components/finance/SetupWorkspace";
import { TransactionDialog } from "@/components/finance/TransactionDialog";
import { WorkspaceDialog, type WorkspaceMember } from "@/components/finance/WorkspaceDialog";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowRightLeft,
  CalendarClock,
  CreditCard,
  FileText,
  LayoutDashboard,
  Landmark,
  LineChart,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  PiggyBank,
  Receipt,
  Settings,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";

type NavItem = {
  to: string;
  label: string;
  icon: typeof Wallet;
  soon?: boolean;
};

type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
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
];

const SIDEBAR_KEY = "financeHub.sidebarCollapsed";
const EXPANDED_W = "280px";
const COLLAPSED_W = "76px";

function initialsFor(label: string): string {
  return label.trim().slice(0, 1).toUpperCase() || "?";
}

function NavItems({
  pathname,
  collapsed,
  onNavigate,
}: {
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <TooltipProvider delayDuration={150}>
      <nav className="flex flex-col gap-5">
        {NAV_GROUPS.map((group, groupIndex) => (
          <div key={group.label || `group-${groupIndex}`} className="flex flex-col gap-1">
            {collapsed ? (
              groupIndex > 0 && <div className="border-border/60 mx-3 border-t" />
            ) : (
              group.label && (
                <p className="text-muted-foreground/70 px-3 text-[10px] font-semibold tracking-[0.14em] uppercase">
                  {group.label}
                </p>
              )
            )}
            {group.items.map((item) => {
              const link = (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  aria-disabled={item.soon}
                  aria-label={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg text-sm font-medium transition-colors",
                    collapsed ? "mx-auto w-10 justify-center px-0 py-2" : "px-3 py-2",
                    pathname === item.to
                      ? "bg-primary/10 text-primary"
                      : item.soon
                        ? "text-muted-foreground/50 cursor-not-allowed"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <item.icon className="size-4 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1">{item.label}</span>
                      {item.soon && (
                        <span className="bg-muted text-muted-foreground/70 rounded-full px-1.5 py-0.5 text-[10px] font-medium">
                          soon
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );

              if (item.soon) {
                return collapsed ? (
                  <Tooltip key={item.to}>
                    <TooltipTrigger asChild>
                      <span role="presentation">{link}</span>
                    </TooltipTrigger>
                    <TooltipContent side="right">{`${item.label} · soon`}</TooltipContent>
                  </Tooltip>
                ) : (
                  <span key={item.to} aria-disabled className="cursor-not-allowed">
                    {link}
                  </span>
                );
              }

              return collapsed ? (
                <Tooltip key={item.to}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              ) : (
                link
              );
            })}
          </div>
        ))}
      </nav>
    </TooltipProvider>
  );
}

/** Brand block; collapses to the logo mark alone. */
function SidebarBrand({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <div
      className={cn(
        "flex items-center pb-4",
        collapsed ? "flex-col gap-2 px-0" : "justify-between gap-2 px-2",
      )}
    >
      <NavLink
        to="/dashboard"
        className={cn("flex items-center gap-2.5", collapsed && "justify-center")}
        aria-label={PRODUCT_NAME}
      >
        <BrandMark />
        {!collapsed && (
          <span className="text-[15px] font-semibold tracking-tight">{PRODUCT_NAME}</span>
        )}
      </NavLink>
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="text-muted-foreground hover:text-foreground size-8"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
      </Button>
    </div>
  );
}

export function AppShell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const household = useQuery(api.households.current);
  const loadSample = useMutation(api.sample.load);

  const [recordOpen, setRecordOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(SIDEBAR_KEY) === "true";
    } catch {
      return false;
    }
  });

  // Persist the preference; route changes must never reset it.
  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_KEY, String(collapsed));
    } catch {
      // Storage unavailable (private mode etc.) — collapse state just won't persist.
    }
  }, [collapsed]);

  const toggleCollapsed = () => setCollapsed((value) => !value);

  if (household === undefined) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground animate-pulse text-sm">Loading Finance Hub…</div>
      </div>
    );
  }

  if (household === null) {
    return <SetupWorkspace />;
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
    } catch {
      toast.error("Couldn't load example data.");
    } finally {
      setLoadingSample(false);
    }
  };

  const memberLabels = household.members.map(
    (member: WorkspaceMember) => member.name || member.email || "Member",
  );

  const workspaceButton = (
    <button
      type="button"
      onClick={() => setWorkspaceOpen(true)}
      className="border-border/70 hover:bg-muted/60 flex items-center gap-2.5 rounded-full border py-1.5 pr-3 pl-1.5 transition-colors"
    >
      <span className="flex -space-x-2">
        {memberLabels.slice(0, 2).map((label: string, index: number) => (
          <span
            key={`${label}-${index}`}
            className={cn(
              "border-background flex size-6 items-center justify-center rounded-full border-2 text-[10px] font-semibold",
              index === 0 ? "bg-primary/15 text-primary" : "bg-accent text-accent-foreground",
            )}
          >
            {initialsFor(label)}
          </span>
        ))}
      </span>
      <span className="max-w-[140px] truncate text-sm font-medium">
        {household.household.name}
      </span>
      <Users className="text-muted-foreground size-3.5" />
    </button>
  );

  return (
    <div
      className="bg-background min-h-screen"
      style={{ "--sidebar-w": collapsed ? COLLAPSED_W : EXPANDED_W } as React.CSSProperties}
    >
      {/* Desktop sidebar — persistent, fixed, collapsible */}
      <aside
        className="border-border/70 bg-background/80 fixed inset-y-0 left-0 z-30 hidden flex-col overflow-hidden border-r px-3 py-5 backdrop-blur-xl transition-[width] duration-200 ease-in-out lg:flex"
        style={{ width: "var(--sidebar-w)" }}
      >
        <SidebarBrand collapsed={collapsed} onToggle={toggleCollapsed} />
        <div className="flex-1 overflow-y-auto">
          <NavItems pathname={location.pathname} collapsed={collapsed} />
        </div>
        <div className="border-border/70 mt-4 border-t pt-4">
          {collapsed ? (
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => void handleSignOut()}
                    className="text-muted-foreground hover:text-foreground mx-auto flex size-9"
                    aria-label="Sign out"
                  >
                    <Settings className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Sign out</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="text-muted-foreground hover:text-foreground flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors"
            >
              <Settings className="size-4" />
              Sign out
            </button>
          )}
        </div>
      </aside>

      {/* Main column — offset by the sidebar width so it resizes on collapse */}
      <div
        className="transition-[padding] duration-200 ease-in-out lg:pl-[var(--sidebar-w)]"
        style={{ "--sidebar-w": collapsed ? COLLAPSED_W : EXPANDED_W } as React.CSSProperties}
      >
        <header className="border-border/70 bg-background/85 sticky top-0 z-20 border-b backdrop-blur-xl">
          <div className="flex h-14 w-full items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex items-center gap-2">
              <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
                    <Menu className="size-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0">
                  <SheetHeader className="border-border/70 border-b px-5 py-4">
                    <SheetTitle className="flex items-center gap-2.5 text-left">
                      <BrandMark />
                      <span className="text-[15px]">{PRODUCT_NAME}</span>
                    </SheetTitle>
                  </SheetHeader>
                  <div className="px-4 py-5">
                    <NavItems
                      pathname={location.pathname}
                      collapsed={false}
                      onNavigate={() => setMobileNavOpen(false)}
                    />
                  </div>
                </SheetContent>
              </Sheet>
              <div className="lg:hidden">
                <BrandMark />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:block">{workspaceButton}</div>
              <Button className="gap-2" onClick={() => setRecordOpen(true)}>
                <ArrowRightLeft className="size-4" />
                <span className="hidden sm:inline">Record money</span>
                <span className="sm:hidden">Record</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 pt-6 pb-20 sm:px-6">
          <Outlet />
        </main>
      </div>

      <TransactionDialog
        open={recordOpen}
        onOpenChange={setRecordOpen}
      />

      <WorkspaceDialog
        open={workspaceOpen}
        onOpenChange={setWorkspaceOpen}
        household={{
          _id: household.household._id as Id<"households">,
          name: household.household.name,
          inviteCode: household.household.inviteCode,
        }}
        members={household.members}
        myUserId={household.myUserId as Id<"users">}
        onSignOut={() => void handleSignOut()}
      />
    </div>
  );
}

