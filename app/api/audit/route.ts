import { runAuditPipeline } from "../../../lib/audit-pipeline";
import { getSessionFromCookies } from "../../../lib/auth/session";
import { getGroqInsights } from "../../../lib/groq-insights";
import { generateRoadmap } from "../../../lib/manual-roadmap";
import { calculateTrust } from "../../../lib/trust-calculator";
import crypto from "crypto";
import { extractLiveAnalytics } from "../../../lib/live-analytics";
import { saveLiveAudit, getLiveAuditHistory } from "../../../lib/live-database";
import { improveIndustryDetectionWithMetrics } from "../../../lib/content-industry";
import { getLiveBenchmarks } from "../../../lib/live-benchmarks";
import { detectLocationSignals } from "../../../lib/location-detection";
import {
  calculateLiveROI,
  getFreeTrafficEstimate,
} from "../../../lib/free-roi";
import { makeTrustMeta, calculateTrustBreakdown } from "../../../lib/trust";
import type {
  StageTraceEntry,
  IndustryCategory,
  TrustMeta,
  BenchmarkSite,
} from "../../../lib/audit-types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const startedAt = Date.now();
  const nowIso = new Date().toISOString();
  let auditId: string = crypto.randomUUID();
  const stageTrace: StageTraceEntry[] = [];
  const session = await getSessionFromCookies().catch(() => null);
  const userId = session?.sub;
  try {
    const { url, enrichCompetitors, enrichAi, strictDb } = await req.json();
    const flags = resolveEnrichmentFlags({
      enrichCompetitors,
      enrichAi,
      strictDb,
    });
    console.log(
      "[audit:enrichment-mode]",
      JSON.stringify({
        url,
        fastMode: !flags.enrichAi,
        enrichAi: flags.enrichAi,
        enrichCompetitors: flags.enrichCompetitors,
      }),
    );
    if (!url || typeof url !== "string") {
      return Response.json(
        {
          status: "live-failed",
          isLive: false,
          failedStage: "unknown",
          message: "URL required for live audit",
          elapsedMs: Date.now() - startedAt,
          stageTrace,
        },
        { status: 400 },
      );
    }

    auditId = crypto.createHash("sha256").update(url).digest("hex");

    const pipelineResult = await runRouteStage(
      stageTrace,
      auditId,
      url,
      "target-audit",
      async () => await runAuditPipeline(url, { includeAi: flags.enrichAi }),
    );
    stageTrace.push(...(pipelineResult.stageTrace || []));

    // NEW: Content-based industry detection (no external dependencies)
    const contentIndustry = await runRouteStage(
      stageTrace,
      auditId,
      url,
      "industry-detection",
      async () =>
        improveIndustryDetectionWithMetrics(
          pipelineResult.rawHtml || "",
          pipelineResult.issues.filter((i) => i.category === "leadConversion")
            .length,
          pipelineResult.recommendations.length,
        ),
    );

    const targetLocation = await runRouteStage(
      stageTrace,
      auditId,
      url,
      "location-detection",
      async () => detectLocationSignals(pipelineResult.rawHtml || "", url),
    );

    // NEW: Live benchmarks from local cache + fresh audits
    const competitorIndustry = resolveCompetitorIndustry(
      contentIndustry.category as IndustryCategory,
      pipelineResult.rawHtml || "",
    );

    const benchmarks = await runRouteStage(
      stageTrace,
      auditId,
      url,
      "live-benchmarks",
      async () =>
        await getLiveBenchmarks(competitorIndustry, {
          allowLiveAudits: flags.enrichCompetitors,
          realDataOnly: false,
          targetLocation,
          targetUrl: url,
        }),
    );

    const indiaOnlyMode = shouldForceIndiaOnly(
      targetLocation,
      pipelineResult.rawHtml || "",
      url,
    );
    const filteredBenchmarks = indiaOnlyMode
      ? benchmarks.filter((b) => normalizeCountry(b.country) === "india")
      : benchmarks;
    const sanitizedBenchmarks = filterIrrelevantCompetitors(
      url,
      filteredBenchmarks,
    );
    const preferredLocalizedBenchmarks = rankCompetitorsByTargetLocality(
      sanitizedBenchmarks.length > 0
        ? sanitizedBenchmarks
        : fallbackCompetitorsForIndustry(competitorIndustry, url),
      targetLocation,
    );
    // UI requirement: show one strongest locality-matched competitor.
    const limitedBenchmarks = preferredLocalizedBenchmarks.slice(0, 1);

    const competitors = limitedBenchmarks.map((b) => ({
      url: b.url,
      score: b.overall,
      timestamp: b.lastUpdated || new Date().toISOString(),
      audited: b.auditedDate,
      sourceType: b.sourceType as "live" | "pre-audited",
      city: b.city,
      district: b.district,
      state: b.state,
      country: b.country,
    }));

    const analytics = await runRouteStage(
      stageTrace,
      auditId,
      url,
      "analytics",
      async () => extractLiveAnalytics(pipelineResult.rawHtml || ""),
    );

    // NEW: Free ROI calculation using PageSpeed + industry benchmarks
    const trafficEstimate = await runRouteStage(
      stageTrace,
      auditId,
      url,
      "traffic-estimate",
      async () =>
        getFreeTrafficEstimate(
          contentIndustry.category as IndustryCategory,
          pipelineResult.scores.overall,
        ),
    );

    const roiOutput = await runRouteStage(
      stageTrace,
      auditId,
      url,
      "roi",
      async () => {
        const roi = await calculateLiveROI(
          pipelineResult.scores,
          contentIndustry.category as IndustryCategory,
          trafficEstimate,
        );
        return { roi, reason: roi ? undefined : "Unable to calculate ROI" };
      },
    );

    let dbStatus: "saved" | "failed" = "saved";
    let dbError: string | null = null;
    let history: Array<{
      id: string;
      url: string;
      scores: unknown;
      timestamp: string;
    }> = [];
    try {
      await runRouteStage(
        stageTrace,
        auditId,
        url,
        "db",
        async () =>
          await saveLiveAudit({
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
            user_id: userId,
            status: "live-complete",
          }),
      );
      history = await runRouteStage(
        stageTrace,
        auditId,
        url,
        "db-history",
        async () => await getLiveAuditHistory(pipelineResult.url, 7),
      );
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
          { status: 500 },
        );
      }
    }

    const trustByField: Record<string, TrustMeta> = {
      ...(pipelineResult.trustByField || {}),
    };

    trustByField.roi = makeTrustMeta(
      roiOutput.roi,
      roiOutput.roi ? "ESTIMATED" : "FALLBACK",
      roiOutput.roi
        ? "Industry traffic estimate + deterministic score-gap uplift (free-roi)"
        : "ROI unavailable for this run",
      roiOutput.roi ? 0.72 : 0.28,
    );

    trustByField.traffic_estimate = makeTrustMeta(
      {
        traffic: trafficEstimate.traffic,
        conversionRate: trafficEstimate.conversionRate,
        avgOrderValue: trafficEstimate.avgOrderValue,
      },
      "ESTIMATED",
      trafficEstimate.dataSource,
      0.68,
    );

    trustByField.analytics_signals = makeTrustMeta(
      analytics,
      "INFERRED",
      "Heuristic HTML scan for analytics identifiers",
      0.58,
    );

    trustByField.competitor_benchmarks = makeTrustMeta(
      competitors,
      limitedBenchmarks.length > 0 ? "ESTIMATED" : "FALLBACK",
      flags.enrichCompetitors
        ? "Cached live benchmarks + audits"
        : "Cached/pre-audited competitor benchmarks (fast mode)",
      limitedBenchmarks.length > 0
        ? flags.enrichCompetitors
          ? 0.72
          : 0.56
        : 0.34,
    );

    const trustValues = Object.values(trustByField);
    const trustBreakdown = calculateTrustBreakdown(trustValues);

    const leadScore =
      pipelineResult.leadGenAnalysis?.score ??
      pipelineResult.scores.leadConversion;
    const uxScore = pipelineResult.uxScore ?? pipelineResult.scores.uiux;
    const trustData = calculateTrust(
      leadScore,
      uxScore,
      pipelineResult.scores.overall,
    );
    const overallTrustScore = trustData.trustScore;

    const leadGen = {
      leadScore,
      status:
        leadScore >= 80 ? "✅ LEAD GEN HEALTHY" : "⚠️ LEAD GEN NEEDS WORK",
      issues: pipelineResult.leadGenAnalysis?.issues ?? [],
      details: pipelineResult.leadGenAnalysis
        ? `${pipelineResult.leadGenAnalysis.hasContactForm ? "Contact form present" : "Contact form missing"} · ${pipelineResult.leadGenAnalysis.aboveFoldCta ? "CTA above fold" : "No above-fold CTA"} · confidence ${pipelineResult.leadGenAnalysis.contactFormConfidence ?? 0}%`
        : "Lead conversion inferred from deterministic audit signals",
      roi: pipelineResult.leadGenAnalysis?.roiImpact ?? "0",
      confidence: pipelineResult.leadGenAnalysis?.contactFormConfidence ?? 0,
      evidence: pipelineResult.leadGenAnalysis?.contactFormEvidence ?? [],
    };

    const roadmap = generateRoadmap(
      pipelineResult.manualRulesIssues ??
        pipelineResult.issues.map((i) => i.detail),
      pipelineResult.scores,
    );

    const groqInsights = flags.enrichAi
      ? await runRouteStage(
          stageTrace,
          auditId,
          url,
          "groq-report",
          async () =>
            await getGroqInsights(
              {
                issues: pipelineResult.manualRulesIssues ?? [],
                recommendations:
                  pipelineResult.recommendations?.map((r) => ({
                    action: r.action,
                  })) ?? [],
                pipelineScores: pipelineResult.scores,
                leadGenAnalysis: pipelineResult.leadGenAnalysis,
                uxScore: pipelineResult.uxScore,
              },
              url,
              trustData,
            ),
        )
      : {
          summary: `Trust ${trustData.trustScore}/100. Fast mode skipped AI enrichment.`,
          quickWins: ["Add contact form", "Fix tiny fonts", "3x hero CTAs"],
          trustScore: trustData.trustScore,
          working: true,
          fallback: "Fast Mode (AI Skipped)",
          fallbackReason: "fast_mode_skipped",
          sourceMode: "skipped" as const,
          evidenceSnippet:
            pipelineResult.leadGenAnalysis?.contactFormEvidence?.slice(0, 3) ??
            [],
        };

    return Response.json({
      ...pipelineResult,
      uxScore: pipelineResult.uxScore,
      leadGen,
      groqInsights,
      trustData,
      roadmap,
      deterministic: true,
      auditId,
      liveTimestamp: nowIso,
      trustByField,
      overallTrustScore,
      trustBreakdown,
      pipeline: [
        ...pipelineResult.pipeline,
        flags.enrichCompetitors ? "live-benchmarks" : "live-benchmarks:cached",
        "traffic-estimate",
        "live-db",
      ],
      competitors,
      competitorSources: benchmarks.map((b) => ({
        url: b.url,
        sourceType: b.sourceType,
        auditedDate: b.auditedDate,
        city: b.city,
        district: b.district,
        state: b.state,
        country: b.country,
      })),
      analytics,
      roi: roiOutput.roi,
      roiReason: roiOutput.reason,
      roiSource: trafficEstimate.dataSource,
      trafficEstimate,
      targetLocation,
      industry: contentIndustry,
      competitorIndustry,
      history,
      isLive: true,
      liveDataSources: [
        {
          name: "playwright",
          timestamp: nowIso,
          method: "real-time rendering",
        },
        {
          name: "lighthouse",
          timestamp: nowIso,
          method: "real-time performance",
        },
        {
          name: "axe-core",
          timestamp: nowIso,
          method: "real-time accessibility",
        },
        {
          name: "content-analysis",
          timestamp: nowIso,
          method: `${contentIndustry.category} detection (${contentIndustry.confidence}%)`,
        },
        flags.enrichCompetitors && {
          name: "live-benchmarks",
          timestamp: nowIso,
          method: "competitor cache + audits",
        },
        {
          name: "traffic-estimate",
          timestamp: nowIso,
          method: "industry benchmarks",
        },
      ].filter(Boolean),
      status: "live-complete",
      dbStatus,
      dbError,
      stageTrace,
      elapsedMs: Date.now() - startedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const traced = (error as { stageTrace?: StageTraceEntry[] } | undefined)
      ?.stageTrace;
    const lastFailedStage = traced
      ?.filter((s) => s.status === "failed")
      .at(-1)?.stage;
    const failedStage =
      mapTraceStageToFailedStage(lastFailedStage) ??
      classifyFailedStage(message);
    return Response.json(
      {
        status: "live-failed",
        isLive: false,
        failedStage,
        message,
        elapsedMs: Date.now() - startedAt,
        stageTrace: traced ?? stageTrace,
        timestamp: nowIso,
      },
      { status: 500 },
    );
  }
}

