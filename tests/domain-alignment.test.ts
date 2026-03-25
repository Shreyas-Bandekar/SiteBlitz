import test from "node:test";
import assert from "node:assert/strict";
import { prepareAuditData } from "../lib/ai-data";

test("Agency title correctly classifies as agency", () => {
  const data = prepareAuditData({
    url: "https://hertzsoft.com",
    html: "<html><title>Hertzsoft Technologies | Web & Mobile App Development Company in Mumbai</title></html>",
    lighthouse: { performance: 0.8, seo: 0.9, accessibility: 0.9 }
  });
  assert.equal(data.url_type, "agency");
  assert.ok(data.title.includes("Hertzsoft"));
});

test("Ecommerce signals correctly classify as ecommerce", () => {
  const data = prepareAuditData({
    url: "https://mystore.com",
    html: "<html><title>Best Shopping Site</title><body>Our ecommerce shop has a great cart and checkout page.</body></html>",
    lighthouse: { performance: 0.7, seo: 0.8, accessibility: 0.8 }
  });
  assert.equal(data.url_type, "ecommerce");
});

test("Local service signals correctly classify as local_service", () => {
  const data = prepareAuditData({
    url: "https://mumbaicarpenter.com",
    html: "<html><title>Top Carpenter in Mumbai | Repairs & Services</title></html>",
    lighthouse: { performance: 0.6, seo: 0.7, accessibility: 0.7 }
  });
  assert.equal(data.url_type, "local_service");
});
