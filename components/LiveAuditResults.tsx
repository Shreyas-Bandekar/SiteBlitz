"use client";

import type { AuditReport } from "../lib/audit-types";
import { LiveDataBadges, IndustryBadge, ROISourceBadge } from "./LiveDataBadges";
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
      <Card>
        <CardContent className="flex flex-col items-center justify-between gap-6 p-6 md:flex-row">
          <div className="flex items-center gap-6">
            <LetterGrade score={report.scores.overall} />
            <div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <p className="font-mono text-sm text-muted-foreground">Target URL</p>
              </div>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground">{report.url}</h2>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <CircularScore score={report.scores.overall} />
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
        </CardContent>
      </Card>

      {/* Main Dashboard Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column: Metrics & Screenshots */}
        <div className="space-y-8 lg:col-span-2">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold tracking-tight text-foreground">Core Diagnostics</h3>
              <div className="flex gap-2">
                <Badge variant="destructive">{counts.high} High</Badge>
                <Badge variant="warning">{counts.medium} Med</Badge>
                <Badge variant="success">{counts.low} Low</Badge>
              </div>
            </div>
            <AuditCards scores={report.scores} industryAverageOverall={competitorAvg ?? undefined} />
          </div>

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
        </div>

        {/* Right Column: AI Insights, Data Sources, Radar */}
        <div className="space-y-8">
          <ScoreRadar scores={report.scores} />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg text-primary">
                <TrendingUp className="h-5 w-5" />
                AI Content Insights
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
    </div>
  );
}
