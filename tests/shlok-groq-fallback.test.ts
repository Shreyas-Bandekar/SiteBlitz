import test from "node:test";
import assert from "node:assert/strict";
import { getShlokGroqInsights } from "../lib/shlok-groq-insights";

test("Shlok Groq fallback: missing key returns stable fallback schema", async () => {
  const oldKey = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;

  try {
    const out = await getShlokGroqInsights(
      { issues: ["No visible CTA"] },
      "https://example.com",
      { trustScore: 78, grade: "B", badgeText: "78% TRUST", factors: [] }
    );

    assert.equal(out.working, true);
    assert.equal(out.sourceMode, "fallback");
    assert.equal(typeof out.summary, "string");
    assert.ok(Array.isArray(out.quickWins));
    assert.ok(out.quickWins.length > 0);
  } finally {
    if (oldKey) process.env.GROQ_API_KEY = oldKey;
  }
});
