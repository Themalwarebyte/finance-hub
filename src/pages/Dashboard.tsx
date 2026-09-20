import { Wordmark } from "@/components/BrandMark";
import { AccountDialog } from "@/components/finance/AccountDialog";
import { AccountsTab, type AccountRow } from "@/components/finance/AccountsTab";
import { ActivityTab } from "@/components/finance/ActivityTab";
import { OverviewTab } from "@/components/finance/OverviewTab";
import { RecurringDialog } from "@/components/finance/RecurringDialog";
import { ScheduledTab } from "@/components/finance/ScheduledTab";
import { SetupWorkspace } from "@/components/finance/SetupWorkspace";
import { TransactionDialog } from "@/components/finance/TransactionDialog";
import { WorkspaceDialog } from "@/components/finance/WorkspaceDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import type { Direction } from "@/lib/finance";
import { greeting } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { ArrowRightLeft, CalendarClock, LayoutDashboard, Users, Wallet } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

type TabValue = "overview" | "accounts" | "activity" | "scheduled";

function initialsFor(label: string): string {
  return label.trim().slice(0, 1).toUpperCase() || "?";
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 pt-10 pb-16">
      <div className="bg-muted h-7 w-56 animate-pulse rounded-lg" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="bg-muted h-32 animate-pulse rounded-xl" />
        ))}
      </div>
      <div className="bg-muted h-64 animate-pulse rounded-xl" />
    </div>
  );
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const household = useQuery(api.households.current);
  const [windowDays, setWindowDays] = useState(30);
  const overview = useQuery(api.finance.overview, { windowDays });
  const loadSample = useMutation(api.sample.load);

  const [tab, setTab] = useState<TabValue>("overview");
  const [loadingSample, setLoadingSample] = useState(false);

  const [transactionDialog, setTransactionDialog] = useState<{
    open: boolean;
    direction: Direction;
  }>({ open: false, direction: "out" });
  const [accountDialog, setAccountDialog] = useState<{
    open: boolean;
    account: AccountRow | null;
  }>({ open: false, account: null });
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleLoadSample = async () => {
    setLoadingSample(true);
    try {
      await loadSample({});
      toast.success("Example data loaded");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't load example data.",
      );
    } finally {
      setLoadingSample(false);
    }
  };

  if (household === undefined) {
    return (
      <main className="min-h-screen bg-background">
        <DashboardSkeleton />
      </main>
    );
  }

  if (household === null) {
    return <SetupWorkspace />;
  }

  const firstName = (user?.name ?? household.members[0]?.name ?? "")
    .trim()
    .split(" ")[0];
  const memberLabels = household.members.map(
    (member) => member.name || member.email || "Member",
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-border/70 bg-background/85 sticky top-0 z-30 border-b backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5">
          <Wordmark />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setWorkspaceOpen(true)}
              className="border-border/70 hover:bg-muted/60 hidden items-center gap-2.5 rounded-full border py-1.5 pr-3 pl-1.5 transition-colors sm:flex"
            >
              <span className="flex -space-x-2">
                {memberLabels.slice(0, 2).map((label, index) => (
                  <span
                    key={`${label}-${index}`}
                    className={cn(
                      "border-background flex size-6 items-center justify-center rounded-full border-2 text-[10px] font-semibold",
                      index === 0
                        ? "bg-primary/15 text-primary"
                        : "bg-accent text-accent-foreground",
                    )}
                  >
                    {initialsFor(label)}
                  </span>
                ))}
              </span>
              <span className="max-w-[150px] truncate text-sm font-medium">
                {household.household.name}
              </span>
              <Users className="text-muted-foreground size-3.5" />
            </button>

            <Button
              variant="outline"
              size="icon"
              className="sm:hidden"
              aria-label="Workspace settings"
              onClick={() => setWorkspaceOpen(true)}
            >
              <Users className="size-4" />
            </Button>

            <Button
              className="gap-2"
              onClick={() =>
                setTransactionDialog({ open: true, direction: "out" })
              }
            >
              <ArrowRightLeft className="size-4" />
              <span className="hidden sm:inline">Record money</span>
              <span className="sm:hidden">Record</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 pt-8 pb-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-muted-foreground text-sm">
              {greeting()}
              {firstName ? `, ${firstName}` : ""}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-[28px]">
              {household.household.name}
            </h1>
          </div>
          <p className="text-muted-foreground text-xs">
            {household.members.length > 1
              ? `${household.members.length} people sharing this workspace`
              : "Only you in this workspace — invite your partner any time"}
          </p>
        </div>

        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as TabValue)}
          className="mt-7"
        >
          <TabsList className="h-10 w-full justify-start gap-1 overflow-x-auto rounded-full p-1 sm:w-auto">
            <TabsTrigger value="overview" className="shrink-0 gap-2 rounded-full px-3.5">
              <LayoutDashboard className="size-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="accounts" className="shrink-0 gap-2 rounded-full px-3.5">
              <Wallet className="size-4" />
              Accounts
            </TabsTrigger>
            <TabsTrigger value="activity" className="shrink-0 gap-2 rounded-full px-3.5">
              <ArrowRightLeft className="size-4" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="shrink-0 gap-2 rounded-full px-3.5">
              <CalendarClock className="size-4" />
              Scheduled
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-5">
            {overview === undefined ? (
              <div className="flex flex-col gap-6">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[0, 1, 2, 3].map((index) => (
                    <div
                      key={index}
                      className="bg-muted h-32 animate-pulse rounded-xl"
                    />
                  ))}
                </div>
                <div className="bg-muted h-72 animate-pulse rounded-xl" />
              </div>
            ) : overview === null ? (
              <div className="surface-card text-muted-foreground p-10 text-center text-sm">
                Setting up your workspace…
              </div>
            ) : (
              <OverviewTab
                data={overview}
                onAddAccount={() => setAccountDialog({ open: true, account: null })}
                onAddTransaction={() =>
                  setTransactionDialog({ open: true, direction: "out" })
                }
                onLoadSample={handleLoadSample}
                loadingSample={loadingSample}
                onWindowDaysChange={setWindowDays}
                onGoToAccounts={() => setTab("accounts")}
              />
            )}
          </TabsContent>

          <TabsContent value="accounts" className="mt-5">
            <AccountsTab
              onAdd={() => setAccountDialog({ open: true, account: null })}
              onEdit={(account) => setAccountDialog({ open: true, account })}
            />
          </TabsContent>

          <TabsContent value="activity" className="mt-5">
            <ActivityTab
              onAdd={(direction) =>
                setTransactionDialog({ open: true, direction })
              }
            />
          </TabsContent>

          <TabsContent value="scheduled" className="mt-5">
            <ScheduledTab onAdd={() => setRecurringOpen(true)} />
          </TabsContent>
        </Tabs>
      </main>

      <TransactionDialog
        open={transactionDialog.open}
        defaultDirection={transactionDialog.direction}
        onOpenChange={(open) =>
          setTransactionDialog((current) => ({ ...current, open }))
        }
      />

      <AccountDialog
        open={accountDialog.open}
        account={accountDialog.account}
        onOpenChange={(open) =>
          setAccountDialog((current) => ({ ...current, open }))
        }
      />

      <RecurringDialog open={recurringOpen} onOpenChange={setRecurringOpen} />

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
