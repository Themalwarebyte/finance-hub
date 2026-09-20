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
  PiggyBank,
  Receipt,
  Settings,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router";
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

function initialsFor(label: string): string {
  return label.trim().slice(0, 1).toUpperCase() || "?";
}

function NavItems({
  onNavigate,
  pathname,
}: {
  onNavigate?: () => void;
  pathname: string;
}) {
  return (
    <nav className="flex flex-col gap-5">
      {NAV_GROUPS.map((group, groupIndex) => (
        <div key={group.label || `group-${groupIndex}`} className="flex flex-col gap-1">
          {group.label && (
            <p className="text-muted-foreground/70 px-3 text-[10px] font-semibold tracking-[0.14em] uppercase">
              {group.label}
            </p>
          )}
          {group.items.map((item) =>
            item.soon ? (
              <span
                key={item.to}
                aria-disabled
                className="text-muted-foreground/50 flex cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-2 text-sm"
              >
                <item.icon className="size-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                <span className="bg-muted text-muted-foreground/70 rounded-full px-1.5 py-0.5 text-[10px] font-medium">
                  soon
                </span>
              </span>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  pathname === item.to
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <item.icon className="size-4 shrink-0" />
                {item.label}
              </NavLink>
            ),
          )}
        </div>
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const household = useQuery(api.households.current);
  const loadSample = useMutation(api.sample.load);

  const [recordOpen, setRecordOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);

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
    <div className="bg-background min-h-screen">
      {/* Desktop sidebar */}
      <aside className="border-border/70 bg-background/80 fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r px-4 py-5 backdrop-blur-xl lg:flex">
        <NavLink to="/dashboard" className="flex items-center gap-2.5 px-2 pb-5">
          <BrandMark />
          <span className="text-[15px] font-semibold tracking-tight">{PRODUCT_NAME}</span>
        </NavLink>
        <div className="flex-1 overflow-y-auto">
          <NavItems pathname={location.pathname} />
        </div>
        <div className="border-border/70 mt-4 border-t pt-4">
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="text-muted-foreground hover:text-foreground flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors"
          >
            <Settings className="size-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="lg:pl-60">
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

        <main className="mx-auto w-full max-w-7xl px-4 pt-6 pb-20 sm:px-6">{children}</main>
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
