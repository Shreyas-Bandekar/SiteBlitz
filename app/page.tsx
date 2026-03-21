"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import AuditCards from "../components/AuditCards";
import CompetitorComparison from "../components/CompetitorComparison";
import ContentSuggestions from "../components/ContentSuggestions";
import CircularScore from "../components/CircularScore";
import EnhancedIssues from "../components/EnhancedIssues";
import LetterGrade from "../components/LetterGrade";
import PDFReport from "../components/PDFReport";
import ROICalculator from "../components/ROICalculator";
import SEOBreakdownTable from "../components/SEOBreakdownTable";
import SERPPreviewCard from "../components/SERPPreviewCard";
import ScreenshotGallery from "../components/ScreenshotGallery";
import VoiceInput from "../components/VoiceInput";
import { SAMPLE_REPORT } from "../lib/sample-report";

const TrendsChart = dynamic(() => import("../components/TrendsChart"), { ssr: false });
const ScoreRadar = dynamic(() => import("../components/ScoreRadar"), { ssr: false });

type AuditResponse = {
  url: string;
  scores: {
    uiux: number;
    performance: number;
    mobile: number;
    accessibility: number;
    seo: number;
    leadConversion: number;
    overall: number;
  };
  issues: Array<{ category: string; title: string; detail: string; severity: "high" | "medium" | "low" }>;
  recommendations: Array<{ priority: "high" | "medium" | "low"; category: string; action: string; rationale: string }>;
  detectedIndustry: { category: string; confidence: number; matchedSignals: string[] };
  competitors: {
    industry: string;
    topCompetitors: Array<{
      name: string;
      url: string;
      overall: number;
      mobile: number;
      seo: number;
      auditedDate: string;
      sourceType: string;
      lastUpdated: string;
    }>;
    industryAverageRange: { min: number; max: number };
    topFixesToBeat: string[];
    disclaimer?: string;
  } | null;
  roi?: {
    traffic: number;
    conversionRate: number;
    avgOrderValue: number;
    currency: "INR";
    currentRevenue: number;
    projectedRevenue: number;
    monthlyUplift: number;
    upliftPercent: number;
    template: "ecommerce" | "saas" | "local_service" | "custom";
  };
  contentFixes: Array<{
    type: "title" | "metaDescription" | "h1";
    current: string;
    suggested: string;
    reason: string;
    confidence: number;
    guidelineBullets: string[];
  }>;
  trends: Array<{ date: string; overall: number }>;
  trendsSummary: { deltaPercent: number; rollingAverage: number; leadPotentialTrend: number };
  aiInsights: {
    executiveSummary: string;
    topFixesFirst: Array<{ priority: "high" | "medium" | "low"; fix: string; reason: string; expectedImpact: string }>;
    businessImpactNarrative: string;
    actionPlan30Days: Array<{ week: string; focus: string; outcome: string }>;
    source: "model" | "fallback";
  };
  disclaimers: string[];
  summary: string;
  deterministicNotes: string[];
  pipeline: string[];
  elapsedMs?: number;
  screenshot?: string;
  screenshots?: { desktop?: string; mobile?: string };
  seoDetails?: { titleLength: number; metaLength: number; h1Count: number; wordCount: number; altMissing: number };
  serpPreview?: { title: string; description: string; url: string };
  error?: string;
};

