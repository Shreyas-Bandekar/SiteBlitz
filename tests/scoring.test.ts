import test from "node:test";
import assert from "node:assert/strict";
import { computeScores, prioritizeRecommendations } from "../lib/scoring";
import type { Issue } from "../lib/audit-types";

test("computeScores returns bounded deterministic values", () => {
  const scores = computeScores({
    lighthousePerformance: 83,
    lighthouseSeo: 76,
    lighthouseAccessibility: 88,
    hasViewport: true,
    mobileTapTargetsOk: true,
    h1Count: 1,
    titlePresent: true,
    metaDescriptionPresent: true,
    formCount: 1,
    ctaCount: 3,
  });

  assert.equal(typeof scores.overall, "number");
  assert.ok(scores.overall >= 0 && scores.overall <= 100);
  assert.ok(scores.seo >= 0 && scores.seo <= 100);
  assert.ok(scores.performance >= 0 && scores.performance <= 100);
});

test("prioritizeRecommendations maps issue severity to priority", () => {
  const issues: Issue[] = [
    { category: "seo", title: "Missing title", detail: "No title", severity: "high" },
    { category: "mobile", title: "No viewport", detail: "Missing viewport", severity: "medium" },
  ];

  const recs = prioritizeRecommendations(issues);
  assert.equal(recs.length, 2);
  assert.equal(recs[0].priority, "high");
  assert.equal(recs[1].priority, "medium");
});
