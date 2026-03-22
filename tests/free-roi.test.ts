import test from "node:test";
import assert from "node:assert/strict";
import { getFreeTrafficEstimate, calculateLiveROI } from "../lib/free-roi";

test("getFreeTrafficEstimate is deterministic for same industry and score", async () => {
  const a = await getFreeTrafficEstimate("saas", 72);
  const b = await getFreeTrafficEstimate("saas", 72);
  assert.deepEqual(a, b);
});

test("calculateLiveROI is deterministic for same inputs", async () => {
  const t = await getFreeTrafficEstimate("ecommerce", 80);
  const r1 = await calculateLiveROI({ overall: 65 }, "ecommerce", t);
  const r2 = await calculateLiveROI({ overall: 65 }, "ecommerce", t);
  assert.deepEqual(r1, r2);
});
