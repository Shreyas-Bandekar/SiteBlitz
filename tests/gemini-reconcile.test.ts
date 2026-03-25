import test from "node:test";
import assert from "node:assert/strict";
import { getGeminiInsights } from "../lib/gemini-insights";

test("Contact-form reconciliation blocks contradictory add-form claim", async () => {
  const oldKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const out = await getGeminiInsights(
      {
        issues: [],
        leadGenAnalysis: {
          hasContactForm: true,
          contactFormConfidence: 80,
          contactFormEvidence: ["Static form matched (3/3 key fields)"],
        },
      },
      "https://example.com",
      { trustScore: 88, grade: "B", badgeText: "88% TRUST", factors: [] }
    );
    assert.equal(out.sourceMode, "fallback");
    assert.ok(!out.summary.toLowerCase().includes("no contact form"));
  } finally {
    if (oldKey) process.env.GEMINI_API_KEY = oldKey;
  }
});
