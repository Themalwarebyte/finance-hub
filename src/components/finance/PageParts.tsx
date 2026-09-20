import { Skeleton } from "@/components/ui/skeleton";
import type { ReactNode } from "react";

/** Standard page header used by every finance page. */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h1>
        {subtitle && <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Small labelled stat, used inside summary strips and cards. */
export function MiniStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "positive" | "negative";
}) {
  const toneClass =
    tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : "";
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={`mt-1 text-sm font-semibold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}

/** Empty state card with an icon, message and optional action. */
export function EmptyCard({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="surface-card flex flex-col items-center px-6 py-14 text-center">
      <span className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-xl">
        {icon}
      </span>
      <h2 className="mt-5 text-lg font-semibold tracking-tight">{title}</h2>
      <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-6">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/** Loading state card. */
export function LoadingCard({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="surface-card p-6">
      <Skeleton className="bg-muted h-5 w-40" />
      <div className="mt-4 space-y-3">
        <Skeleton className="bg-muted h-4 w-full" />
        <Skeleton className="bg-muted h-4 w-4/5" />
        <Skeleton className="bg-muted h-4 w-3/5" />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** Percentage-change pill: green when a rise is good, red when a fall is good. */
export function ChangeBadge({
  pct,
  invert = false,
  suffix = "vs last period",
}: {
  pct: number | null;
  invert?: boolean;
  suffix?: string;
}) {
  if (pct === null) return null;
  const up = pct >= 0;
  const good = invert ? !up : up;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${
        good ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative"
      }`}
    >
      {up ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%{" "}
      {suffix && <span className="text-muted-foreground font-normal">{suffix}</span>}
    </span>
  );
}
