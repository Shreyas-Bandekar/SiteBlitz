import test from "node:test";
import assert from "node:assert/strict";
import { getGeminiInsights } from "../lib/gemini-insights";

test("Gemini fallback: missing keys returns explicit renderable fallback schema", async () => {
  const oldGroqKey = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;
  try {
    const result = await getGeminiInsights(
      { issues: ["No CTA", "No contact form"] },
      "https://example.com",
      { trustScore: 85, grade: "B", badgeText: "85% TRUST", factors: [] }
    );
    assert.equal(typeof result.summary, "string");
    assert.ok(result.summary.length > 0);
    assert.ok(Array.isArray(result.quickWins));
    assert.equal(result.working, true);
    assert.ok(typeof result.fallbackReason === "string");
    assert.equal(result.sourceMode, "fallback");
  } finally {
    if (oldGroqKey) process.env.GROQ_API_KEY = oldGroqKey;
  }
});
