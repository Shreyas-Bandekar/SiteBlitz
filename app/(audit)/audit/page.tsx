"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { AuditReport, LiveAuditHistory } from "../../../lib/audit-types";
import {
  ArrowRightLeft,
  Gauge,
  History,
  Search,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { ManualModeToggle } from "../../../components/ManualAuditPanel";

const LiveScanningAnimation = dynamic(
  () => import("../../../components/LiveScanningAnimation"),
  { ssr: false },
);
const LiveAuditResults = dynamic(
  () => import("../../../components/LiveAuditResults"),
  { ssr: false },
);
const DetailedReport = dynamic(
  () => import("../../../components/DetailedReport"),
  {
    ssr: false,
  },
);
const ManualCompetitorCompare = dynamic(
  () => import("../../../components/ManualCompetitorCompare"),
  { ssr: false },
);
const LiveDatabaseHistory = dynamic(
  () => import("../../../components/LiveDatabaseHistory"),
  { ssr: false },
);

type ApiResponse = AuditReport & { error?: string; elapsedMs?: number };
type HistoryResponse = { records?: LiveAuditHistory[]; error?: string };

export default function AuditPage() {
  const [mode, setMode] = useState<"main" | "compare" | "history">("main");
  const [url, setUrl] = useState("");
  const [report, setReport] = useState<AuditReport | null>(null);
  const [history, setHistory] = useState<LiveAuditHistory[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState("");
  const [failedStage, setFailedStage] = useState("");
  const [stageTrace, setStageTrace] = useState<
    Array<{ stage: string; status: string }>
  >([]);
  const [fastMode, setFastMode] = useState(true);
  const [manualMode, setManualMode] = useState(false);
  const autoStartedRef = useRef(false);

  useEffect(() => {
    if (autoStartedRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const queryMode = params.get("mode");
    if (queryMode === "compare" || queryMode === "history") {
      setMode(queryMode);
    }
    const source = params.get("url") || "";
    if (source) setUrl(source);
    if (source && params.get("autoStart") === "1" && queryMode !== "compare") {
      autoStartedRef.current = true;
      void runLiveAudit(source);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mode !== "history") return;

    const fetchHistory = async () => {
      setIsHistoryLoading(true);
      try {
        const res = await fetch("/api/audit/history?limit=30");
        const data = (await res.json()) as HistoryResponse;
        if (!res.ok || data.error) {
          throw new Error(data.error || "Failed to load history");
        }
        setHistory(data.records || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load history");
      } finally {
        setIsHistoryLoading(false);
      }
    };

    void fetchHistory();
  }, [mode]);

  useEffect(() => {
    if (!isAuditing) return;
    const timer = setInterval(() => setStage((prev) => (prev + 1) % 8), 1100);
    return () => clearInterval(timer);
  }, [isAuditing]);

  const runLiveAudit = async (value?: string) => {
    const target = (value ?? url).trim();
    if (!target) return;

    setIsAuditing(true);
    setError("");
    setFailedStage("");
    setReport(null);
    setStage(0);

    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: target,
          enrichCompetitors: true,
          enrichAi: !fastMode,
          strictDb: false,
        }),
      });
      const json = (await response.json()) as ApiResponse;
      if (!response.ok || json.error) {
        setStageTrace(json.stageTrace || []);
        setFailedStage(
          (json as ApiResponse & { failedStage?: string }).failedStage ||
            "unknown",
        );
        throw new Error(
          (json as ApiResponse & { message?: string }).message ||
            json.error ||
            "Live audit failed",
        );
      }
      setStageTrace(json.stageTrace || []);
      setReport(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Live audit failed");
    } finally {
      setIsAuditing(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void runLiveAudit();
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-background pb-24 pt-14 text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="float-slow absolute -left-20 top-20 h-80 w-80 rounded-full bg-emerald-500/10 blur-[130px]" />
        <div className="float-slow absolute right-10 top-24 h-72 w-72 rounded-full bg-green-700/15 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-lime-500/10 blur-[130px]" />
      </div>

      <div className="border-b border-emerald-300/10 bg-black/40">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-5">
          <div className="flex h-3 w-3 items-center justify-center">
            <span className="absolute inline-flex h-3 w-3 animate-ping rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success"></span>
          </div>
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-success">
            System Online
          </span>
          <Badge className="hidden border border-emerald-300/20 bg-emerald-500/10 text-emerald-200 sm:inline-flex">
            Core Workspace
          </Badge>
          <span className="ml-auto font-mono text-xs text-muted-foreground">
            Live
          </span>
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-6xl px-6">
        <section className="liquid-glass liquid-highlight mb-8 rounded-2xl p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">
                Audit Modes
              </p>
              <h1 className="text-2xl font-black tracking-tight text-emerald-50">
                Choose Your Analysis Flow
              </h1>
            </div>
            <Badge className="border border-emerald-300/20 bg-black/40 text-emerald-100">
              Live Analysis Only
            </Badge>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <button
              type="button"
              onClick={() => setMode("main")}
              className={`rounded-xl border px-4 py-4 text-left transition ${
                mode === "main"
                  ? "border-emerald-300/35 bg-emerald-500/12"
                  : "border-emerald-300/10 bg-black/40 hover:bg-emerald-900/20"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-200/85 flex items-center gap-2">
                <Gauge className="h-4 w-4" /> Main
              </p>
              <p className="mt-1 text-xl font-bold text-emerald-50">
                Main Audit
              </p>
              <p className="mt-1 text-sm text-emerald-100/70">
                Single-site deep scan with full diagnostics.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setMode("compare")}
              className={`rounded-xl border px-4 py-4 text-left transition ${
                mode === "compare"
                  ? "border-emerald-300/35 bg-emerald-500/12"
                  : "border-emerald-300/10 bg-black/40 hover:bg-emerald-900/20"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-200/85 flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4" />
                Compare
              </p>
              <p className="mt-1 text-xl font-bold text-emerald-50">
                Competitor Compare
              </p>
              <p className="mt-1 text-sm text-emerald-100/70">
                Side-by-side score and metric deltas.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setMode("history")}
              className={`rounded-xl border px-4 py-4 text-left transition ${
                mode === "history"
                  ? "border-emerald-300/35 bg-emerald-500/12"
                  : "border-emerald-300/10 bg-black/40 hover:bg-emerald-900/20"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-200/85 flex items-center gap-2">
                <History className="h-4 w-4" />
                History
              </p>
              <p className="mt-1 text-xl font-bold text-emerald-50">
                Audit History
              </p>
              <p className="mt-1 text-sm text-emerald-100/70">
                Recent saved runs with timestamps.
              </p>
            </button>
          </div>
        </section>

        {mode === "history" && (
          <section className="mb-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {isHistoryLoading ? (
              <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
                Loading history...
              </div>
            ) : history.length > 0 ? (
              <LiveDatabaseHistory records={history} />
            ) : (
              <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
                No audits found yet.
              </div>
            )}
          </section>
        )}

        {mode === "compare" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <ManualCompetitorCompare />
          </div>
        )}

        {mode === "main" && (
          <section className="liquid-glass-soft mb-12 rounded-2xl p-8 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mb-6 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">
                  Core Scan Panel
                </p>
                <h1 className="text-3xl font-black tracking-tight text-emerald-50">
                  New Audit Run
                </h1>
                <p className="mt-1 text-sm text-emerald-100/70">
                  Enter a target URL to begin live extraction and
                  recommendations.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge className="border border-emerald-300/20 bg-black/40 text-emerald-100">
                    UI/UX
                  </Badge>
                  <Badge className="border border-emerald-300/20 bg-black/40 text-emerald-100">
                    SEO
                  </Badge>
                  <Badge className="border border-emerald-300/20 bg-black/40 text-emerald-100">
                    Performance
                  </Badge>
                  <Badge className="border border-emerald-300/20 bg-black/40 text-emerald-100">
                    Accessibility
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center justify-center gap-2 rounded-md border border-emerald-300/20 bg-black/45 px-4 py-2 text-sm text-emerald-100 cursor-pointer transition hover:bg-emerald-800/15">
                  <input
                    type="checkbox"
                    checked={fastMode}
                    onChange={(e) => setFastMode(e.target.checked)}
                    className="accent-foreground h-4 w-4"
                  />
                  Fast Core Validation
                </label>
                <ManualModeToggle
                  manualMode={manualMode}
                  onToggle={setManualMode}
                />
              </div>
            </div>

            <form
              onSubmit={onSubmit}
              className="relative mt-4 flex w-full max-w-5xl flex-col gap-3 sm:flex-row"
            >
              <div className="relative flex-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Search className="h-5 w-5 text-emerald-200/70" />
                </div>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full rounded-xl border border-emerald-300/20 bg-black/50 py-4 pl-12 pr-6 text-lg text-emerald-50 placeholder:text-emerald-100/45 outline-none transition-all focus:border-emerald-300/45 focus:ring-1 focus:ring-emerald-300/35"
                  disabled={isAuditing}
                />
              </div>
              <Button
                size="lg"
                variant="default"
                className="h-auto rounded-xl bg-emerald-300 px-10 text-black hover:bg-emerald-200"
                isLoading={isAuditing}
                disabled={isAuditing}
              >
                Run Live Scan
              </Button>
            </form>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-emerald-100/70">
              <span className="inline-flex items-center gap-1">
                <Wand2 className="h-3.5 w-3.5" /> AI-assisted insights
              </span>
              <span className="inline-flex items-center gap-1">
                <History className="h-3.5 w-3.5" /> Saved to history
              </span>
              <span className="inline-flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" /> Live diagnostics
              </span>
            </div>

            {error && (
              <div className="mt-6 rounded-md border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                {error}{" "}
                {failedStage && (
                  <span className="block mt-1 opacity-70">
                    Stage: {failedStage}
                  </span>
                )}
              </div>
            )}
          </section>
        )}

        {mode === "main" && isAuditing && (
          <LiveScanningAnimation active={stage} />
        )}

        {mode === "main" && report && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {manualMode && (
              <div className="mb-6 flex items-center gap-3 rounded-2xl border border-indigo-500/30 bg-indigo-500/8 px-5 py-4">
                <span className="text-lg">🔬</span>
                <div>
                  <p className="font-bold text-indigo-300">
                    25 Manual Rules + Groq Backup
                  </p>
                  <p className="text-sm text-indigo-200/70">
                    Manual rules caught {report.manualRulesIssues?.length ?? 0}{" "}
                    UX issues Lighthouse missed.
                  </p>
                </div>
              </div>
            )}
            <LiveAuditResults report={report} manualMode={manualMode} />

            {report.deterministic && (
              <div className="mt-8 rounded-xl border border-border bg-card p-6">
                <h3 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
                  <span className="text-blue-500">✨</span> Groq Analysis
                </h3>

                {report.leadGen?.status === "✅ LEAD GEN HEALTHY" ? (
                  <div className="flex flex-wrap items-center gap-3 p-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-500/20 mb-6">
                    <span className="font-bold">
                      ✓ {report.leadGen?.details}
                    </span>
                    <Badge className="ml-auto bg-emerald-500 text-white hover:bg-emerald-600">
                      Lead Score: {report.leadGen?.leadScore}/100
                    </Badge>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 p-4 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-lg border border-yellow-500/20 mb-6">
                    <span className="font-bold">{report.leadGen?.status}</span>
                    <span className="text-sm">
                      {report.leadGen?.issues?.join(", ")}
                    </span>
                  </div>
                )}

                {report.trustData && (
                  <div className="mb-8 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-6">
                    <h2 className="text-xl font-bold tracking-tight text-indigo-400 flex items-center gap-2 mb-4">
                      <span>🛡️</span> Trust Score
                    </h2>
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="flex flex-col items-center justify-center p-6 bg-background rounded-full h-32 w-32 border-4 border-indigo-500 shadow-lg shadow-indigo-500/20">
                        <span className="text-4xl font-black text-foreground">
                          {report.trustData.trustScore}
                        </span>
                        <span className="text-xs font-bold text-muted-foreground">
                          /100
                        </span>
                      </div>
                      <div className="flex-1 space-y-4">
                        <Badge className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 text-sm">
                          {report.trustData.badgeText}
                        </Badge>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {report.trustData.factors.map((f) => (
                            <div
                              key={f}
                              className="bg-background border border-border p-3 rounded-lg text-sm font-medium text-foreground/80 flex items-center justify-center text-center"
                            >
                              {f}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {(report.groqInsights || report.trustData) && (
                  <div className="mt-8 p-6 bg-secondary/30 rounded-xl border border-border relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 rounded-l-xl"></div>
                    <div className="flex items-center gap-3 mb-4">
                      <h3 className="text-lg font-bold">Groq Analysis</h3>
                      <Badge
                        variant="outline"
                        className={
                          report.groqInsights?.sourceMode === "real"
                            ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/10"
                            : "border-amber-500/30 text-amber-500 bg-amber-500/10"
                        }
                      >
                        {report.groqInsights?.sourceMode === "real"
                          ? "Groq Real"
                          : "Groq Fallback"}
                      </Badge>
                    </div>
                    <div className="text-base text-foreground/90 font-medium mb-5">
                      {report.groqInsights?.summary ||
                        `Trust ${report.trustData?.trustScore ?? 0}/100. Manual Mode Active.`}
                    </div>
                    {report.groqInsights?.fallbackReason && (
                      <p className="mb-4 text-xs text-amber-500">
                        Reason: {report.groqInsights.fallbackReason}
                      </p>
                    )}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Recommended Quick Fixes
                      </h4>
                      <ul className="space-y-2 font-medium">
                        {(report.groqInsights?.quickWins &&
                        report.groqInsights.quickWins.length > 0
                          ? report.groqInsights.quickWins
                          : [
                              "No AI quick wins available for this run. Please rerun with AI enrichment enabled.",
                            ]
                        ).map((w, i) => (
                          <li key={i} className="flex gap-2 items-start">
                            <span className="text-green-500 mt-0.5">✓</span>
                            <span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-12">
              <DetailedReport report={report} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
