import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import { Check, Copy, Loader2, LogOut, RefreshCw, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export type WorkspaceMember = {
  userId: Id<"users">;
  role: "owner" | "member";
  name: string | null;
  email: string | null;
};

export function WorkspaceDialog({
  open,
  onOpenChange,
  household,
  members,
  myUserId,
  onSignOut,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  household: { _id: Id<"households">; name: string; inviteCode: string };
  members: WorkspaceMember[];
  myUserId: Id<"users">;
  onSignOut: () => void;
}) {
  const rename = useMutation(api.households.rename);
  const regenerate = useMutation(api.households.regenerateInvite);
  const leave = useMutation(api.households.leave);

  const [name, setName] = useState(household.name);
  const [savingName, setSavingName] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setName(household.name);
      setCopied(false);
    }
  }, [open, household.name]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(household.inviteCode);
      setCopied(true);
      toast.success("Invite code copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — select the code and copy it manually.");
    }
  };

  const handleSaveName = async () => {
    if (name.trim().length === 0 || name.trim() === household.name) return;
    setSavingName(true);
    try {
      await rename({ name });
      toast.success("Workspace renamed");
    } catch {
      toast.error("Couldn't rename the workspace.");
    } finally {
      setSavingName(false);
    }
  };

  const handleRegenerate = async () => {
    setRotating(true);
    try {
      await regenerate();
      toast.success("New invite code created");
    } catch {
      toast.error("Couldn't create a new code.");
    } finally {
      setRotating(false);
    }
  };

  const handleLeave = async () => {
    setLeaving(true);
    try {
      await leave();
      toast.success("You left the workspace");
      onOpenChange(false);
    } catch {
      toast.error("Couldn't leave the workspace.");
    } finally {
      setLeaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Shared workspace</DialogTitle>
          <DialogDescription>
            Everyone with an invite code sees the same accounts, transactions and
            projections.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="workspace-name">Workspace name</Label>
            <div className="flex gap-2">
              <Input
                id="workspace-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                onBlur={handleSaveName}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveName}
                disabled={savingName || name.trim() === household.name}
              >
                {savingName ? <Loader2 className="animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Users className="text-muted-foreground size-4" />
              <p className="text-sm font-medium">
                {members.length > 1 ? "You and your partner" : "Invite your partner"}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {members.map((member) => {
                const label = member.name || member.email || "Workspace member";
                const initial = label.slice(0, 1).toUpperCase();
                return (
                  <div
                    key={member.userId}
                    className="bg-muted/50 flex items-center gap-3 rounded-lg px-3 py-2"
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        "bg-primary/10 text-primary",
                      )}
                    >
                      {initial}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {label}
                        {member.userId === myUserId && (
                          <span className="text-muted-foreground font-normal"> (you)</span>
                        )}
                      </p>
                      {member.email && member.name && (
                        <p className="text-muted-foreground truncate text-xs">
                          {member.email}
                        </p>
                      )}
                    </div>
                    <span className="text-muted-foreground text-xs capitalize">
                      {member.role}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="border-border bg-muted/40 flex items-center justify-between gap-3 rounded-lg border border-dashed px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-muted-foreground text-xs">Invite code</p>
                <p className="font-mono text-sm font-semibold tracking-[0.14em]">
                  {household.inviteCode}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleRegenerate}
                  disabled={rotating}
                  aria-label="Generate a new invite code"
                >
                  {rotating ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="gap-1.5"
                >
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>

            <p className="text-muted-foreground text-xs leading-5">
              Your partner enters this code under &ldquo;Join a workspace&rdquo; when
              they sign in. Rotating the code only stops future joins.
            </p>
          </div>

          <Separator />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:text-destructive gap-2"
              onClick={handleLeave}
              disabled={leaving}
            >
              {leaving ? <Loader2 className="size-4 animate-spin" /> : null}
              Leave workspace
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => {
                onOpenChange(false);
                onSignOut();
              }}
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
