import { runAuditPipeline } from "../../../lib/audit-pipeline";
import { detectIndustry } from "../../../lib/industry";
import { extractLiveAnalytics } from "../../../lib/live-analytics";
import { calculateRealROI } from "../../../lib/roi";
import { saveLiveAudit, getLiveAuditHistory } from "../../../lib/live-database";
import { runLiveCompetitorAudits } from "../../../lib/live-competitors";
import type { StageTraceEntry } from "../../../lib/audit-types";

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

    const industry = await runRouteStage(stageTrace, auditId, url, "industry-detection", async () =>
      detectIndustry(pipelineResult.rawHtml || "")
    );
    const competitors = flags.enrichCompetitors
      ? await runRouteStage(stageTrace, auditId, url, "competitors", async () =>
        await runLiveCompetitorAudits({
          industry: industry.category,
          maxConcurrency: 1,
          trace: stageTrace,
          runAudit: async (targetUrl) => await runAuditPipeline(targetUrl, { includeAi: false }),
        })
      )
      : [];

    const analytics = await runRouteStage(stageTrace, auditId, url, "analytics", async () =>
      extractLiveAnalytics(pipelineResult.rawHtml || "")
    );
    const roiOutput = await runRouteStage(stageTrace, auditId, url, "roi", async () =>
      calculateRealROI(pipelineResult.scores, analytics)
    );

    let dbStatus: "saved" | "failed" = "saved";
    let dbError: string | null = null;
    let history: Array<{ id: string; url: string; scores: unknown; timestamp: string }> = [];
    try {
      await runRouteStage(stageTrace, auditId, url, "db", async () => await saveLiveAudit({
        id: auditId,
        url: pipelineResult.url,
        industry: industry.category,
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

    return Response.json({
      ...pipelineResult,
      auditId,
      liveTimestamp: nowIso,
      pipeline: [...pipelineResult.pipeline, enrichCompetitors ? "live-competitors" : "competitors:skipped", "live-db"],
      competitors,
      analytics,
      roi: roiOutput.roi,
      roiReason: roiOutput.reason,
      history,
      isLive: true,
      status: "live-complete",
      dbStatus,
      dbError,
      stageTrace,
      elapsedMs: Date.now() - startedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const failedStage = classifyFailedStage(message);
    const traced = (error as { stageTrace?: StageTraceEntry[] } | undefined)?.stageTrace;
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

export function classifyFailedStage(message: string): "playwright" | "axe" | "mobile" | "screenshot" | "lighthouse" | "ai" | "db" | "competitors" | "unknown" {
  const text = message.toLowerCase();
  if (text.includes("playwright")) return "playwright";
  if (text.includes("axe")) return "axe";
  if (text.includes("mobile")) return "mobile";
  if (text.includes("screenshot") || text.includes("puppeteer")) return "screenshot";
  if (text.includes("lighthouse")) return "lighthouse";
  if (text.includes("ai stage")) return "ai";
  if (text.includes("db") || text.includes("postgres")) return "db";
  if (text.includes("competitor")) return "competitors";
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
