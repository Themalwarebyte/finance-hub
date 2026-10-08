import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Loader2, AlertCircle } from "lucide-react";
export function formatJson(value) {
    return JSON.stringify(value, null, 2);
}
export function blobFor(content, mime) {
    return new Blob([content], { type: `${mime};charset=utf-8` });
}
export function download(content, fileName, mime) {
    const blob = blobFor(content, mime);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
export function toCsv(rows) {
    if (rows.length === 0)
        return "";
    const headers = Object.keys(rows[0]);
    const line = (row) => headers
        .map((h) => {
        const v = row[h];
        const s = v === undefined || v === null ? "" : String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    })
        .join(",");
    return [headers.join(","), ...rows.map(line)].join("\n");
}
export function dateFormatter(ms) {
    const d = new Date(ms);
    return [
        d.getUTCFullYear(),
        String(d.getUTCMonth() + 1).padStart(2, "0"),
        String(d.getUTCDate()).padStart(2, "0"),
    ].join("-") + "T" + [
        String(d.getUTCHours()).padStart(2, "0"),
        String(d.getUTCMinutes()).padStart(2, "0"),
        String(d.getUTCSeconds()).padStart(2, "0"),
    ].join("") + "Z";
}
export function flat(obj, prefix = "") {
    const out = [];
    if (Array.isArray(obj)) {
        for (const item of obj)
            out.push(...flat(item, prefix));
        return out;
    }
    if (obj !== null && typeof obj === "object") {
        const o = obj;
        for (const [k, v] of Object.entries(o)) {
            const key = prefix ? `${prefix}.${k}` : k;
            if (v !== null && typeof v === "object" && !Array.isArray(v)) {
                out.push(...flat(v, key));
            }
            else {
                out.push({ [key]: v });
            }
        }
    }
    return out;
}
export function exportCsv(key, rows) {
    const csv = toCsv(rows);
    download(csv, `${key}.csv`, "text/csv");
}
export function exportJson(key, value) {
    download(formatJson(value), `${key}.json`, "application/json");
}
export default function SettingsExportPage() {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [exportData, setExportData] = useState(null);
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await fetch("/api/settings/export", {
                    headers: { "Content-Type": "application/json" },
                });
                if (!response.ok) {
                    const body = await response.json().catch(() => ({}));
                    throw new Error(body.error || `Export failed (${response.status})`);
                }
                const data = await response.json();
                if (cancelled)
                    return;
                setExportData(data);
            }
            catch (e) {
                if (!cancelled)
                    setError(e instanceof Error ? e.message : String(e));
            }
            finally {
                if (!cancelled)
                    setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);
    const [sections, setSections] = useState(["personal", "business", "investments", "roadmap"]);
    const [format, setFormat] = useState("csv");
    const handleDownload = () => {
        if (!exportData)
            return;
        if (format === "csv") {
            for (const key of sections) {
                const rows = Array.isArray(exportData[key]) ? exportData[key] : [];
                exportCsv(key, rows);
            }
        }
        else {
            exportJson("finance-business-investment-roadmap-export", { ...exportData, exportedAt: new Date().toISOString() });
        }
    };
    if (!isAuthenticated) {
        return _jsx("div", { className: "flex min-h-screen items-center justify-center", children: _jsx("div", { className: "text-center", children: _jsx("p", { className: "text-muted-foreground", children: "Sign in to export your data." }) }) });
    }
    if (!isAuthenticated) {
        return (_jsx("div", { className: "flex min-h-screen items-center justify-center", children: _jsx("div", { className: "text-center", children: _jsx("p", { className: "text-muted-foreground", children: "Sign in to export your data." }) }) }));
    }
    return (_jsx("div", { className: "flex flex-col gap-6", children: _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Export your data" }), _jsx(CardDescription, { children: "Personal, business, investments and roadmap data. Source: your workspace, not mock data." })] }), _jsxs(CardContent, { className: "flex flex-col gap-4", children: [_jsx("div", { className: "flex flex-wrap gap-3", children: ["personal", "business", "investments", "roadmap"].map((s) => (_jsx(Button, { variant: sections.includes(s) ? "default" : "outline", onClick: () => {
                                    setSections((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
                                }, children: s.charAt(0).toUpperCase() + s.slice(1) }, s))) }), _jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsx(Button, { variant: format === "csv" ? "default" : "outline", onClick: () => setFormat("csv"), children: "CSV" }), _jsx(Button, { variant: format === "json" ? "default" : "outline", onClick: () => setFormat("json"), children: "JSON" }), _jsxs(Button, { onClick: handleDownload, disabled: loading || !exportData, children: [loading ? (_jsx(Loader2, { className: "size-4 animate-spin" })) : (_jsx(Download, { className: "size-4" })), "Download"] })] }), error && _jsxs("div", { className: "flex items-center gap-2 text-sm text-destructive", children: [_jsx(AlertCircle, { className: "size-4" }), error] })] })] }) }));
}