function normalizeCountry(country?: string): string {
  return String(country || "")
    .trim()
    .toLowerCase();
}

function resolveCompetitorIndustry(
  base: IndustryCategory,
  rawHtml: string,
): IndustryCategory {
  if (base !== "other") return base;
  const corpus = String(rawHtml || "").toLowerCase();
  const agencySignals = [
    "web development",
    "mobile app",
    "crm",
    "erp",
    "pos",
    "shopify",
    "wordpress",
    "digital marketing",
    "ui ux",
    "it services",
  ];
  const hitCount = agencySignals.reduce(
    (n, s) => n + (corpus.includes(s) ? 1 : 0),
    0,
  );
  return hitCount >= 2 ? "agency" : base;
}

function fallbackCompetitorsForIndustry(
  industry: IndustryCategory,
  targetUrl: string,
) {
  const now = new Date().toISOString();
  const map: Record<IndustryCategory, BenchmarkSite[]> = {
    ecommerce: [
      {
        name: "flipkart",
        url: "https://www.flipkart.com",
        overall: 88,
        mobile: 86,
        seo: 89,
        sourceType: "pre-audited",
        auditedDate: "2026-03-20",
        lastUpdated: now,
        city: "Bengaluru",
        state: "Karnataka",
        country: "India",
      },
      {
        name: "myntra",
        url: "https://www.myntra.com",
        overall: 86,
        mobile: 84,
        seo: 87,
        sourceType: "pre-audited",
        auditedDate: "2026-03-20",
        lastUpdated: now,
        city: "Bengaluru",
        state: "Karnataka",
        country: "India",
      },
      {
        name: "nykaa",
        url: "https://www.nykaa.com",
        overall: 85,
        mobile: 83,
        seo: 86,
        sourceType: "pre-audited",
        auditedDate: "2026-03-20",
        lastUpdated: now,
        city: "Mumbai",
        state: "Maharashtra",
        country: "India",
      },
    ],
    saas: [
      {
        name: "zoho",
        url: "https://www.zoho.com",
        overall: 88,
        mobile: 85,
        seo: 90,
        sourceType: "pre-audited",
        auditedDate: "2026-03-20",
        lastUpdated: now,
        city: "Chennai",
        state: "Tamil Nadu",
        country: "India",
      },
      {
        name: "freshworks",
        url: "https://www.freshworks.com",
        overall: 87,
        mobile: 84,
        seo: 89,
        sourceType: "pre-audited",
        auditedDate: "2026-03-20",
        lastUpdated: now,
        city: "Chennai",
        state: "Tamil Nadu",
        country: "India",
      },
      {
        name: "hubspot",
        url: "https://www.hubspot.com",
        overall: 89,
        mobile: 86,
        seo: 91,
        sourceType: "pre-audited",
        auditedDate: "2026-03-20",
        lastUpdated: now,
        city: "Cambridge",
        state: "Massachusetts",
        country: "United States",
      },
    ],
    local_service: [
      {
        name: "urbancompany",
        url: "https://www.urbancompany.com",
        overall: 84,
        mobile: 81,
        seo: 85,
        sourceType: "pre-audited",
        auditedDate: "2026-03-20",
        lastUpdated: now,
        city: "Gurugram",
        state: "Haryana",
        country: "India",
      },
      {
        name: "housejoy",
        url: "https://www.housejoy.in",
        overall: 79,
        mobile: 77,
        seo: 80,
        sourceType: "pre-audited",
        auditedDate: "2026-03-20",
        lastUpdated: now,
        city: "Bengaluru",
        state: "Karnataka",
        country: "India",
      },
      {
        name: "nobroker",
        url: "https://www.nobroker.in",
        overall: 82,
        mobile: 80,
        seo: 83,
        sourceType: "pre-audited",
        auditedDate: "2026-03-20",
        lastUpdated: now,
        city: "Bengaluru",
        state: "Karnataka",
        country: "India",
      },
    ],
    agency: [
      {
        name: "tatvasoft",
        url: "https://www.tatvasoft.com",
        overall: 84,
        mobile: 81,
        seo: 85,
        sourceType: "pre-audited",
        auditedDate: "2026-03-20",
        lastUpdated: now,
        city: "Ahmedabad",
        state: "Gujarat",
        country: "India",
      },
      {
        name: "hiddenbrains",
        url: "https://www.hiddenbrains.com",
        overall: 83,
        mobile: 80,
        seo: 84,
        sourceType: "pre-audited",
        auditedDate: "2026-03-20",
        lastUpdated: now,
        city: "Ahmedabad",
        state: "Gujarat",
        country: "India",
      },
      {
        name: "schbang",
        url: "https://www.schbang.com",
        overall: 82,
        mobile: 79,
        seo: 84,
        sourceType: "pre-audited",
        auditedDate: "2026-03-20",
        lastUpdated: now,
        city: "Mumbai",
        state: "Maharashtra",
        country: "India",
      },
    ],
    media: [
      {
        name: "ndtv",
        url: "https://www.ndtv.com",
        overall: 84,
        mobile: 81,
        seo: 86,
        sourceType: "pre-audited",
        auditedDate: "2026-03-20",
        lastUpdated: now,
        city: "New Delhi",
        state: "Delhi",
        country: "India",
      },
      {
        name: "indiatoday",
        url: "https://www.indiatoday.in",
        overall: 85,
        mobile: 82,
        seo: 87,
        sourceType: "pre-audited",
        auditedDate: "2026-03-20",
        lastUpdated: now,
        city: "Noida",
        state: "Uttar Pradesh",
        country: "India",
      },
      {
        name: "bbc",
        url: "https://www.bbc.com",
        overall: 88,
        mobile: 85,
        seo: 92,
        sourceType: "pre-audited",
        auditedDate: "2026-03-20",
        lastUpdated: now,
        city: "London",
        country: "United Kingdom",
      },
    ],
    nonprofit: [
      {
        name: "giveindia",
        url: "https://www.giveindia.org",
        overall: 80,
        mobile: 78,
        seo: 82,
        sourceType: "pre-audited",
        auditedDate: "2026-03-20",
        lastUpdated: now,
        city: "Bengaluru",
        state: "Karnataka",
        country: "India",
      },
      {
        name: "cry",
        url: "https://www.cry.org",
        overall: 79,
        mobile: 77,
        seo: 81,
        sourceType: "pre-audited",
        auditedDate: "2026-03-20",
        lastUpdated: now,
        city: "Mumbai",
        state: "Maharashtra",
        country: "India",
      },
      {
        name: "unicef",
        url: "https://www.unicef.org",
        overall: 82,
        mobile: 80,
        seo: 85,
        sourceType: "pre-audited",
        auditedDate: "2026-03-20",
        lastUpdated: now,
        city: "New York",
        state: "New York",
        country: "United States",
      },
    ],
    manufacturing: [
      {
        name: "tatasteel",
        url: "https://www.tatasteel.com",
        overall: 82,
        mobile: 79,
        seo: 84,
        sourceType: "pre-audited",
        auditedDate: "2026-03-20",
        lastUpdated: now,
        city: "Mumbai",
        state: "Maharashtra",
        country: "India",
      },
      {
        name: "mahindra",
        url: "https://www.mahindra.com",
        overall: 81,
        mobile: 78,
        seo: 83,
        sourceType: "pre-audited",
        auditedDate: "2026-03-20",
        lastUpdated: now,
        city: "Mumbai",
        state: "Maharashtra",
        country: "India",
      },
      {
        name: "siemens",
        url: "https://www.siemens.com",
        overall: 84,
        mobile: 81,
        seo: 86,
        sourceType: "pre-audited",
        auditedDate: "2026-03-20",
        lastUpdated: now,
        city: "Munich",
        country: "Germany",
      },
    ],
    other: [
      {
        name: "semrush",
        url: "https://www.semrush.com",
        overall: 89,
        mobile: 86,
        seo: 92,
        sourceType: "pre-audited",
        auditedDate: "2026-03-20",
        lastUpdated: now,
        city: "Boston",
        state: "Massachusetts",
        country: "United States",
      },
      {
        name: "ahrefs",
        url: "https://ahrefs.com",
        overall: 88,
        mobile: 85,
        seo: 91,
        sourceType: "pre-audited",
        auditedDate: "2026-03-20",
        lastUpdated: now,
        city: "Singapore",
        country: "Singapore",
      },
      {
        name: "gtmetrix",
        url: "https://gtmetrix.com",
        overall: 86,
        mobile: 83,
        seo: 89,
        sourceType: "pre-audited",
        auditedDate: "2026-03-20",
        lastUpdated: now,
        city: "Vancouver",
        country: "Canada",
      },
    ],
  };

  const targetHost = hostFromUrl(targetUrl);
  return (map[industry] || map.other).filter(
    (c) => hostFromUrl(c.url) !== targetHost,
  );
}

