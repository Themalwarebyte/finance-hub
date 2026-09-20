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

  const [pending, setPending] = useState<"create" | "join" | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending("create");
    setError(null);
    try {
      await createWorkspace({ name: name.trim() || undefined });
      toast.success("Workspace created");
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : "Couldn't create it.",
      );
    } finally {
      setPending(null);
    }
  };

  const handleJoin = async (event: React.FormEvent) => {
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
    } catch (joinError) {
      setError(
        joinError instanceof Error ? joinError.message : "Couldn't join it.",
      );
    } finally {
      setPending(null);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center px-6 py-16">
        <div className="flex items-center gap-3">
          <BrandMark />
          <span className="text-lg font-semibold tracking-tight">
            {PRODUCT_NAME}
          </span>
        </div>

        <h1 className="mt-8 text-3xl font-semibold tracking-tight sm:text-4xl">
          Set up your shared money workspace
        </h1>
        <p className="text-muted-foreground mt-3 max-w-xl text-[15px] leading-7">
          {user?.email ? `Signed in as ${user.email}. ` : ""}
          Start one workspace and invite your partner, or join the workspace they
          already started. Every balance, entry and projection lives inside it.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <form
            onSubmit={handleCreate}
            className="surface-card flex flex-col gap-4 p-6"
          >
            <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
              <PlusCircle className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Start fresh</h2>
              <p className="text-muted-foreground mt-1 text-sm leading-6">
                Create a workspace and add your accounts. You can invite your
                partner right after.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="setup-name">Workspace name</Label>
              <Input
                id="setup-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Our money"
              />
            </div>
            <Button
              type="submit"
              className="mt-1 w-full gap-2"
              disabled={pending !== null}
            >
              {pending === "create" ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Wallet className="size-4" />
              )}
              Create workspace
            </Button>
          </form>

          <form
            onSubmit={handleJoin}
            className="surface-card flex flex-col gap-4 p-6"
          >
            <div className="bg-accent text-accent-foreground flex size-10 items-center justify-center rounded-lg">
              <KeyRound className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Join your partner</h2>
              <p className="text-muted-foreground mt-1 text-sm leading-6">
                Already have an invite code? Enter it to share every balance and
                projection.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="setup-code">Invite code</Label>
              <Input
                id="setup-code"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="ABCD-2345"
                className="font-mono tracking-[0.14em] uppercase"
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              className="mt-1 w-full gap-2"
              disabled={pending !== null}
            >
              {pending === "join" ? (
                <Loader2 className="animate-spin" />
              ) : (
                <KeyRound className="size-4" />
              )}
              Join workspace
            </Button>
          </form>
        </div>

        {error && <p className="text-destructive mt-5 text-sm">{error}</p>}

        <button
          type="button"
          onClick={() => void signOut()}
          className="text-muted-foreground hover:text-foreground mt-8 w-fit text-sm underline-offset-4 transition-colors hover:underline"
        >
          Sign out
        </button>
      </div>
    </main>
  );
}
