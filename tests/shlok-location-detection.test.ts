import test from "node:test";
import assert from "node:assert/strict";
import { detectShlokLocationSignals } from "../lib/shlok-location-detection";

test("Shlok location detection extracts geo meta and country", () => {
  const html = `
    <html>
      <head>
        <meta name="geo.placename" content="Mumbai, Maharashtra, India" />
      </head>
      <body>Contact us</body>
    </html>
  `;

  const out = detectShlokLocationSignals(html, "https://example.in");

  assert.equal(out.city, "Mumbai");
  assert.equal(out.state, "Maharashtra");
  assert.equal(out.country, "India");
  assert.ok(out.confidence >= 70);
  assert.ok(out.matchedSignals.includes("meta-geo-placename"));
});
