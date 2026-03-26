import { NextRequest, NextResponse } from "next/server";
import { getLiveBenchmarks } from "../../../lib/live-benchmarks";
import { detectLocationSignals } from "../../../lib/location-detection";
import { runAuditPipeline } from "../../../lib/audit-pipeline";
import { formatCompetitorResponse } from "../../../lib/competitor-analysis";
import { detectIndustry } from "../../../lib/industry";
import type { IndustryCategory } from "../../../lib/audit-types";

/**
 * POST /api/competitor-analysis
 * Analyzes a website's competitive landscape based on location and industry
 *
 * Body:
 * {
 *   url: string,          // URL to analyze
 *   industry?: string,    // Manually override industry detection
 *   includeMarkdown?: boolean // Include formatted markdown analysis
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { url, industry: manualIndustry, includeMarkdown = true, allowLiveAudits = true } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Missing or invalid 'url' parameter" }, { status: 400 });
    }

    // Step 1: Run quick audit to get page HTML and metadata
    const audit: any = await runAuditPipeline(url, {
      includeAi: false,
    });

    if (!audit) {
      return NextResponse.json({ error: "Failed to analyze target URL" }, { status: 400 });
    }

    // Step 2: Detect location from page content
    const rawHtml = String(audit.rawHtml || audit.htmlRaw || "");
    const targetLocation = audit.targetLocation || detectLocationSignals(rawHtml, url);

    // Step 3: Determine industry
    const detectedIndustry = detectIndustry(rawHtml).category;
    const industry = (manualIndustry || audit.industry || detectedIndustry || "other") as IndustryCategory;

    // Step 4: Get competitors with location context
    const competitors = await getLiveBenchmarks(industry, {
      allowLiveAudits: Boolean(allowLiveAudits),
      realDataOnly: true,
      targetLocation,
      targetUrl: url,
    });

    const indiaOnlyMode = shouldForceIndiaOnly(targetLocation, rawHtml, url);
    const filteredCompetitors = indiaOnlyMode
      ? competitors.filter((c) => normalizeCountry(c.country) === "india")
      : competitors;
    const singleCompetitor = filteredCompetitors.slice(0, 1);

    // Step 5: Generate analysis response
    const analysisResponse = formatCompetitorResponse(url, targetLocation, industry, singleCompetitor, rawHtml);

    const response: any = {
      success: true,
      targetUrl: url,
      targetLocation: {
        city: targetLocation?.city,
        district: targetLocation?.district,
        state: targetLocation?.state,
        country: targetLocation?.country,
        confidence: targetLocation?.confidence || 0,
      },
      industry,
      company: analysisResponse.company,
      competitors: {
        total: singleCompetitor.length,
        byCategory: analysisResponse.analysis.competitorCategories.map((cat: any) => ({
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
    console.error("Competitor analysis error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate competitor analysis",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

function normalizeCountry(country?: string): string {
  return String(country || "").trim().toLowerCase();
}

function shouldForceIndiaOnly(targetLocation: { country?: string } | undefined, rawHtml: string, pageUrl: string): boolean {
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
