import { BrandMark, PRODUCT_NAME } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowRightLeft,
  CalendarClock,
  Check,
  KeyRound,
  LayoutDashboard,
  LineChart,
  Shield,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { Link } from "react-router";

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
};

const FEATURES = [
  {
    icon: Wallet,
    title: "All balances in one view",
    body: "Checking, savings, cards and cash side by side, with what you hold and what you owe separated out. One screen, no tab juggling.",
  },
  {
    icon: ArrowRightLeft,
    title: "Money in, money out",
    body: "Record income and spending in seconds, then filter the history by day to see exactly what moved and what it did to your balance.",
  },
  {
    icon: TrendingUp,
    title: "Next 30 days, drawn forward",
    body: "Rent, paychecks and subscriptions land on the right days, so you can see your projected balance before the month happens.",
  },
  {
    icon: LineChart,
    title: "Investments with return estimates",
    body: "Give an investment account an estimated return — monthly or annual — and that growth compounds daily into the projection.",
  },
  {
    icon: Users,
    title: "Built for two",
    body: "One workspace, one invite code. You and your partner see the same balances, the same activity and the same forecast.",
  },
];

const STEPS = [
  {
    label: "01",
    title: "Add the accounts",
    body: "Drop in every place your money sits and set the current balance. That is your starting point.",
  },
  {
    label: "02",
    title: "Record the movement",
    body: "Log money in and money out as it happens. Balances update the moment you save an entry.",
  },
  {
    label: "03",
    title: "Schedule the predictable",
    body: "Add recurring rent, paychecks and bills, plus investment accounts with estimated returns. Tally projects your balance day by day for the next month.",
  },
];

