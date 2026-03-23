"use client";

import { ActionRoadmap } from "./ActionRoadmap";
import type { AuditReport } from "../lib/audit-types";
import { LiveDataBadges, IndustryBadge, ROISourceBadge } from "./LiveDataBadges";
import { TrustLevelBadge, TrustScoreCard } from "./TrustIndicators";
import AuditCards from "./AuditCards";
import CircularScore from "./CircularScore";
import LetterGrade from "./LetterGrade";
import PDFReport from "./PDFReport";
import ScoreRadar from "./ScoreRadar";
import ScreenshotCard from "./ScreenshotCard";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { Target, TrendingUp, AlertTriangle } from "lucide-react";

export default function LiveAuditResults({ report }: { report: AuditReport }) {
  const sortedRecommendations = [...(report.recommendations || [])].sort((a, b) => {
    const rank = { high: 3, medium: 2, low: 1 };
    return rank[b.priority] - rank[a.priority];
  });

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
    <div className="mt-8 space-y-8">
      {/* Top Overview Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col items-center justify-between gap-6 p-6 md:flex-row">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 min-w-0 flex-1 w-full md:w-auto text-center sm:text-left">
              <div className="shrink-0">
                <LetterGrade score={report.scores.overall} />
              </div>
              <div className="min-w-0 flex-1 w-full max-w-[280px] sm:max-w-none">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <Target className="h-4 w-4 text-primary shrink-0" />
                  <p className="font-mono text-sm text-muted-foreground truncate">Target URL</p>
                </div>
                <h2 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate" title={report.url}>{report.url}</h2>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 shrink-0 flex-wrap justify-center">
              <CircularScore score={report.scores.overall} />
              <PDFReport
                payload={{
                  url: report.url,
                  scores: report.scores,
                  issues: report.issues,
                  recommendations: report.recommendations,
                  summary: report.summary || report.aiInsights?.issues?.[0]?.fix || "",
                  aiInsights: report.aiInsights as any,
                  detectedIndustry: report.detectedIndustry,
                  competitors: report.competitors?.length
                    ? { topCompetitors: report.competitors.map((c) => ({ name: c.url, overall: c.score })) }
                    : undefined,
                  roi: report.roi || undefined,
                  trendsSummary: report.trendsSummary,
                  pipeline: report.pipeline,
                  overallTrustScore: report.overallTrustScore,
                  trustBreakdown: report.trustBreakdown,
                  roiTrustMeta: report.trustByField?.roi ?? null,
                }}
              />
            </div>
          </CardContent>
        </Card>
        {report.overallTrustScore != null && report.trustBreakdown ? (
          <TrustScoreCard
            overallTrustScore={report.overallTrustScore}
            trustBreakdown={report.trustBreakdown}
            scanBlockedOrDegraded={report.scanBlockedOrDegraded}
          />
        ) : null}
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column: Metrics & Screenshots */}
        <div className="space-y-8 lg:col-span-2">
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-semibold tracking-tight text-foreground">Core Diagnostics</h3>
                {report.trustByField?.deterministic_scores ? (
                  <TrustLevelBadge level={report.trustByField.deterministic_scores.trustLevel} />
                ) : null}
              </div>
              <div className="flex gap-2">
                <Badge variant="destructive">{counts.high} High</Badge>
                <Badge variant="warning">{counts.medium} Med</Badge>
                <Badge variant="success">{counts.low} Low</Badge>
              </div>
            </div>
            <AuditCards scores={report.scores} industryAverageOverall={competitorAvg ?? undefined} />
          </div>

          {report.hasCv && report.cvBreakdown && (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-5 shadow-xl shadow-purple-500/20 transition-all hover:scale-[1.01]">
              <div className="relative z-10 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🖥️</span>
                    <span className="text-sm font-black tracking-widest text-white uppercase drop-shadow-md">Pixel-Perfect CV Analysis</span>
                  </div>
                  <Badge className="bg-white/20 text-white hover:bg-white/30 border-none text-[10px] backdrop-blur-sm">OpenCV Engine</Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { label: 'Contrast', value: report.cvBreakdown.contrast },
                    { label: 'Layout', value: report.cvBreakdown.layout },
                    { label: 'Text', value: report.cvBreakdown.typography },
                    { label: 'Color', value: report.cvBreakdown.color },
                    { label: 'Space', value: report.cvBreakdown.space }
                  ].map((stat) => (
                    <div key={stat.label} className="flex flex-col rounded-lg bg-white/10 p-2 backdrop-blur-md border border-white/10">
                      <span className="text-[10px] font-bold text-white/70 uppercase leading-none mb-1">{stat.label}</span>
                      <span className="text-lg font-black text-white leading-none">{stat.value}<span className="text-[10px] font-normal opacity-50 ml-0.5">pts</span></span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute -left-4 -bottom-4 h-24 w-24 rounded-full bg-pink-500/20 blur-2xl" />
            </div>
          )}

          <ScreenshotCard screenshot={report.screenshot} screenshots={report.screenshots} url={report.url} />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Telemetry Sources</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-4">
              {(report as any).liveDataSources && (
                <LiveDataBadges
                  sources={(report as any).liveDataSources?.filter((s: any) => s)}
                  isLive={(report as any).isLive ?? true}
                />
              )}
              {(report as any).industry && (
                <IndustryBadge
                  category={(report as any).industry.category}
                  confidence={(report as any).industry.confidence}
                  method="content analysis"
                />
              )}
              {(report as any).roiSource && (
                <ROISourceBadge source={(report as any).roiSource} />
              )}
            </CardContent>
          </Card>

          {/* Moved Full Priority List into Left Column to eliminate empty space */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Actionable Roadmap
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sortedRecommendations.length ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {sortedRecommendations.map((item) => (
                    <div key={`${item.category}-${item.action}`} className="flex flex-col rounded-xl border border-border bg-secondary/20 p-4 transition-colors hover:bg-secondary/40">
                      <div className="mb-3 flex items-center justify-between">
                        <Badge variant={item.priority === 'high' ? 'destructive' : item.priority === 'medium' ? 'warning' : 'success'}>
                          {item.priority.toUpperCase()}
                        </Badge>
                        <span className="text-xs font-medium text-muted-foreground">{item.category}</span>
                      </div>
                      <p className="font-semibold text-foreground">{item.action}</p>
                      <p className="mt-2 text-sm text-foreground/70 leading-relaxed flex-1">{item.rationale}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <div className="mb-4 rounded-full bg-success/10 p-3 text-success">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground">Clean Bill of Health!</h3>
                  <p className="text-sm text-muted-foreground">No high-priority recommendations found.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {report.quick_wins?.length ? (
            <Card className="border-success/20 bg-success/5 shadow-lg shadow-success/5">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-success uppercase tracking-widest text-xs">
                  <TrendingUp className="h-4 w-4" />
                  AI Quick Wins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  {report.quick_wins.map((win, idx) => (
                    <div key={idx} className="flex flex-col rounded-xl border border-success/30 bg-background/50 p-4 transition-all hover:border-success/60 shadow-sm">
                      <div className="mb-2 flex items-center justify-between">
                        <Badge variant="success" className="text-[10px] px-1.5 py-0 h-4">{win.effort}</Badge>
                        <span className="text-[9px] font-black text-success uppercase leading-none">{win.impact}</span>
                      </div>
                      <p className="text-sm font-bold text-foreground leading-tight">{win.action}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Right Column: AI Insights, Data Sources, Radar */}
        <div className="space-y-8">
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-medium text-muted-foreground">Score radar</h3>
              {report.trustByField?.deterministic_scores ? (
                <TrustLevelBadge level={report.trustByField.deterministic_scores.trustLevel} />
              ) : null}
            </div>
            <ScoreRadar scores={report.scores} />
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex flex-wrap items-center gap-2 text-lg text-primary">
                <TrendingUp className="h-5 w-5" />
                AI Content Insights
                {report.trustByField?.content_suggestions ? (
                  <TrustLevelBadge level={report.trustByField.content_suggestions.trustLevel} />
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {report.contentFixes?.length ? (
                report.contentFixes.slice(0, 3).map((fix) => (
                  <div key={`${fix.type}-${fix.suggested}`} className="rounded-xl border border-border bg-secondary/30 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <Badge variant="outline" className="text-primary">{fix.type}</Badge>
                      <span className="text-xs text-muted-foreground">{fix.confidence}% conf</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-md border border-destructive/10 bg-destructive/5 p-3">
                        <span className="mb-1 block text-[10px] font-bold tracking-wider text-destructive uppercase">Before</span>
                        <p className="text-xs text-muted-foreground line-through">{fix.current || "Missing"}</p>
                      </div>
                      <div className="rounded-md border border-success/10 bg-success/5 p-3">
                        <span className="mb-1 block text-[10px] font-bold tracking-wider text-success uppercase">After</span>
                        <p className="text-xs font-medium text-foreground">{fix.suggested}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-foreground/60 text-center py-4">No critical content issues detected.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <ActionRoadmap quick_wins={report.quick_wins || []} scores={report.scores} />
    </div>
  );
}