const loadingSteps = [
  "Running rendered desktop checks",
  "Running mobile usability checks",
  "Running accessibility scanner (axe-core)",
  "Running Lighthouse categories",
  "Assembling deterministic scores",
  "Generating executive summary",
];

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState("");
  const [auditsHistory, setAuditsHistory] = useState<Array<{ date: string; overall: number }>>([]);
  const [roiEnabled, setRoiEnabled] = useState(true);
  const [roiTemplate, setRoiTemplate] = useState<"ecommerce" | "saas" | "local_service" | "custom">("custom");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("siteblitz:audit-history");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Array<{ date: string; overall: number }>;
      if (Array.isArray(parsed)) setAuditsHistory(parsed);
    } catch {
      // ignore malformed local storage data
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("url");
    if (fromQuery) setUrl(fromQuery);
  }, []);

  useEffect(() => {
    if (!loading) return;
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % loadingSteps.length);
    }, 650);
    return () => clearInterval(timer);
  }, [loading]);

  const shareLink = useMemo(() => {
    if (typeof window === "undefined" || !data?.url) return "";
    const current = new URL(window.location.href);
    current.searchParams.set("url", data.url);
    return current.toString();
  }, [data?.url]);

  const runAudit = async (input?: string) => {
    const target = (input ?? url).trim();
    if (!target) return;

    setError("");
    setLoading(true);
    setData(null);
    setActiveStep(0);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target, roiEnabled, roiTemplate }),
      });
      const json = (await res.json()) as AuditResponse;
      if (!res.ok || json.error) throw new Error(json.error || "Audit failed");
      setData(json);
      const nextHistory = [...auditsHistory, { date: new Date().toISOString(), overall: json.scores.overall }].slice(-30);
      setAuditsHistory(nextHistory);
      localStorage.setItem("siteblitz:audit-history", JSON.stringify(nextHistory));
      if (json.scores.overall >= 80) {
        document.body.classList.add("confetti-pop");
        setTimeout(() => document.body.classList.remove("confetti-pop"), 900);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceCommand = (raw: string) => {
    const cleaned = raw.replace(/audit\s+/i, "").trim();
    if (!cleaned) return;
    setUrl(cleaned);
    void runAudit(cleaned);
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      <section className="glass rounded-3xl border border-white/20 bg-gradient-to-br from-white/15 to-white/5 p-6 shadow-2xl backdrop-blur-xl md:p-8">
        <h1 className="mb-2 text-4xl font-black tracking-tight md:text-5xl">AI Website Auditor 🚀</h1>
        <p className="mb-6 max-w-2xl text-slate-200">
          Free, instant website scoring for judges: UI/UX, performance, mobile, accessibility, SEO, and lead generation.
        </p>

        <div className="flex flex-col gap-6 md:flex-row">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter URL: example.com"
            className="glass w-full rounded-xl border border-white/35 px-4 py-3 text-white placeholder:text-slate-300 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void runAudit()}
            disabled={loading}
            className="rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-3 font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-70"
          >
            {loading ? "Auditing..." : "Audit Now"}
          </button>
          <label className="flex items-center gap-2 text-xs text-slate-200">
            <input type="checkbox" checked={roiEnabled} onChange={(e) => setRoiEnabled(e.target.checked)} />
            Enable ROI (INR)
          </label>
          <select
            value={roiTemplate}
            onChange={(e) => setRoiTemplate(e.target.value as "ecommerce" | "saas" | "local_service" | "custom")}
            className="rounded-xl border border-white/35 bg-black/20 px-3 py-2 text-sm text-white"
          >
            <option value="ecommerce">ecommerce</option>
            <option value="saas">saas</option>
            <option value="local_service">local_service</option>
            <option value="custom">custom</option>
          </select>
          <VoiceInput onTranscript={handleVoiceCommand} />
          <button
            type="button"
            onClick={() => {
              setError("");
              setLoading(false);
              setData({ ...SAMPLE_REPORT, elapsedMs: 0 });
            }}
            className="rounded-xl border border-amber-200/60 bg-amber-100/10 px-4 py-2 text-sm font-semibold text-amber-100"
          >
            Load Cached Sample Report
          </button>
        </div>
        {error ? <p className="mt-3 text-sm text-rose-200">{error}</p> : null}
      </section>

      {loading ? (
        <section className="mt-8 grid gap-6">
          {loadingSteps.map((step, i) => {
            const done = i <= activeStep;
            return (
              <div key={step} className="glass rounded-xl border border-white/20 bg-gradient-to-br from-white/15 to-white/5 p-3 backdrop-blur-xl transition-transform hover:scale-105">
                <div className="mb-1 flex justify-between text-sm">
                  <span>{step}</span>
                  <span>{done ? "Done" : "..."}</span>
                </div>
                <div className="h-2 rounded-full bg-white/10">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-cyan-300 to-violet-400 transition-all duration-500"
                    style={{ width: done ? "100%" : "20%" }}
                  />
                </div>
              </div>
            );
          })}
        </section>
      ) : null}

      {data ? (
        <section className="mt-8 space-y-6">
          <TrendsChart history={auditsHistory} rollingAverage={data.trendsSummary.rollingAverage} />
          <div className="glass rounded-2xl border border-white/20 bg-gradient-to-br from-white/15 to-white/5 p-5 backdrop-blur-xl">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-cyan-100">Audit target: {data.url}</p>
              <CircularScore score={data.scores.overall} />
            </div>
            <p className="mt-2 text-sm text-slate-200">
              Pipeline: {data.pipeline.join(" -> ")} {data.elapsedMs ? `(${data.elapsedMs}ms)` : ""}
            </p>
          </div>

          <LetterGrade score={data.scores.overall} />
          <ScreenshotGallery url={data.url} screenshots={data.screenshots ?? { desktop: data.screenshot }} />
          <AuditCards scores={data.scores} industryAverageOverall={data.competitors ? data.competitors.industryAverageRange.max : undefined} />
          <ScoreRadar scores={data.scores} />
          <SEOBreakdownTable details={data.seoDetails} />
          <SERPPreviewCard preview={data.serpPreview} />
          <EnhancedIssues issues={data.issues} />

          <article className="glass rounded-2xl border border-white/20 bg-gradient-to-br from-white/15 to-white/5 p-5 backdrop-blur-xl">
            <h2 className="mb-2 text-xl font-bold">Industry Detection</h2>
            <p className="text-sm text-slate-100">
              {data.detectedIndustry.category} ({data.detectedIndustry.confidence}% confidence)
            </p>
            <p className="mt-2 text-xs text-slate-300">Signals: {data.detectedIndustry.matchedSignals.join(", ")}</p>
          </article>
          {data.competitors ? <CompetitorComparison yourScore={data.scores.overall} data={data.competitors} /> : null}
          {data.roi ? <ROICalculator revenue={data.roi} /> : null}
          <div className="grid gap-6 lg:grid-cols-2">
            <article className="glass rounded-2xl border border-white/20 bg-gradient-to-br from-white/15 to-white/5 p-5 backdrop-blur-xl transition-transform hover:scale-105">
              <h2 className="mb-3 text-xl font-bold">Top Issues</h2>
              <ul className="space-y-2 text-sm text-slate-100">
                {data.issues.map((issue) => (
                  <li key={`${issue.category}-${issue.title}`}>
                    - [{issue.severity.toUpperCase()}] {issue.title}: {issue.detail}
                  </li>
                ))}
              </ul>
            </article>
            <article className="glass rounded-2xl border border-white/20 bg-gradient-to-br from-white/15 to-white/5 p-5 backdrop-blur-xl transition-transform hover:scale-105">
              <h2 className="mb-3 text-xl font-bold">Prioritized Recommendations</h2>
              <ul className="space-y-2 text-sm text-slate-100">
                {data.recommendations.map((fix) => (
                  <li key={`${fix.category}-${fix.action}`}>
                    - [{fix.priority.toUpperCase()}] {fix.action}: {fix.rationale}
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <ContentSuggestions
            suggestions={data.contentFixes}
            warning={data.detectedIndustry.confidence < 75 ? "Industry confidence is low; showing safe generic suggestions." : undefined}
          />

          <article className="glass rounded-2xl border border-white/20 bg-gradient-to-br from-white/15 to-white/5 p-5 backdrop-blur-xl transition-transform hover:scale-105">
            <h2 className="mb-2 text-xl font-bold">AI Insights</h2>
            <ul className="space-y-1 text-sm text-slate-100">
              <li>- {data.aiInsights.executiveSummary}</li>
              <li>- Business impact: {data.aiInsights.businessImpactNarrative}</li>
            </ul>
            <h3 className="mb-2 mt-4 text-base font-semibold text-slate-100">Top 3 Fixes First</h3>
            <ul className="space-y-1 text-sm text-slate-100">
              {data.aiInsights.topFixesFirst.map((fix, idx) => (
                <li key={`${fix.fix}-${idx}`}>- [{fix.priority.toUpperCase()}] {fix.fix} - {fix.expectedImpact}</li>
              ))}
            </ul>
            <h3 className="mb-2 mt-4 text-base font-semibold text-slate-100">30-Day Action Plan</h3>
            <ul className="space-y-1 text-sm text-slate-100">
              {data.aiInsights.actionPlan30Days.map((step) => (
                <li key={step.week}>- {step.week}: {step.focus} ({step.outcome})</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-cyan-100">Insight source: {data.aiInsights.source}</p>
            <h3 className="mb-2 mt-4 text-base font-semibold text-slate-100">Deterministic Notes</h3>
            <ul className="space-y-1 text-sm text-slate-100">
              {data.deterministicNotes.map((note) => (
                <li key={note}>- {note}</li>
              ))}
            </ul>
          </article>

          <article className="glass rounded-2xl border border-white/20 bg-gradient-to-br from-white/15 to-white/5 p-5 backdrop-blur-xl transition-transform hover:scale-105">
            <h2 className="mb-2 text-xl font-bold">Deterministic Disclaimers</h2>
            <ul className="space-y-1 text-sm text-slate-100">
              {data.disclaimers.map((d) => (
                <li key={d}>- {d}</li>
              ))}
            </ul>
          </article>

          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <PDFReport payload={data} />
            {shareLink ? (
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(shareLink)}
                className="rounded-xl border border-cyan-200/70 bg-cyan-200/10 px-4 py-2 text-sm font-semibold text-cyan-100"
              >
                Copy Shareable Link
              </button>
            ) : null}
          </div>
        </section>
      ) : null}
    </main>
  );
}