function HeroPreview() {
  return (
    <div className="relative">
      <div className="bg-primary/12 absolute -inset-6 rounded-[32px] blur-2xl" />
      <div className="surface-card relative overflow-hidden p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.16em] uppercase">
              Total balance
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
              $24,381
            </p>
          </div>
          <span className="bg-positive/10 text-positive inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium">
            <TrendingUp className="size-3.5" />
            +$6,415 in 30 days
          </span>
        </div>

        <div className="mt-5 overflow-hidden rounded-xl">
          <svg viewBox="0 0 600 190" className="w-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="landingFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.28" />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <g stroke="var(--border)" strokeWidth="1" strokeDasharray="4 6">
              {[40, 90, 140].map((y) => (
                <line key={y} x1="0" y1={y} x2="600" y2={y} />
              ))}
            </g>
            <path
              d="M0,152 C40,152 55,124 80,122 C110,120 125,144 150,146 C180,148 195,104 220,100 C250,96 265,122 290,124 C320,126 335,84 360,78 C390,72 405,100 430,96 C460,92 475,54 500,48 C530,42 545,64 570,56 L600,50 L600,190 L0,190 Z"
              fill="url(#landingFill)"
            />
            <path
              d="M0,152 C40,152 55,124 80,122 C110,120 125,144 150,146 C180,148 195,104 220,100 C250,96 265,122 290,124 C320,126 335,84 360,78 C390,72 405,100 430,96 C460,92 475,54 500,48 C530,42 545,64 570,56 L600,50"
              fill="none"
              stroke="var(--chart-1)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="600" cy="50" r="5" fill="var(--chart-1)" />
          </svg>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            { name: "Everyday Checking", value: "$4,912", color: "bg-[oklch(0.55_0.09_197)]" },
            { name: "Joint Checking", value: "$6,204", color: "bg-[oklch(0.52_0.145_285)]" },
            { name: "High-Yield Savings", value: "$19,000", color: "bg-[oklch(0.58_0.12_162)]" },
          ].map((account) => (
            <div
              key={account.name}
              className="border-border/70 flex flex-col gap-1.5 rounded-xl border p-3.5"
            >
              <span className={cn("size-2 rounded-full", account.color)} />
              <p className="text-muted-foreground truncate text-[11px]">
                {account.name}
              </p>
              <p className="text-sm font-semibold tabular-nums">{account.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-xl bg-muted/60 px-3.5 py-3">
          <CalendarClock className="text-muted-foreground size-4 shrink-0" />
          <p className="text-muted-foreground truncate text-xs">
            Rent $1,850 · Paycheck +$2,850 · Est. returns +$138
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-border/60 bg-background/80 sticky top-0 z-40 border-b backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
          <span className="flex items-center gap-2.5">
            <BrandMark />
            <span className="text-[17px] font-semibold tracking-tight">
              {PRODUCT_NAME}
            </span>
          </span>
          <nav className="flex items-center gap-1.5">
            <a
              href="#features"
              className="text-muted-foreground hover:text-foreground hidden rounded-full px-3.5 py-2 text-sm font-medium transition-colors sm:block"
            >
              Features
            </a>
            <a
              href="#how"
              className="text-muted-foreground hover:text-foreground hidden rounded-full px-3.5 py-2 text-sm font-medium transition-colors sm:block"
            >
              How it works
            </a>
            {!isLoading && isAuthenticated ? (
              <Button asChild className="gap-2">
                <Link to="/dashboard">
                  <LayoutDashboard className="size-4" />
                  Open dashboard
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link to="/auth">Sign in</Link>
                </Button>
                <Button asChild className="gap-2">
                  <Link to="/auth">
                    Get started
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-[520px]" />
        <div className="grid-lines pointer-events-none absolute inset-x-0 top-0 h-[520px] opacity-40" />
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 px-5 pt-16 pb-20 lg:grid-cols-[1.05fr_1fr] lg:pt-24">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="border-border/70 bg-card/70 text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium">
              <span className="bg-positive size-1.5 rounded-full" />
              Version 1 · balances and the month ahead
            </span>

            <h1 className="mt-6 text-[40px] leading-[1.05] font-semibold tracking-[-0.03em] sm:text-[56px]">
              Every balance,
              <br />
              one calm view.
            </h1>

            <p className="text-muted-foreground mt-6 max-w-xl text-[17px] leading-8">
              {PRODUCT_NAME} gathers your accounts, money in and money out onto a
              single screen — then draws your balance forward across the next 30
              days, investment returns included, so the month never surprises
              you. Shared with your partner, down to the last cent.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link to="/auth">
                  Create your workspace
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="gap-2">
                <a href="#how">
                  See how it works
                  <ArrowRightLeft className="size-4" />
                </a>
              </Button>
            </div>

            <ul className="text-muted-foreground mt-9 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {["Free to start", "Invite your partner", "No bank logins needed"].map(
                (item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="text-primary size-4" />
                    {item}
                  </li>
                ),
              )}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          >
            <HeroPreview />
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto w-full max-w-6xl px-5 py-20">
        <motion.div {...fadeUp} className="max-w-2xl">
          <p className="text-primary text-xs font-semibold tracking-[0.16em] uppercase">
            What version 1 does
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Focused on the two things that actually matter
          </h2>
          <p className="text-muted-foreground mt-4 text-[15px] leading-7">
            Where your money is right now, and where it will be a month from now.
            Everything else can wait.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {FEATURES.map((feature, index) => (
            <motion.div
              key={feature.title}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: index * 0.06 }}
              className="surface-card p-6 transition-shadow hover:shadow-[var(--shadow-lift)]"
            >
              <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
                <feature.icon className="size-5" />
              </span>
              <h3 className="mt-4 text-[17px] font-semibold tracking-tight">
                {feature.title}
              </h3>
              <p className="text-muted-foreground mt-2 text-sm leading-7">
                {feature.body}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Partner */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-20">
        <motion.div
          {...fadeUp}
          className="surface-card relative overflow-hidden p-8 sm:p-12"
        >
          <div className="bg-primary/8 pointer-events-none absolute -top-24 -right-16 size-72 rounded-full blur-3xl" />
          <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <span className="bg-accent text-accent-foreground flex size-10 items-center justify-center rounded-lg">
                <Users className="size-5" />
              </span>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight">
                One workspace, two people
              </h2>
              <p className="text-muted-foreground mt-4 text-[15px] leading-7">
                Start the workspace, then share a short invite code. Your partner
                signs in, joins, and immediately sees the same balances, the same
                activity and the same projection. No exports, no screenshots, no
                &ldquo;which spreadsheet is current?&rdquo;
              </p>
              <ul className="text-muted-foreground mt-7 flex flex-col gap-3 text-sm">
                {[
                  "Shared accounts, transactions and forecasts",
                  "Rotate the invite code whenever you like",
                  "Leave the workspace at any time",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5">
                    <Check className="text-primary size-4 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-border/70 bg-muted/40 flex flex-col gap-4 rounded-2xl border p-6">
              <div className="flex items-center gap-2.5">
                <KeyRound className="text-muted-foreground size-4" />
                <p className="text-sm font-medium">Invite code</p>
              </div>
              <p className="font-mono text-2xl font-semibold tracking-[0.24em]">
                K7QP-3XRT
              </p>
              <div className="flex items-center gap-3">
                <span className="bg-primary/15 text-primary flex size-8 items-center justify-center rounded-full text-xs font-semibold">
                  A
                </span>
                <span className="bg-accent text-accent-foreground flex size-8 items-center justify-center rounded-full text-xs font-semibold">
                  J
                </span>
                <p className="text-muted-foreground text-xs">
                  You and your partner, together
                </p>
              </div>
              <div className="border-border/70 mt-1 flex items-center gap-2 border-t pt-4">
                <Shield className="text-muted-foreground size-4" />
                <p className="text-muted-foreground text-xs">
                  Your finances stay in your workspace only.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto w-full max-w-6xl px-5 pb-20">
        <motion.div {...fadeUp} className="max-w-2xl">
          <p className="text-primary text-xs font-semibold tracking-[0.16em] uppercase">
            How it works
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Set up in a few minutes
          </h2>
        </motion.div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <motion.div
              key={step.label}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: index * 0.08 }}
              className="relative"
            >
              <div className="surface-card h-full p-6">
                <p className="text-primary/70 font-mono text-xs font-semibold">
                  {step.label}
                </p>
                <h3 className="mt-3 text-[17px] font-semibold tracking-tight">
                  {step.title}
                </h3>
                <p className="text-muted-foreground mt-2 text-sm leading-7">
                  {step.body}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-24">
        <motion.div
          {...fadeUp}
          className="bg-primary text-primary-foreground relative overflow-hidden rounded-3xl px-8 py-14 text-center sm:px-14"
        >
          <div className="pointer-events-none absolute inset-0 opacity-25 [background:radial-gradient(60%_80%_at_50%_0%,white,transparent_70%)]" />
          <div className="relative">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Know where you stand, and where you&apos;re heading
            </h2>
            <p className="text-primary-foreground/75 mx-auto mt-4 max-w-xl text-[15px] leading-7">
              Add your first account and the projection starts drawing itself.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" variant="secondary" className="gap-2">
                <Link to="/auth">
                  Get started free
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="text-primary-foreground hover:bg-primary-foreground/12 hover:text-primary-foreground"
              >
                <Link to="/auth">Sign in</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </section>

      <footer className="border-border/60 border-t">
        <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-xs sm:flex-row">
          <span className="flex items-center gap-2">
            <BrandMark className="size-6" />
            {PRODUCT_NAME}
          </span>
          <span>Balances and the next 30 days, in one calm view.</span>
        </div>
      </footer>
    </div>
  );
}
