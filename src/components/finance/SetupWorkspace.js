import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrandMark, PRODUCT_NAME } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "convex/react";
import { KeyRound, Loader2, PlusCircle, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
export function SetupWorkspace() {
    const createWorkspace = useMutation(api.households.create);
    const joinWorkspace = useMutation(api.households.join);
    const { user, signOut } = useAuth();
    const [pending, setPending] = useState(null);
    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [error, setError] = useState(null);
    const handleCreate = async (event) => {
        event.preventDefault();
        setPending("create");
        setError(null);
        try {
            await createWorkspace({ name: name.trim() || undefined });
            toast.success("Workspace created");
        }
        catch (createError) {
            setError(createError instanceof Error ? createError.message : "Couldn't create it.");
        }
        finally {
            setPending(null);
        }
    };
    const handleJoin = async (event) => {
        event.preventDefault();
        if (code.trim().length < 6) {
            setError("Enter the invite code your partner shared.");
            return;
        }
        setPending("join");
        setError(null);
        try {
            await joinWorkspace({ inviteCode: code });
            toast.success("You joined the workspace");
        }
        catch (joinError) {
            setError(joinError instanceof Error ? joinError.message : "Couldn't join it.");
        }
        finally {
            setPending(null);
        }
    };
    return (_jsxs("main", { className: "relative min-h-screen overflow-hidden", children: [_jsx("div", { className: "hero-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" }), _jsxs("div", { className: "relative mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center px-6 py-16", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(BrandMark, {}), _jsx("span", { className: "text-lg font-semibold tracking-tight", children: PRODUCT_NAME })] }), _jsx("h1", { className: "mt-8 text-3xl font-semibold tracking-tight sm:text-4xl", children: "Set up your shared money workspace" }), _jsxs("p", { className: "text-muted-foreground mt-3 max-w-xl text-[15px] leading-7", children: [user?.email ? `Signed in as ${user.email}. ` : "", "Start one workspace and invite your partner, or join the workspace they already started. Every balance, entry and projection lives inside it."] }), _jsxs("div", { className: "mt-10 grid gap-5 md:grid-cols-2", children: [_jsxs("form", { onSubmit: handleCreate, className: "surface-card flex flex-col gap-4 p-6", children: [_jsx("div", { className: "bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg", children: _jsx(PlusCircle, { className: "size-5" }) }), _jsxs("div", { children: [_jsx("h2", { className: "text-base font-semibold", children: "Start fresh" }), _jsx("p", { className: "text-muted-foreground mt-1 text-sm leading-6", children: "Create a workspace and add your accounts. You can invite your partner right after." })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "setup-name", children: "Workspace name" }), _jsx(Input, { id: "setup-name", value: name, onChange: (event) => setName(event.target.value), placeholder: "Our money" })] }), _jsxs(Button, { type: "submit", className: "mt-1 w-full gap-2", disabled: pending !== null, children: [pending === "create" ? (_jsx(Loader2, { className: "animate-spin" })) : (_jsx(Wallet, { className: "size-4" })), "Create workspace"] })] }), _jsxs("form", { onSubmit: handleJoin, className: "surface-card flex flex-col gap-4 p-6", children: [_jsx("div", { className: "bg-accent text-accent-foreground flex size-10 items-center justify-center rounded-lg", children: _jsx(KeyRound, { className: "size-5" }) }), _jsxs("div", { children: [_jsx("h2", { className: "text-base font-semibold", children: "Join your partner" }), _jsx("p", { className: "text-muted-foreground mt-1 text-sm leading-6", children: "Already have an invite code? Enter it to share every balance and projection." })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "setup-code", children: "Invite code" }), _jsx(Input, { id: "setup-code", value: code, onChange: (event) => setCode(event.target.value.toUpperCase()), placeholder: "ABCD-2345", className: "font-mono tracking-[0.14em] uppercase" })] }), _jsxs(Button, { type: "submit", variant: "outline", className: "mt-1 w-full gap-2", disabled: pending !== null, children: [pending === "join" ? (_jsx(Loader2, { className: "animate-spin" })) : (_jsx(KeyRound, { className: "size-4" })), "Join workspace"] })] })] }), error && _jsx("p", { className: "text-destructive mt-5 text-sm", children: error }), _jsx("button", { type: "button", onClick: () => void signOut(), className: "text-muted-foreground hover:text-foreground mt-8 w-fit text-sm underline-offset-4 transition-colors hover:underline", children: "Sign out" })] })] }));
}
