import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, } from "@/components/ui/breadcrumb";
import { normalizeView } from "@/lib/business";
import { cn } from "@/lib/utils";
import { useQuery, useMutation } from "convex/react";
import { Link, useNavigate } from "react-router";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useEffect } from "react";
import { Building2, Scale, User } from "lucide-react";
const VIEW_KEY = "financeHub.bizView";
export function readBizView() {
    try {
        return normalizeView(window.localStorage.getItem(VIEW_KEY));
    }
    catch {
        return "personal";
    }
}
export function writeBizView(view) {
    try {
        window.localStorage.setItem(VIEW_KEY, view);
    }
    catch {
        // Storage unavailable; view just won't persist.
    }
}
const VIEWS = [
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
    return (_jsx("div", { className: "border-border/70 bg-background/70 flex rounded-full border p-1", children: VIEWS.map((option) => (_jsxs("button", { type: "button", disabled: option.key !== "personal" && view === null, onClick: () => {
                if (option.key !== "personal") {
                    // Ensures the entity exists before navigating into it.
                    void setBizView({ view: option.key })
                        .catch(() => toast.error("Couldn't switch workspace."))
                        .then(() => writeBizView(option.key))
                        .then(() => navigate(option.key === "ghub" ? "/ghub/dashboard" : "/dashboard/consolidated"));
                }
                else {
                    writeBizView("personal");
                    writeBizView;
                    navigate("/dashboard");
                }
            }, className: cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors", active === option.key
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground", option.key !== "personal" && view === undefined && "opacity-50"), children: [_jsx(option.icon, { className: "size-3.5" }), _jsx("span", { className: "hidden sm:inline", children: option.label })] }, option.key))) }));
}
export function BizPageHeader({ title, subtitle, children, }) {
    return (_jsxs("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", children: [_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Breadcrumb, { children: _jsxs(BreadcrumbList, { children: [_jsx(BreadcrumbItem, { children: _jsx(Link, { to: "/dashboard", className: "hover:text-foreground transition-colors", children: "Finance Hub" }) }), _jsx(BreadcrumbSeparator, {}), _jsx(BreadcrumbItem, { children: _jsx(BreadcrumbPage, { children: "GHub" }) })] }) }), _jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: title }), subtitle && _jsx("p", { className: "text-muted-foreground mt-1 text-sm", children: subtitle })] })] }), children && _jsx("div", { className: "flex items-center gap-2", children: children })] }));
}
export function BizStatCard({ label, value, hint, tone, }) {
    return (_jsxs("div", { className: "surface-card rounded-xl border p-4", children: [_jsx("p", { className: "text-muted-foreground text-xs font-medium uppercase tracking-wider", children: label }), _jsx("p", { className: cn("mt-2 text-xl font-semibold tabular-nums", tone === "positive" && "text-positive", tone === "negative" && "text-destructive"), children: value }), hint && _jsx("p", { className: "text-muted-foreground mt-1 text-xs", children: hint })] }));
}
/** Bootstraps the GHub entity on first visit to any business page. */
export function useEnsureGHub() {
    const ensureBusiness = useMutation(api.business.ensureBusiness);
    useEffect(() => {
        void ensureBusiness({}).catch(() => toast.error("Couldn't set up GHub workspace."));
    }, [ensureBusiness]);
}
