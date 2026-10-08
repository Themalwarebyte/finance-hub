import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileCode, FileText, Loader2, AlertCircle } from "lucide-react";

export function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function blobFor(content: string, mime: string): Blob {
  return new Blob([content], { type: `${mime};charset=utf-8` });
}

export function download(content: string, fileName: string, mime: string) {
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

export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const line = (row: Record<string, unknown>) =>
    headers
      .map((h) => {
        const v = row[h];
        const s = v === undefined || v === null ? "" : String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      })
      .join(",");
  return [headers.join(","), ...rows.map(line)].join("\n");
}

export function dateFormatter(ms: number): string {
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

export function flat(obj: unknown, prefix = ""): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  if (Array.isArray(obj)) {
    for (const item of obj) out.push(...flat(item, prefix));
    return out;
  }
  if (obj !== null && typeof obj === "object") {
    const o = obj as Record<string, unknown>;
    for (const [k, v] of Object.entries(o)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (v !== null && typeof v === "object" && !Array.isArray(v)) {
        out.push(...flat(v, key));
      } else {
        out.push({ [key]: v });
      }
    }
  }
  return out;
}

export function exportCsv(key: string, rows: Record<string, unknown>[]) {
  const csv = toCsv(rows);
  download(csv, `${key}.csv`, "text/csv");
}

export function exportJson(key: string, value: unknown) {
  download(formatJson(value), `${key}.json`, "application/json");
}

export default function SettingsExportPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportData, setExportData] = useState<Record<string, unknown> | null>(null);

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
        if (cancelled) return;
        setExportData(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [sections, setSections] = useState<string[]>(["personal", "business", "investments", "roadmap"]);
  const [format, setFormat] = useState<"csv" | "json">("csv");

  const handleDownload = () => {
    if (!exportData) return;
    if (format === "csv") {
      for (const key of sections) {
        const rows = Array.isArray(exportData[key]) ? exportData[key] : [];
        exportCsv(key, rows);
      }
    } else {
      exportJson("finance-business-investment-roadmap-export", { ...exportData, exportedAt: new Date().toISOString() });
    }
  };

  if (!isAuthenticated) {
    return <div className="flex min-h-screen items-center justify-center"><div className="text-center"><p className="text-muted-foreground">Sign in to export your data.</p></div></div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Sign in to export your data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Export your data</CardTitle>
          <CardDescription>
            Personal, business, investments and roadmap data. Source: your workspace, not mock data.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3">
            {(["personal", "business", "investments", "roadmap"] as const).map((s) => (
              <Button
                key={s}
                variant={sections.includes(s) ? "default" : "outline"}
                onClick={() => {
                  setSections((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
                }}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant={format === "csv" ? "default" : "outline"} onClick={() => setFormat("csv")}>
              CSV
            </Button>
            <Button variant={format === "json" ? "default" : "outline"} onClick={() => setFormat("json")}>
              JSON
            </Button>
            <Button onClick={handleDownload} disabled={loading || !exportData}>
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Download
            </Button>
          </div>

          {error && <div className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="size-4" />{error}</div>}
        </CardContent>
      </Card>
    </div>
  );
}
