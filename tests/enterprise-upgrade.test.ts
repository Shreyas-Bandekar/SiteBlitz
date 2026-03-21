import test from "node:test";
import assert from "node:assert/strict";
import { detectIndustry } from "../lib/industry";
import { extractLiveAnalytics } from "../lib/live-analytics";
import { calculateRealROI } from "../lib/roi";
import { classifyFailedStage, resolveEnrichmentFlags } from "../app/api/audit/route";

test("industry detection confidence gating", () => {
  const html =
    "<html><title>Shop now</title><meta name='description' content='checkout and buy now' /><h1>Add to cart</h1><button>Checkout</button><script type='application/ld+json'>{\"@type\":\"Product\",\"offers\":{}}</script></html>";
  const result = detectIndustry(html);
  assert.equal(result.category, "ecommerce");
  assert.ok(result.confidence >= 75);
});

test("live analytics parser extracts public script signals", () => {
  const analytics = extractLiveAnalytics(`
    <html><head>
      <script>
        const GA_MEASUREMENT_ID = "G-ABCDE1234";
        const monthlyUsers = 12000;
        const avgOrderValue = 2500;
        const conversionRate = 0.024;
      </script>
    </head></html>
  `);

  assert.equal(analytics.ga4Id.value, "G-ABCDE1234");
  assert.equal(analytics.monthlyUsers.value, 12000);
  assert.equal(analytics.avgOrderValue.value, 2500);
  assert.equal(analytics.conversionRate.value, 0.024);
});

test("real ROI is null when required signals are missing", () => {
  const roi = calculateRealROI(
    { uiux: 60, seo: 60, mobile: 60, performance: 60, accessibility: 60, leadConversion: 60, overall: 60 },
    {
      ga4Id: { value: "G-ABCDE1234", confidence: 95, evidence: [] },
      monthlyUsers: { value: null, confidence: 0, evidence: [] },
      avgOrderValue: { value: null, confidence: 0, evidence: [] },
      conversionRate: { value: null, confidence: 0, evidence: [] },
    }
  );

  assert.equal(roi.roi, null);
  assert.ok(typeof roi.reason === "string");
});

test("real ROI is computed from real analytics values", () => {
  const roi = calculateRealROI(
    { uiux: 70, seo: 72, mobile: 68, performance: 64, accessibility: 75, leadConversion: 60, overall: 68 },
    {
      ga4Id: { value: "G-ABCDE1234", confidence: 95, evidence: [] },
      monthlyUsers: { value: 12000, confidence: 80, evidence: [] },
      avgOrderValue: { value: 2800, confidence: 80, evidence: [] },
      conversionRate: { value: 0.023, confidence: 80, evidence: [] },
    }
  );

  assert.ok(roi.roi);
  assert.equal(roi.roi?.currency, "INR");
  assert.ok((roi.roi?.monthlyUplift ?? 0) >= 0);
});

test("failedStage mapping classifies timeout stages", () => {
  assert.equal(classifyFailedStage("lighthouse timed out after 25000ms"), "lighthouse");
  assert.equal(classifyFailedStage("ai stage failed: ai:model not installed"), "ai");
  assert.equal(classifyFailedStage("playwright timed out after 12000ms"), "playwright");
});

test("enrichment flags default to core-only mode", () => {
  const defaults = resolveEnrichmentFlags({});
  assert.equal(defaults.enrichAi, false);
  assert.equal(defaults.enrichCompetitors, false);
  assert.equal(defaults.strictDb, false);
});
