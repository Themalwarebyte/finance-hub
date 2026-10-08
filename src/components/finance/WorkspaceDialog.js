import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import { Check, Copy, Loader2, LogOut, RefreshCw, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
export function WorkspaceDialog({ open, onOpenChange, household, members, myUserId, onSignOut, }) {
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
        }
        catch {
            toast.error("Couldn't copy — select the code and copy it manually.");
        }
    };
    const handleSaveName = async () => {
        if (name.trim().length === 0 || name.trim() === household.name)
            return;
        setSavingName(true);
        try {
            await rename({ name });
            toast.success("Workspace renamed");
        }
        catch {
            toast.error("Couldn't rename the workspace.");
        }
        finally {
            setSavingName(false);
        }
    };
    const handleRegenerate = async () => {
        setRotating(true);
        try {
            await regenerate();
            toast.success("New invite code created");
        }
        catch {
            toast.error("Couldn't create a new code.");
        }
        finally {
            setRotating(false);
        }
    };
    const handleLeave = async () => {
        setLeaving(true);
        try {
            await leave();
            toast.success("You left the workspace");
            onOpenChange(false);
        }
        catch {
            toast.error("Couldn't leave the workspace.");
        }
        finally {
            setLeaving(false);
        }
    };
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "sm:max-w-lg", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Shared workspace" }), _jsx(DialogDescription, { children: "Everyone with an invite code sees the same accounts, transactions and projections." })] }), _jsxs("div", { className: "flex flex-col gap-6", children: [_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "workspace-name", children: "Workspace name" }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Input, { id: "workspace-name", value: name, onChange: (event) => setName(event.target.value), onBlur: handleSaveName }), _jsx(Button, { type: "button", variant: "outline", onClick: handleSaveName, disabled: savingName || name.trim() === household.name, children: savingName ? _jsx(Loader2, { className: "animate-spin" }) : "Save" })] })] }), _jsx(Separator, {}), _jsxs("div", { className: "flex flex-col gap-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Users, { className: "text-muted-foreground size-4" }), _jsx("p", { className: "text-sm font-medium", children: members.length > 1 ? "You and your partner" : "Invite your partner" })] }), _jsx("div", { className: "flex flex-col gap-2", children: members.map((member) => {
                                        const label = member.name || member.email || "Workspace member";
                                        const initial = label.slice(0, 1).toUpperCase();
                                        return (_jsxs("div", { className: "bg-muted/50 flex items-center gap-3 rounded-lg px-3 py-2", children: [_jsx("span", { className: cn("flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold", "bg-primary/10 text-primary"), children: initial }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("p", { className: "truncate text-sm font-medium", children: [label, member.userId === myUserId && (_jsx("span", { className: "text-muted-foreground font-normal", children: " (you)" }))] }), member.email && member.name && (_jsx("p", { className: "text-muted-foreground truncate text-xs", children: member.email }))] }), _jsx("span", { className: "text-muted-foreground text-xs capitalize", children: member.role })] }, member.userId));
                                    }) }), _jsxs("div", { className: "border-border bg-muted/40 flex items-center justify-between gap-3 rounded-lg border border-dashed px-3 py-2.5", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-muted-foreground text-xs", children: "Invite code" }), _jsx("p", { className: "font-mono text-sm font-semibold tracking-[0.14em]", children: household.inviteCode })] }), _jsxs("div", { className: "flex shrink-0 gap-1", children: [_jsx(Button, { type: "button", variant: "ghost", size: "icon-sm", onClick: handleRegenerate, disabled: rotating, "aria-label": "Generate a new invite code", children: rotating ? (_jsx(Loader2, { className: "animate-spin" })) : (_jsx(RefreshCw, { className: "size-4" })) }), _jsxs(Button, { type: "button", variant: "outline", size: "sm", onClick: handleCopy, className: "gap-1.5", children: [copied ? _jsx(Check, { className: "size-3.5" }) : _jsx(Copy, { className: "size-3.5" }), copied ? "Copied" : "Copy"] })] })] }), _jsx("p", { className: "text-muted-foreground text-xs leading-5", children: "Your partner enters this code under \u201CJoin a workspace\u201D when they sign in. Rotating the code only stops future joins." })] }), _jsx(Separator, {}), _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2", children: [_jsxs(Button, { type: "button", variant: "ghost", className: "text-destructive hover:text-destructive gap-2", onClick: handleLeave, disabled: leaving, children: [leaving ? _jsx(Loader2, { className: "size-4 animate-spin" }) : null, "Leave workspace"] }), _jsxs(Button, { type: "button", variant: "outline", className: "gap-2", onClick: () => {
                                        onOpenChange(false);
                                        onSignOut();
                                    }, children: [_jsx(LogOut, { className: "size-4" }), "Sign out"] })] })] })] }) }));
}