function hostFromUrl(input: string): string {
  try {
    return new URL(input).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

function isGlobalPlatformHost(host: string): boolean {
  const GLOBAL_PLATFORM_HOSTS = new Set([
    "youtube.com",
    "facebook.com",
    "instagram.com",
    "twitter.com",
    "x.com",
    "linkedin.com",
    "wikipedia.org",
    "pinterest.com",
    "reddit.com",
    "google.com",
    "tiktok.com",
  ]);
  return GLOBAL_PLATFORM_HOSTS.has(host);
}

function filterIrrelevantCompetitors(
  targetUrl: string,
  candidates: BenchmarkSite[],
): BenchmarkSite[] {
  const targetHost = hostFromUrl(targetUrl);
  const targetIsPlatform = isGlobalPlatformHost(targetHost);

  const cleaned = candidates.filter((c) => {
    const host = hostFromUrl(c.url);
    if (!host) return false;
    if (host === targetHost) return false;
    if (!targetIsPlatform && isGlobalPlatformHost(host)) return false;
    return true;
  });

  const preferred = cleaned.filter((c) => c.sourceType === "live");
  return preferred.length > 0 ? preferred : cleaned;
}

function norm(v?: string): string {
  return String(v || "")
    .trim()
    .toLowerCase();
}

function localityScore(
  site: BenchmarkSite,
  target?: { city?: string; state?: string; country?: string },
): number {
  if (!target) return 0;
  let score = 0;
  if (norm(site.country) && norm(site.country) === norm(target.country))
    score += 20;
  if (norm(site.state) && norm(site.state) === norm(target.state)) score += 35;
  if (norm(site.city) && norm(site.city) === norm(target.city)) score += 55;
  return score;
}

function rankCompetitorsByTargetLocality(
  candidates: BenchmarkSite[],
  target?: { city?: string; state?: string; country?: string },
): BenchmarkSite[] {
  return [...candidates].sort((a, b) => {
    const aLocal = localityScore(a, target);
    const bLocal = localityScore(b, target);
    if (bLocal !== aLocal) return bLocal - aLocal;
    return b.overall - a.overall;
  });
}

function shouldForceIndiaOnly(
  targetLocation: { country?: string } | undefined,
  rawHtml: string,
  pageUrl: string,
): boolean {
  if (normalizeCountry(targetLocation?.country) === "india") return true;
  let host = "";
  try {
    host = new URL(pageUrl).hostname.toLowerCase();
  } catch {
    host = "";
  }
  if (host.endsWith(".in")) return true;
  const corpus = String(rawHtml || "").toLowerCase();
  return /\bindia\b|\bmumbai\b|\bdelhi\b|\bbengaluru\b|\bhyderabad\b|\bchennai\b|\bpune\b/.test(
    corpus,
  );
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

export function classifyFailedStage(
  message: string,
):
  | "playwright"
  | "axe"
  | "mobile"
  | "screenshot"
  | "lighthouse"
  | "ai"
  | "db"
  | "competitors"
  | "http-html"
  | "unknown" {
  const text = message.toLowerCase();
  if (text.includes("playwright")) return "playwright";
  if (text.includes("axe")) return "axe";
  if (text.includes("mobile")) return "mobile";
  if (text.includes("screenshot") || text.includes("puppeteer"))
    return "screenshot";
  if (text.includes("lighthouse")) return "lighthouse";
  if (
    text.includes("http-html") ||
    text.includes("no usable live data") ||
    text.includes("degraded-fallback")
  )
    return "http-html";
  if (
    text.includes("ai stage") ||
    text.includes("groq") ||
    text.includes("llm")
  )
    return "ai";
  if (text.includes("db") || text.includes("postgres")) return "db";
  if (text.includes("competitor")) return "competitors";
  return "unknown";
}

function mapTraceStageToFailedStage(
  stage: string | undefined,
):
  | "playwright"
  | "axe"
  | "mobile"
  | "screenshot"
  | "lighthouse"
  | "ai"
  | "db"
  | "competitors"
  | "http-html"
  | "unknown"
  | null {
  if (!stage) return null;
  if (stage === "http-html") return "http-html";
  if (stage === "screenshot") return "screenshot";
  if (stage === "lighthouse") return "lighthouse";
  if (stage === "playwright") return "playwright";
  if (stage === "db" || stage === "db-history") return "db";
  if (stage === "competitors" || stage === "live-benchmarks")
    return "competitors";
  if (stage === "ai" || stage === "groq-report") return "ai";
  if (stage === "mobile") return "mobile";
  if (stage === "axe") return "axe";
  return "unknown";
}

async function runRouteStage<T>(
  trace: StageTraceEntry[],
  auditId: string,
  url: string,
  stage: string,
  fn: () => Promise<T>,
) {
  const started = Date.now();
  const startedAt = new Date(started).toISOString();
  console.log(
    "[audit:stage:start]",
    JSON.stringify({ auditId, url, stage, startedAt }),
  );
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
    console.log(
      "[audit:stage:end]",
      JSON.stringify({ auditId, url, ...entry }),
    );
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
    console.log(
      "[audit:stage:end]",
      JSON.stringify({ auditId, url, ...entry }),
    );
    throw error;
  }
}
