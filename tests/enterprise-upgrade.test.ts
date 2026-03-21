import test from "node:test";
import assert from "node:assert/strict";
import { detectIndustry } from "../lib/industry";
import { getSameIndustryCompetitors } from "../lib/benchmarks";
import { calculateEnterpriseRoi } from "../lib/roi";
import { buildFallbackAiInsights } from "../lib/ai-insights";
import { getCachedReport, setCachedReport } from "../lib/scoring";
import { SAMPLE_REPORT } from "../lib/sample-report";
import type { AuditReport } from "../lib/audit-types";

test("industry detection confidence gating", () => {
  const html =
    "<html><title>Shop now</title><meta name='description' content='checkout and buy now' /><h1>Add to cart</h1><button>Checkout</button><script type='application/ld+json'>{\"@type\":\"Product\",\"offers\":{}}</script></html>";
  const result = detectIndustry(html);
  assert.equal(result.category, "ecommerce");
  assert.ok(result.confidence >= 75);
});

test("same-industry competitor filtering only", () => {
  const res = getSameIndustryCompetitors({
    industry: "ecommerce",
    confidence: 80,
    yourScores: { uiux: 60, seo: 60, mobile: 60, performance: 60, accessibility: 60, leadConversion: 60, overall: 60 },
  });
  assert.ok(res);
  assert.equal(res?.industry, "ecommerce");
  const hidden = getSameIndustryCompetitors({
    industry: "ecommerce",
    confidence: 60,
    yourScores: { uiux: 60, seo: 60, mobile: 60, performance: 60, accessibility: 60, leadConversion: 60, overall: 60 },
  });
  assert.equal(hidden, null);
});

test("ROI INR calculation and confidence visibility", () => {
  const hidden = calculateEnterpriseRoi({ enabled: true, confidence: 60, score: 70 });
  assert.equal(hidden, undefined);
  const visible = calculateEnterpriseRoi({ enabled: true, confidence: 80, score: 70, template: "ecommerce" });
  assert.equal(visible?.currency, "INR");
  assert.ok((visible?.monthlyUplift ?? 0) >= 0);
});

test("short TTL cache stores and returns report", () => {
  const fake = {
    url: "https://a.com",
    scores: { uiux: 1, seo: 1, mobile: 1, performance: 1, accessibility: 1, leadConversion: 1, overall: 1 },
    issues: [],
    recommendations: [],
    detectedIndustry: { category: "other", confidence: 50, matchedSignals: [] },
    competitors: null,
    roi: undefined,
    contentFixes: [],
    trends: [],
    trendsSummary: { deltaPercent: 0, rollingAverage: 0, leadPotentialTrend: 0 },
    aiInsights: buildFallbackAiInsights({
      url: "https://a.com",
      overall: 1,
      recommendations: [],
      issueCount: 0,
    }),
    disclaimers: [],
    summary: "x",
    deterministicNotes: [],
    pipeline: [],
  } as AuditReport;
  setCachedReport("https://a.com", fake);
  assert.equal(getCachedReport("https://a.com")?.url, "https://a.com");
});

test("AI fallback sections are deterministic and complete", () => {
  const ai = buildFallbackAiInsights({
    url: "https://site.test",
    overall: 67,
    issueCount: 4,
    recommendations: [
      { priority: "high", category: "performance", action: "Fix LCP", rationale: "Slow hero render" },
      { priority: "medium", category: "seo", action: "Add title", rationale: "Missing metadata" },
      { priority: "low", category: "uiux", action: "Polish CTA copy", rationale: "Low clarity" },
    ],
  });
  assert.equal(ai.source, "fallback");
  assert.equal(ai.topFixesFirst.length, 3);
  assert.equal(ai.actionPlan30Days.length, 4);
});

test("response schema stability includes enterprise fields", () => {
  assert.ok("detectedIndustry" in SAMPLE_REPORT);
  assert.ok("competitors" in SAMPLE_REPORT);
  assert.ok("contentFixes" in SAMPLE_REPORT);
  assert.ok("trendsSummary" in SAMPLE_REPORT);
  assert.ok("aiInsights" in SAMPLE_REPORT);
  assert.ok(Array.isArray(SAMPLE_REPORT.disclaimers));
});
