"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import LiveScanningAnimation from "../../../components/LiveScanningAnimation";
import LiveAuditResults from "../../../components/LiveAuditResults";
import DetailedReport from "../../../components/DetailedReport";
import type { AuditReport } from "../../../lib/audit-types";

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
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      <div className="live-header">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
          <div className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
          <span className="font-mono text-sm text-red-200">LIVE SCANNING ACTIVE</span>
          <span className="ml-auto font-mono text-sm text-white/70">{nowText}</span>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-12">
        <section className="mb-10 rounded-3xl border border-white/10 bg-white/5 p-10 text-center backdrop-blur-xl">
          <h1 className="text-4xl font-bold text-white">Live URL Audit</h1>
          <form onSubmit={onSubmit} className="mx-auto mt-6 flex max-w-3xl flex-col gap-3 sm:flex-row">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://yourwebsite.com"
              className="w-full rounded-2xl border border-white/20 bg-white/10 px-6 py-4 text-lg text-white placeholder:text-white/60 outline-none"
            />
            <button className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-8 py-4 text-lg font-bold text-white">
              RUN LIVE AUDIT
            </button>
          </form>
          <label className="mt-3 inline-flex items-center gap-2 text-sm text-white/80">
            <input type="checkbox" checked={fastMode} onChange={(e) => setFastMode(e.target.checked)} />
            Fast mode (core only)
          </label>
          <p className="mt-4 text-sm font-mono text-white/60">No cached data - No fallbacks - Real Playwright, Lighthouse, axe-core</p>
          {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
          {failedStage ? <p className="mt-1 text-xs text-rose-200">Failed stage: {failedStage}</p> : null}
          {stageTrace.length ? (
            <p className="mt-1 text-xs text-white/60">
              Trace: {stageTrace.map((s) => `${s.stage}:${s.status}`).join(" -> ")}
            </p>
          ) : null}
        </section>

        {isAuditing ? <LiveScanningAnimation active={stage} /> : null}
        {report ? <LiveAuditResults report={report} /> : null}
        {report ? <DetailedReport report={report} /> : null}
      </div>
    </main>
  );
}
