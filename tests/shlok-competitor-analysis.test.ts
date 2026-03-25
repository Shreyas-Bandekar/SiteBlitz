import test from "node:test";
import assert from "node:assert/strict";
import { formatShlokCompetitorResponse } from "../lib/shlok-competitor-analysis";

const competitors = [
  {
    name: "Alpha Digital",
    url: "https://alpha.example",
    overall: 82,
    mobile: 80,
    seo: 84,
    auditedDate: "2026-03-01T00:00:00.000Z",
    sourceType: "pre-audited" as const,
    lastUpdated: "2026-03-01T00:00:00.000Z",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
  },
  {
    name: "Beta Labs",
    url: "https://beta.example",
    overall: 75,
    mobile: 72,
    seo: 79,
    auditedDate: "2026-03-01T00:00:00.000Z",
    sourceType: "live" as const,
    lastUpdated: "2026-03-01T00:00:00.000Z",
    city: "Pune",
    state: "Maharashtra",
    country: "India",
  },
];

test("Shlok competitor response returns categorized analysis and markdown", () => {
  const out = formatShlokCompetitorResponse(
    "https://acme.example",
    { city: "Mumbai", state: "Maharashtra", country: "India", confidence: 90, matchedSignals: [] },
    "agency",
    competitors,
    "<html><body>Digital marketing for startups and SMEs</body></html>"
  );

  assert.equal(out.company.type, "agency");
  assert.ok(out.analysis.competitorCategories.length >= 1);
  assert.ok(out.markdown.includes("Competitor Analysis"));
  assert.ok(out.analysis.analysisNotes.includes("Competition intensity"));
});
