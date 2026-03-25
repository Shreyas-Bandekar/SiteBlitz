import test from "node:test";
import assert from "node:assert/strict";
import { extractQuickWins } from "../lib/gemini-insights";

test("Gemini success parser returns non-generic site-specific quick wins shape", () => {
  const text = `
  Executive Summary: Homepage has strong SEO but form CTA visibility is weak.
  - Move "Book Demo" CTA above fold on services hero
  - Reduce contact form fields from 7 to 4 for higher completion
  - Add trust logos near submit button to improve conversion
  `;
  const wins = extractQuickWins(text);
  assert.equal(wins.length, 3);
  assert.ok(wins.some((w) => w.toLowerCase().includes("book demo")));
  assert.ok(!wins.includes("Fix 1"));
});
