import { NextRequest, NextResponse } from "next/server";
import { runAuditPipeline } from "../../../../lib/audit-pipeline";
import { getLiveBenchmarks } from "../../../../lib/live-benchmarks";
import { detectIndustry } from "../../../../lib/industry";
import type { IndustryCategory, BenchmarkSite } from "../../../../lib/audit-types";
import { formatShlokCompetitorResponse } from "../../../../lib/shlok-competitor-analysis";
import {
  detectShlokLocationSignals,
  type ShlokLocationSignals,
} from "../../../../lib/shlok-location-detection";

export const runtime = "nodejs";

type GeoBenchmarkSite = BenchmarkSite & {
  city?: string;
  district?: string;
  state?: string;
  country?: string;
};

export async function POST(request: NextRequest) {
  try {
    const {
      url,
      industry: manualIndustry,
      includeMarkdown = true,
      allowLiveAudits = true,
    } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Missing or invalid 'url' parameter" }, { status: 400 });
    }

    const audit = await runAuditPipeline(url, { includeAi: false });
    if (!audit) {
      return NextResponse.json({ error: "Failed to analyze target URL" }, { status: 400 });
    }

    const rawHtml = String(audit.rawHtml || "");
    const targetLocation: ShlokLocationSignals = detectShlokLocationSignals(rawHtml, url);
    const detectedIndustry = detectIndustry(rawHtml).category;
    const industry = (manualIndustry || detectedIndustry || "other") as IndustryCategory;

    // Keep request compatibility while reusing existing SiteBlitz benchmark source.
    void allowLiveAudits;
    const competitors = (await getLiveBenchmarks(industry)) as GeoBenchmarkSite[];

    const indiaOnlyMode = shouldForceIndiaOnly(targetLocation, rawHtml, url);
    const filteredCompetitors = indiaOnlyMode
      ? competitors.filter((c) => normalizeCountry(c.country) === "india")
      : competitors;
    const singleCompetitor = filteredCompetitors.slice(0, 1);

    const analysisResponse = formatShlokCompetitorResponse(
      url,
      targetLocation,
      industry,
      singleCompetitor,
      rawHtml
    );

    const response: {
      success: boolean;
      targetUrl: string;
      targetLocation: ShlokLocationSignals;
      industry: IndustryCategory;
      company: unknown;
      competitors: {
        total: number;
        byCategory: Array<{
          category: string;
          count: number;
          competitors: GeoBenchmarkSite[];
          rationale: string;
        }>;
      };
      analysis: string;
      markdown?: string;
    } = {
      success: true,
      targetUrl: url,
      targetLocation,
      industry,
      company: analysisResponse.company,
      competitors: {
        total: singleCompetitor.length,
        byCategory: analysisResponse.analysis.competitorCategories.map((cat) => ({
          category: cat.name,
          count: cat.competitors.length,
          competitors: cat.competitors,
          rationale: cat.rationale,
        })),
      },
      analysis: analysisResponse.analysis.analysisNotes,
    };

    if (includeMarkdown) {
      response.markdown = analysisResponse.markdown;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Shlok competitor analysis error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate Shlok competitor analysis",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

function normalizeCountry(country?: string): string {
  return String(country || "").trim().toLowerCase();
}

function shouldForceIndiaOnly(
  targetLocation: { country?: string } | undefined,
  rawHtml: string,
  pageUrl: string
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
  return /\bindia\b|\bmumbai\b|\bdelhi\b|\bbengaluru\b|\bhyderabad\b|\bchennai\b|\bpune\b/.test(corpus);
}
