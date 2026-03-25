import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeInsights } from "../lib/ai";

test("Sanitizer replaces ecommerce terms for agency sites", () => {
  const mockInsights = {
    ui_ux_score: 80,
    lead_gen_score: 70,
    issues: [
      { type: "ux", severity: "high", fix: "Improve your ecommerce checkout", roi: "Better results for your store" }
    ],
    quick_wins: [
      { action: "Optimize the cart experience", effort: "30min", impact: "+10%", priority: 1 }
    ],
    source: "model"
  };

  const sanitized = sanitizeInsights(mockInsights as any, "agency");
  
  assert.ok(!sanitized.issues[0].fix.toLowerCase().includes("ecommerce"));
  assert.ok(!sanitized.issues[0].fix.toLowerCase().includes("checkout"));
  assert.ok(sanitized.issues[0].fix.toLowerCase().includes("lead capture"));
  assert.ok(sanitized.quick_wins[0].action.toLowerCase().includes("contact form"));
});

test("Sanitizer preserves ecommerce terms for ecommerce sites", () => {
  const mockInsights = {
    ui_ux_score: 80,
    lead_gen_score: 70,
    issues: [
      { type: "ux", severity: "high", fix: "Improve your ecommerce checkout", roi: "Better results for your store" }
    ],
    quick_wins: [
      { action: "Optimize the cart experience", effort: "30min", impact: "+10%", priority: 1 }
    ],
    source: "model"
  };

  const preserved = sanitizeInsights(mockInsights as any, "ecommerce");
  
  assert.ok(preserved.issues[0].fix.toLowerCase().includes("ecommerce"));
  assert.ok(preserved.issues[0].fix.toLowerCase().includes("checkout"));
});
