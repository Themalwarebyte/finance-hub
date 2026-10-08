import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/finance/AppShell";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import ExportPage from "./pages/SettingsExportPage";
import React, { StrictMode, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";
// Lazy load route components for better code splitting
const Landing = lazy(() => import("./pages/Landing.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const AccountsPage = lazy(() => import("./pages/AccountsPage.tsx"));
const TransactionsPage = lazy(() => import("./pages/TransactionsPage.tsx"));
const BillsPage = lazy(() => import("./pages/BillsPage.tsx"));
const BudgetsPage = lazy(() => import("./pages/BudgetsPage.tsx"));
const GoalsPage = lazy(() => import("./pages/GoalsPage.tsx"));
const ForecastPage = lazy(() => import("./pages/ForecastPage.tsx"));
const NetWorthPage = lazy(() => import("./pages/NetWorthPage.tsx"));
const InvestmentsPage = lazy(() => import("./pages/InvestmentsPage.tsx"));
const DebtsPage = lazy(() => import("./pages/DebtsPage.tsx"));
const GHubDashboard = lazy(() => import("./pages/GHubDashboard.tsx"));
const ClientsPage = lazy(() => import("./pages/ClientsPage.tsx"));
const ContractsPage = lazy(() => import("./pages/ContractsPage.tsx"));
const InvoicesPage = lazy(() => import("./pages/InvoicesPage.tsx"));
const BusinessFinancialsPage = lazy(() => import("./pages/BusinessFinancialsPage.tsx"));
const RoadmapPage = lazy(() => import("./pages/RoadmapPage.tsx"));
const CommandCenterPage = lazy(() => import("./pages/CommandCenterPage.tsx"));
const LeadsPage = lazy(() => import("./pages/LeadsPage.tsx"));
const ServicesPage = lazy(() => import("./pages/ServicesPage.tsx"));
const InvestmentsDashboardPage = lazy(() => import("./pages/InvestmentsDashboardPage.tsx"));
const PortfolioPage = lazy(() => import("./pages/PortfolioPage.tsx"));
const InvestmentsTransactionsPage = lazy(() => import("./pages/InvestmentsTransactionsPage.tsx"));
const AssetsPage = lazy(() => import("./pages/AssetsPage.tsx"));
const AllocationsPage = lazy(() => import("./pages/AllocationsPage.tsx"));
const PerformancePage = lazy(() => import("./pages/PerformancePage.tsx"));
const WealthDashboardPage = lazy(() => import("./pages/WealthDashboardPage.tsx"));
const RoadmapsPage = lazy(() => import("./pages/RoadmapsPage.tsx"));
const MilestonesPage = lazy(() => import("./pages/MilestonesPage.tsx"));
const InsightsPage = lazy(() => import("./pages/InsightsPage.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
// Simple loading fallback for route transitions
function RouteLoading() {
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center", children: _jsx("div", { className: "animate-pulse text-muted-foreground", children: "Loading..." }) }));
}
/** Silent error boundary — if VlyToolbar crashes it renders nothing instead of
 *  crashing the whole app (e.g. hook errors in WebContainer environment). */
class ToolbarErrorBoundary extends React.Component {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "state", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: { hasError: false }
        });
    }
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    componentDidCatch(err) {
        console.warn("[VlyToolbar] Caught error, toolbar disabled:", err.message);
    }
    render() {
        return this.state.hasError ? null : this.props.children;
    }
}
/** Hard guard so runtime errors never leave the preview as a blank page. */
class RootErrorBoundary extends React.Component {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "state", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: { hasError: false, message: "", stack: "" }
        });
    }
    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            message: error.message || "Unknown runtime error",
            stack: error.stack || "",
        };
    }
    componentDidCatch(err) {
        console.error("[WebContainer preview] Root crash:", err);
    }
    render() {
        if (this.state.hasError) {
            return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-background text-foreground p-6", children: _jsxs("div", { className: "max-w-lg text-center", children: [_jsx("p", { className: "text-sm font-semibold", children: "Preview runtime error" }), _jsx("p", { className: "mt-2 text-xs text-muted-foreground break-words", children: this.state.message }), this.state.stack && (_jsx("pre", { className: "mt-3 text-left text-[10px] leading-4 text-muted-foreground/80 max-h-40 overflow-auto rounded border border-border/60 p-2", children: this.state.stack }))] }) }));
        }
        return this.props.children;
    }
}
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);
function RouteSyncer() {
    const location = useLocation();
    useEffect(() => {
        window.parent.postMessage({ type: "iframe-route-change", path: location.pathname }, "*");
    }, [location.pathname]);
    useEffect(() => {
        function handleMessage(event) {
            if (event.data?.type === "navigate") {
                if (event.data.direction === "back")
                    window.history.back();
                if (event.data.direction === "forward")
                    window.history.forward();
            }
        }
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);
    return null;
}
createRoot(document.getElementById("root")).render(_jsx(StrictMode, { children: _jsxs(RootErrorBoundary, { children: [_jsx(ToolbarErrorBoundary, { children: _jsx(VlyToolbar, {}) }), _jsxs(ConvexAuthProvider, { client: convex, children: [_jsxs(BrowserRouter, { children: [_jsx(RouteSyncer, {}), _jsx(Suspense, { fallback: _jsx(RouteLoading, {}), children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Landing, {}) }), "      ", _jsx(Route, { path: "/auth", element: _jsx(AuthPage, { redirectAfterAuth: "/dashboard" }) }), _jsx(Route, { path: "/settings/export", element: _jsx(RequireAuth, { children: _jsx(ExportPage, {}) }) }), _jsxs(Route, { element: _jsx(RequireAuth, { children: _jsx(AppShell, {}) }), children: [_jsx(Route, { path: "/dashboard", element: _jsx(Dashboard, {}) }), _jsx(Route, { path: "/accounts", element: _jsx(AccountsPage, {}) }), _jsx(Route, { path: "/transactions", element: _jsx(TransactionsPage, {}) }), _jsx(Route, { path: "/bills", element: _jsx(BillsPage, {}) }), _jsx(Route, { path: "/budgets", element: _jsx(BudgetsPage, {}) }), _jsx(Route, { path: "/goals", element: _jsx(GoalsPage, {}) }), _jsx(Route, { path: "/forecast", element: _jsx(ForecastPage, {}) }), _jsx(Route, { path: "/net-worth", element: _jsx(NetWorthPage, {}) }), _jsx(Route, { path: "/investments", element: _jsx(InvestmentsPage, {}) }), _jsx(Route, { path: "/debts", element: _jsx(DebtsPage, {}) }), _jsx(Route, { path: "/ghub/dashboard", element: _jsx(GHubDashboard, {}) }), _jsx(Route, { path: "/ghub/command-center", element: _jsx(CommandCenterPage, {}) }), _jsx(Route, { path: "/ghub/leads", element: _jsx(LeadsPage, {}) }), _jsx(Route, { path: "/ghub/services", element: _jsx(ServicesPage, {}) }), _jsx(Route, { path: "/ghub/clients", element: _jsx(ClientsPage, {}) }), _jsx(Route, { path: "/ghub/contracts", element: _jsx(ContractsPage, {}) }), _jsx(Route, { path: "/ghub/invoices", element: _jsx(InvoicesPage, {}) }), _jsx(Route, { path: "/ghub/financials", element: _jsx(BusinessFinancialsPage, {}) }), _jsx(Route, { path: "/ghub/roadmap", element: _jsx(RoadmapPage, {}) }), _jsx(Route, { path: "/investments/dashboard", element: _jsx(InvestmentsDashboardPage, {}) }), _jsx(Route, { path: "/investments/portfolio", element: _jsx(PortfolioPage, {}) }), _jsx(Route, { path: "/investments/transactions", element: _jsx(InvestmentsTransactionsPage, {}) }), _jsx(Route, { path: "/investments/assets", element: _jsx(AssetsPage, {}) }), _jsx(Route, { path: "/investments/allocations", element: _jsx(AllocationsPage, {}) }), _jsx(Route, { path: "/investments/performance", element: _jsx(PerformancePage, {}) }), _jsx(Route, { path: "/wealth/dashboard", element: _jsx(WealthDashboardPage, {}) }), _jsx(Route, { path: "/wealth/roadmaps", element: _jsx(RoadmapsPage, {}) }), _jsx(Route, { path: "/wealth/milestones", element: _jsx(MilestonesPage, {}) }), _jsx(Route, { path: "/wealth/insights", element: _jsx(InsightsPage, {}) })] }), _jsx(Route, { path: "*", element: _jsx(NotFound, {}) })] }) })] }), _jsx(Toaster, {})] })] }) }));
