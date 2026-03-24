"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import LiveScanningAnimation from "../../../components/LiveScanningAnimation";
import LiveAuditResults from "../../../components/LiveAuditResults";
import DetailedReport from "../../../components/DetailedReport";
import type { AuditReport } from "../../../lib/audit-types";
import { Search, Loader2 } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { ManualModeToggle } from "../../../components/ManualAuditPanel";

type ApiResponse = AuditReport & { error?: string; elapsedMs?: number };

export default function AuditPage() {
  const [url, setUrl] = useState("");
  const [report, setReport] = useState<AuditReport | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [stage, setStage] = useState(0);
  const [nowText, setNowText] = useState("--");
  const [error, setError] = useState("");
  const [failedStage, setFailedStage] = useState("");
  const [stageTrace, setStageTrace] = useState<Array<{ stage: string; status: string }>>([]);
  const [fastMode, setFastMode] = useState(true);
  const [manualMode, setManualMode] = useState(false);
  const autoStartedRef = useRef(false);

  useEffect(() => {
    if (autoStartedRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const source = params.get("url") || "";
    if (source) setUrl(source);
    if (source && params.get("autoStart") === "1") {
      autoStartedRef.current = true;
      void runLiveAudit(source);
    }
  }, []);

  useEffect(() => {
    if (!isAuditing) return;
    const timer = setInterval(() => setStage((prev) => (prev + 1) % 8), 700);
    return () => clearInterval(timer);
  }, [isAuditing]);

  useEffect(() => {
    const updateNow = () => setNowText(new Date().toLocaleString());
    updateNow();
    const timer = setInterval(updateNow, 1000);
    return () => clearInterval(timer);
  }, []);

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
          enrichCompetitors: !fastMode,
          enrichAi: !fastMode,
          strictDb: false,
        }),
      });
      const json = (await response.json()) as ApiResponse;
      if (!response.ok || json.error) {
        setStageTrace((json as any).stageTrace || []);
        setFailedStage((json as any).failedStage || "unknown");
        throw new Error((json as any).message || json.error || "Live audit failed");
      }
      setStageTrace((json as any).stageTrace || []);
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
    <main className="min-h-screen bg-background text-foreground pb-24 pt-14">
      {/* Top Navigation Bar */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-4">
          <div className="flex h-3 w-3 items-center justify-center">
            <span className="absolute inline-flex h-3 w-3 animate-ping rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success"></span>
          </div>
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-success">
            System Online
          </span>
          <span className="ml-auto font-mono text-xs text-muted-foreground">{nowText}</span>
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-6xl px-6">
        <section className="mb-12 rounded-xl border border-border bg-card p-8 shadow-sm">
          <div className="text-center md:text-left md:flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">New Audit Run</h1>
              <p className="mt-1 text-sm text-muted-foreground">Enter a target URL to begin live data extraction.</p>
            </div>
            
            <div className="mt-4 md:mt-0 flex flex-wrap items-center gap-2">
              <label className="flex items-center justify-center gap-2 text-sm text-foreground bg-secondary px-4 py-2 rounded-md border border-border cursor-pointer hover:bg-secondary/80 transition">
                <input type="checkbox" checked={fastMode} onChange={(e) => setFastMode(e.target.checked)} className="accent-foreground h-4 w-4" />
                Fast Core Validation
              </label>
              <ManualModeToggle manualMode={manualMode} onToggle={setManualMode} />
            </div>
          </div>

          <form onSubmit={onSubmit} className="relative mt-6 flex w-full max-w-4xl flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full rounded-lg border border-border bg-background py-4 pl-12 pr-6 text-lg text-foreground placeholder:text-muted-foreground outline-none transition-all focus:border-foreground focus:ring-1 focus:ring-foreground"
                disabled={isAuditing}
              />
            </div>
            <Button size="lg" variant="default" className="h-auto px-10" isLoading={isAuditing} disabled={isAuditing}>
              Run Live Scan
            </Button>
          </form>

          {error && <div className="mt-6 rounded-md border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">{error} {failedStage && <span className="block mt-1 opacity-70">Stage: {failedStage}</span>}</div>}
        </section>

        {isAuditing && <LiveScanningAnimation active={stage} />}
        
        {report && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {manualMode && (
              <div className="mb-6 flex items-center gap-3 rounded-2xl border border-indigo-500/30 bg-indigo-500/8 px-5 py-4">
                <span className="text-lg">🔬</span>
                <div>
                  <p className="font-bold text-indigo-300">Advanced Lighthouse + 25 Manual Rules</p>
                  <p className="text-sm text-indigo-200/70">Manual rules caught {report.manualRulesIssues?.length ?? 0} UX issues Lighthouse missed.</p>
                </div>
              </div>
            )}
            <LiveAuditResults report={report} manualMode={manualMode} />
            <div className="mt-12">
              <DetailedReport report={report} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
