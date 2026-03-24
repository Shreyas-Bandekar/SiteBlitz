import test from "node:test";
import assert from "node:assert/strict";
import { reconcileInsightsWithEvidence } from "../lib/ai";
import type { AiInsights } from "../lib/ai";

test("AI consistency: high-confidence form evidence prevents missing-form claims", () => {
  const input: AiInsights = {
    ui_ux_score: 78,
    lead_gen_score: 80,
    issues: [
      { type: "lead", severity: "high", fix: "No contact form detected. Add contact form in hero.", roi: "+20%" },
    ],
    quick_wins: [
      { action: "Add contact form popup", effort: "30min" as const, impact: "+12%", priority: 1 },
    ],
    source: "model" as const,
  };

  const output = reconcileInsightsWithEvidence(input, { hasContactForm: true, contactFormConfidence: 92 });
  assert.ok(!/no contact form|add contact form/i.test(output.issues[0].fix));
  assert.ok(!/add contact form/i.test(output.quick_wins[0].action));
});
