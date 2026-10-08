import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { normalizeView, type ViewKey } from "@/lib/business";
import { cn } from "@/lib/utils";
import { useQuery, useMutation } from "convex/react";
import { Link, useNavigate } from "react-router";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useEffect } from "react";
import { Building2, Scale, User } from "lucide-react";

const VIEW_KEY = "financeHub.bizView";

export function readBizView(): ViewKey {
  try {
    return normalizeView(window.localStorage.getItem(VIEW_KEY));
  } catch {
    return "personal";
  }
}

export function writeBizView(view: ViewKey): void {
  try {
    window.localStorage.setItem(VIEW_KEY, view);
  } catch {
    // Storage unavailable; view just won't persist.
  }
}

const VIEWS: { key: ViewKey; label: string; icon: typeof User }[] = [
  { key: "personal", label: "Personal", icon: User },
  { key: "ghub", label: "GHub", icon: Building2 },
  { key: "consolidated", label: "Consolidated", icon: Scale },
];

/** Personal / GHub / Consolidated switcher pill. */
export function BizViewSwitcher() {
  const view = useQuery(api.userSettings.currentBizView);
  const setBizView = useMutation(api.userSettings.setBizView);
  const navigate = useNavigate();

  const active = normalizeView(view ?? "personal");

  return (
    <div className="border-border/70 bg-background/70 flex rounded-full border p-1">
      {VIEWS.map((option) => (
        <button
          key={option.key}
          type="button"
          disabled={option.key !== "personal" && view === null}
          onClick={() => {
            if (option.key !== "personal") {
              // Ensures the entity exists before navigating into it.
              void setBizView({ view: option.key })
                .catch(() => toast.error("Couldn't switch workspace."))
                .then(() => writeBizView(option.key))
                .then(() => navigate(option.key === "ghub" ? "/ghub/dashboard" : "/dashboard/consolidated"));
            } else {
              writeBizView("personal");
              writeBizView;
              navigate("/dashboard");
            }
          }}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            active === option.key
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground",
            option.key !== "personal" && view === undefined && "opacity-50",
          )}
        >
          <option.icon className="size-3.5" />
          <span className="hidden sm:inline">{option.label}</span>
        </button>
      ))}
    </div>
  );
}

export function BizPageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <Link to="/dashboard" className="hover:text-foreground transition-colors">
                Finance Hub
              </Link>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>GHub</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

export function BizStatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "positive" | "negative" | "neutral";
}) {
  return (
    <div className="surface-card rounded-xl border p-4">
      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">{label}</p>
      <p
        className={cn(
          "mt-2 text-xl font-semibold tabular-nums",
          tone === "positive" && "text-positive",
          tone === "negative" && "text-destructive",
        )}
      >
        {value}
      </p>
      {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
    </div>
  );
}

/** Bootstraps the GHub entity on first visit to any business page. */
export function useEnsureGHub() {
  const ensureBusiness = useMutation(api.business.ensureBusiness);
  useEffect(() => {
    void ensureBusiness({}).catch(() => toast.error("Couldn't set up GHub workspace."));
  }, [ensureBusiness]);
}
