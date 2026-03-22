"use client";

import type { AuditReport } from "../lib/audit-types";
import { LiveDataBadges, IndustryBadge, ROISourceBadge } from "./LiveDataBadges";
import AuditCards from "./AuditCards";
import CircularScore from "./CircularScore";
import LetterGrade from "./LetterGrade";
import PDFReport from "./PDFReport";
import ScoreRadar from "./ScoreRadar";
import ScreenshotCard from "./ScreenshotCard";

export default function LiveAuditResults({ report }: { report: AuditReport }) {
  const sortedRecommendations = [...(report.recommendations || [])].sort((a, b) => {
    const rank = { high: 3, medium: 2, low: 1 };
    return rank[b.priority] - rank[a.priority];
  });

  const priorityBadge = (priority: "high" | "medium" | "low") => {
    if (priority === "high") return "bg-rose-400/20 text-rose-100 border-rose-300/40";
    if (priority === "medium") return "bg-amber-400/20 text-amber-100 border-amber-300/40";
    return "bg-emerald-400/20 text-emerald-100 border-emerald-300/40";
  };

  const counts = sortedRecommendations.reduce(
    (acc, rec) => {
      acc[rec.priority] += 1;
      return acc;
    },
    { high: 0, medium: 0, low: 0 }
  );

  const competitorAvg =
    report.competitors?.length
      ? Math.round(report.competitors.reduce((sum, c) => sum + c.score, 0) / report.competitors.length)
      : null;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <LetterGrade score={report.scores.overall} />
            <div>
            <p className="text-sm text-white/60">Target</p>
            <h2 className="text-xl font-semibold text-white">{report.url}</h2>
            </div>
          </div>
          <CircularScore score={report.scores.overall} />
        </div>
        <div className="mt-4 flex items-center justify-end">
          <PDFReport
            payload={{
              url: report.url,
              scores: report.scores,
              issues: report.issues,
              recommendations: report.recommendations,
              summary: report.summary || report.aiInsights?.executiveSummary || "",
              aiInsights: report.aiInsights,
              detectedIndustry: report.detectedIndustry,
              roi: report.roi || undefined,
              trendsSummary: report.trendsSummary,
              pipeline: report.pipeline,
            }}
          />
        </div>
      </div>

      {/* Live Data Badges */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <h3 className="mb-4 text-sm font-semibold text-white/80">LIVE DATA SOURCES</h3>
        <div className="space-y-3">
          {/* Live data sources badges */}
          {(report as any).liveDataSources && (
            <LiveDataBadges
              sources={(report as any).liveDataSources?.filter((s: any) => s)}
              isLive={(report as any).isLive ?? true}
            />
          )}

          {/* Industry detection badge */}
          {(report as any).industry && (
            <div className="mt-3">
              <IndustryBadge
                category={(report as any).industry.category}
                confidence={(report as any).industry.confidence}
                method="content analysis"
              />
            </div>
          )}

          {/* ROI source badge */}
          {(report as any).roiSource && (
            <div className="mt-3">
              <ROISourceBadge source={(report as any).roiSource} />
            </div>
          )}
        </div>
      </div>

      <ScreenshotCard screenshot={report.screenshot} screenshots={report.screenshots} url={report.url} />

      <AuditCards scores={report.scores} industryAverageOverall={competitorAvg ?? undefined} />
      <ScoreRadar scores={report.scores} />

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <h3 className="mb-3 text-lg font-semibold text-white">Recommendation Priority Heatmap</h3>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-rose-300/40 bg-rose-400/20 px-3 py-1 text-xs font-semibold text-rose-100">High: {counts.high}</span>
          <span className="rounded-full border border-amber-300/40 bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-100">Medium: {counts.medium}</span>
          <span className="rounded-full border border-emerald-300/40 bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-100">Low: {counts.low}</span>
        </div>
        {competitorAvg !== null ? (
          <div className="mt-4 space-y-2 text-sm text-white/80">
            <p>Your score vs competitor average</p>
            <div className="h-3 rounded-full bg-white/10">
              <div className="h-3 rounded-full bg-gradient-to-r from-cyan-400 to-violet-400" style={{ width: `${report.scores.overall}%` }} />
            </div>
            <div className="h-3 rounded-full bg-white/10">
              <div className="h-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-400" style={{ width: `${competitorAvg}%` }} />
            </div>
            <p className="text-xs text-white/60">
              You: {report.scores.overall} | Competitor avg: {competitorAvg} | Delta: {report.scores.overall - competitorAvg}
            </p>
          </div>
        ) : null}
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <h3 className="mb-4 text-lg font-semibold text-white">Prioritized Improvements</h3>
        {sortedRecommendations.length ? (
          <ul className="space-y-3">
            {sortedRecommendations.map((item) => (
              <li key={`${item.category}-${item.action}`} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${priorityBadge(item.priority)}`}>
                    {item.priority.toUpperCase()}
                  </span>
                  <span className="text-xs text-white/60">{item.category}</span>
                </div>
                <p className="font-medium text-white">{item.action}</p>
                <p className="mt-1 text-sm text-white/75">{item.rationale}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-white/60">No prioritized improvements available for this audit.</p>
        )}
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <h3 className="mb-4 text-lg font-semibold text-white">Suggested Content Improvements</h3>
        {report.contentFixes?.length ? (
          <ul className="space-y-3">
            {report.contentFixes.map((fix) => (
              <li key={`${fix.type}-${fix.suggested}`} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="rounded-full border border-cyan-300/40 bg-cyan-400/20 px-2 py-1 text-xs font-semibold text-cyan-100">
                    {fix.type}
                  </span>
                  <span className="text-xs text-white/60">Confidence: {fix.confidence}%</span>
                </div>
                <p className="text-sm text-white/70">Current: {fix.current || "Missing"}</p>
                <p className="mt-1 text-sm font-medium text-emerald-100">Suggested: {fix.suggested}</p>
                <p className="mt-1 text-sm text-white/75">{fix.reason}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-white/60">No content improvement suggestions available.</p>
        )}
      </div>

    </div>
  );
}
