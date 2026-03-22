import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateOverallTrustScore,
  calculateTrustBreakdown,
  makeTrustMeta,
  clampTrustConfidence,
} from "../lib/trust";
import type { TrustMeta } from "../lib/audit-types";

test("clampTrustConfidence enforces per-level bands", () => {
  assert.equal(clampTrustConfidence("VERIFIED", 0.5), 0.9);
  assert.equal(clampTrustConfidence("VERIFIED", 1), 1);
  assert.equal(clampTrustConfidence("FALLBACK", 0.99), 0.4);
  assert.equal(clampTrustConfidence("ESTIMATED", 0.5), 0.6);
});

test("trust breakdown percentages sum to 100", () => {
  const items: TrustMeta[] = [
    makeTrustMeta({}, "VERIFIED", "a", 0.95),
    makeTrustMeta({}, "ESTIMATED", "b", 0.7),
    makeTrustMeta({}, "INFERRED", "c", 0.6),
    makeTrustMeta({}, "FALLBACK", "d", 0.3),
  ];
  const b = calculateTrustBreakdown(items);
  const sum = b.verified + b.estimated + b.inferred + b.fallback;
  assert.equal(sum, 100);
});

test("calculateOverallTrustScore is stable for identical inputs", () => {
  const items = [makeTrustMeta(1, "VERIFIED", "x", 0.95), makeTrustMeta(2, "ESTIMATED", "y", 0.72)];
  assert.equal(calculateOverallTrustScore(items), calculateOverallTrustScore(items));
  assert.ok(calculateOverallTrustScore(items) >= 0 && calculateOverallTrustScore(items) <= 100);
});
