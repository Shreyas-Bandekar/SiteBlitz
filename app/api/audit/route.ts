import { runAuditPipeline } from "../../../lib/audit-pipeline";
import { detectIndustry } from "../../../lib/industry";
import { extractLiveAnalytics } from "../../../lib/live-analytics";
import { calculateRealROI } from "../../../lib/roi";
import { saveLiveAudit, getLiveAuditHistory } from "../../../lib/live-database";
import { runLiveCompetitorAudits } from "../../../lib/live-competitors";
import { detectIndustryFromContent, improveIndustryDetectionWithMetrics } from "../../../lib/content-industry";
import { getLiveBenchmarks } from "../../../lib/live-benchmarks";
import { calculateLiveROI, getFreeTrafficEstimate } from "../../../lib/free-roi";
import { makeTrustMeta, calculateOverallTrustScore, calculateTrustBreakdown } from "../../../lib/trust";
import type { StageTraceEntry, IndustryCategory, TrustMeta } from "../../../lib/audit-types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const startedAt = Date.now();
  const nowIso = new Date().toISOString();
  const auditId = crypto.randomUUID();
  const stageTrace: StageTraceEntry[] = [];
  try {
    const { url, enrichCompetitors, enrichAi, strictDb } = await req.json();
    const flags = resolveEnrichmentFlags({ enrichCompetitors, enrichAi, strictDb });
    if (!url || typeof url !== "string") {
      return Response.json({ status: "live-failed", isLive: false, failedStage: "unknown", message: "URL required for live audit", elapsedMs: Date.now() - startedAt, stageTrace }, { status: 400 });
    }

    const pipelineResult = await runRouteStage(stageTrace, auditId, url, "target-audit", async () =>
      await runAuditPipeline(url, { includeAi: flags.enrichAi })
    );
    stageTrace.push(...(pipelineResult.stageTrace || []));

    // NEW: Content-based industry detection (no external dependencies)
    const contentIndustry = await runRouteStage(stageTrace, auditId, url, "industry-detection", async () =>
      improveIndustryDetectionWithMetrics(
        pipelineResult.rawHtml || "",
        pipelineResult.issues.filter(i => i.category === "leadConversion").length,
        pipelineResult.recommendations.length
      )
    );

    // NEW: Live benchmarks from local cache + fresh audits
    const benchmarks = flags.enrichCompetitors
      ? await runRouteStage(stageTrace, auditId, url, "live-benchmarks", async () =>
          await getLiveBenchmarks(contentIndustry.category as IndustryCategory)
        )
      : [];

    const competitors = benchmarks.map(b => ({
      url: b.url,
      score: b.overall,
      audited: b.auditedDate,
      sourceType: b.sourceType as "live" | "pre-audited"
    }));

    const analytics = await runRouteStage(stageTrace, auditId, url, "analytics", async () =>
      extractLiveAnalytics(pipelineResult.rawHtml || "")
    );

    // NEW: Free ROI calculation using PageSpeed + industry benchmarks
    const trafficEstimate = await runRouteStage(stageTrace, auditId, url, "traffic-estimate", async () =>
      getFreeTrafficEstimate(contentIndustry.category as IndustryCategory, pipelineResult.scores.overall)
    );

    const roiOutput = await runRouteStage(stageTrace, auditId, url, "roi", async () => {
      const roi = await calculateLiveROI(
        pipelineResult.scores,
        contentIndustry.category as IndustryCategory,
        trafficEstimate
      );
      return { roi, reason: roi ? undefined : "Unable to calculate ROI" };
    });

    let dbStatus: "saved" | "failed" = "saved";
    let dbError: string | null = null;
    let history: Array<{ id: string; url: string; scores: unknown; timestamp: string }> = [];
    try {
      await runRouteStage(stageTrace, auditId, url, "db", async () => await saveLiveAudit({
        id: auditId,
        url: pipelineResult.url,
        industry: contentIndustry.category,
        scores: pipelineResult.scores,
        issues: pipelineResult.issues,
        recommendations: pipelineResult.recommendations,
        competitors,
        analytics,
        roi: roiOutput.roi,
        pipeline: pipelineResult.pipeline,
        status: "live-complete",
      }));
      history = await runRouteStage(stageTrace, auditId, url, "db-history", async () => await getLiveAuditHistory(pipelineResult.url, 7));
    } catch (error) {
      dbStatus = "failed";
      dbError = error instanceof Error ? error.message : "db error";
      stageTrace.push({
        stage: "db",
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        durationMs: 0,
        status: "failed",
        error: dbError,
      });
      if (flags.strictDb) {
        return Response.json(
          {
            status: "live-failed",
            isLive: false,
            failedStage: "db",
            message: dbError,
            elapsedMs: Date.now() - startedAt,
            stageTrace,
          },
          { status: 500 }
        );
      }
    }

    const trustByField: Record<string, TrustMeta> = { ...(pipelineResult.trustByField || {}) };

    trustByField.roi = makeTrustMeta(
      roiOutput.roi,
      roiOutput.roi ? "ESTIMATED" : "FALLBACK",
      roiOutput.roi
        ? "Industry traffic estimate + deterministic score-gap uplift (free-roi)"
        : "ROI unavailable for this run",
      roiOutput.roi ? 0.72 : 0.28
    );

    trustByField.traffic_estimate = makeTrustMeta(
      {
        traffic: trafficEstimate.traffic,
        conversionRate: trafficEstimate.conversionRate,
        avgOrderValue: trafficEstimate.avgOrderValue,
      },
      "ESTIMATED",
      trafficEstimate.dataSource,
      0.68
    );

    trustByField.analytics_signals = makeTrustMeta(analytics, "INFERRED", "Heuristic HTML scan for analytics identifiers", 0.58);

    trustByField.competitor_benchmarks = makeTrustMeta(
      competitors,
      flags.enrichCompetitors && benchmarks.length > 0 ? "ESTIMATED" : "FALLBACK",
      flags.enrichCompetitors ? "Cached live benchmarks + audits" : "Competitor enrichment not requested (fast mode)",
      flags.enrichCompetitors && benchmarks.length > 0 ? 0.72 : 0.34
    );

    const trustValues = Object.values(trustByField);
    const overallTrustScore = calculateOverallTrustScore(trustValues);
    const trustBreakdown = calculateTrustBreakdown(trustValues);

    return Response.json({
      ...pipelineResult,
      auditId,
      liveTimestamp: nowIso,
      trustByField,
      overallTrustScore,
      trustBreakdown,
      pipeline: [...pipelineResult.pipeline, flags.enrichCompetitors ? "live-benchmarks" : "live-benchmarks:skipped", "traffic-estimate", "live-db"],
      competitors,
      competitorSources: benchmarks.map(b => ({
        url: b.url,
        sourceType: b.sourceType,
        auditedDate: b.auditedDate
      })),
      analytics,
      roi: roiOutput.roi,
      roiReason: roiOutput.reason,
      roiSource: trafficEstimate.dataSource,
      trafficEstimate,
      industry: contentIndustry,
      history,
      isLive: true,
      liveDataSources: [
        { name: "playwright", timestamp: nowIso, method: "real-time rendering" },
        { name: "lighthouse", timestamp: nowIso, method: "real-time performance" },
        { name: "axe-core", timestamp: nowIso, method: "real-time accessibility" },
        { name: "content-analysis", timestamp: nowIso, method: `${contentIndustry.category} detection (${contentIndustry.confidence}%)` },
        flags.enrichCompetitors && { name: "live-benchmarks", timestamp: nowIso, method: "competitor cache + audits" },
        { name: "traffic-estimate", timestamp: nowIso, method: "industry benchmarks" }
      ].filter(Boolean),
      status: "live-complete",
      dbStatus,
      dbError,
      stageTrace,
      elapsedMs: Date.now() - startedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const traced = (error as { stageTrace?: StageTraceEntry[] } | undefined)?.stageTrace;
    const lastFailedStage = traced?.filter((s) => s.status === "failed").at(-1)?.stage;
    const failedStage = mapTraceStageToFailedStage(lastFailedStage) ?? classifyFailedStage(message);
    return Response.json({
      status: "live-failed",
      isLive: false,
      failedStage,
      message,
      elapsedMs: Date.now() - startedAt,
      stageTrace: traced ?? stageTrace,
      timestamp: nowIso,
    }, { status: 500 });
  }
}

export function resolveEnrichmentFlags(input: {
  enrichCompetitors?: unknown;
  enrichAi?: unknown;
  strictDb?: unknown;
}) {
  return {
    enrichCompetitors: Boolean(input.enrichCompetitors ?? false),
    enrichAi: Boolean(input.enrichAi ?? false),
    strictDb: Boolean(input.strictDb ?? false),
  };
}

export function classifyFailedStage(message: string): "playwright" | "axe" | "mobile" | "screenshot" | "lighthouse" | "ai" | "db" | "competitors" | "http-html" | "unknown" {
  const text = message.toLowerCase();
  if (text.includes("playwright")) return "playwright";
  if (text.includes("axe")) return "axe";
  if (text.includes("mobile")) return "mobile";
  if (text.includes("screenshot") || text.includes("puppeteer")) return "screenshot";
  if (text.includes("lighthouse")) return "lighthouse";
  if (text.includes("http-html") || text.includes("no usable live data") || text.includes("degraded-fallback")) return "http-html";
  if (text.includes("ai stage")) return "ai";
  if (text.includes("db") || text.includes("postgres")) return "db";
  if (text.includes("competitor")) return "competitors";
  return "unknown";
}

function mapTraceStageToFailedStage(stage: string | undefined): "playwright" | "axe" | "mobile" | "screenshot" | "lighthouse" | "ai" | "db" | "competitors" | "http-html" | "unknown" | null {
  if (!stage) return null;
  if (stage === "http-html") return "http-html";
  if (stage === "screenshot") return "screenshot";
  if (stage === "lighthouse") return "lighthouse";
  if (stage === "playwright") return "playwright";
  if (stage === "db" || stage === "db-history") return "db";
  if (stage === "competitors" || stage === "live-benchmarks") return "competitors";
  if (stage === "ai") return "ai";
  if (stage === "mobile") return "mobile";
  if (stage === "axe") return "axe";
  return "unknown";
}

async function runRouteStage<T>(
  trace: StageTraceEntry[],
  auditId: string,
  url: string,
  stage: string,
  fn: () => Promise<T>
) {
  const started = Date.now();
  const startedAt = new Date(started).toISOString();
  console.log("[audit:stage:start]", JSON.stringify({ auditId, url, stage, startedAt }));
  try {
    const result = await fn();
    const ended = Date.now();
    const entry: StageTraceEntry = {
      stage,
      startedAt,
      endedAt: new Date(ended).toISOString(),
      durationMs: ended - started,
      status: "ok",
    };
    trace.push(entry);
    console.log("[audit:stage:end]", JSON.stringify({ auditId, url, ...entry }));
    return result;
  } catch (error) {
    const ended = Date.now();
    const entry: StageTraceEntry = {
      stage,
      startedAt,
      endedAt: new Date(ended).toISOString(),
      durationMs: ended - started,
      status: "failed",
      error: error instanceof Error ? error.message : "unknown",
    };
    trace.push(entry);
    console.log("[audit:stage:end]", JSON.stringify({ auditId, url, ...entry }));
    throw error;
  }
}
