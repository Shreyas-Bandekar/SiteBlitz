import test from "node:test";
import assert from "node:assert/strict";
import { detectContactFormEvidence } from "../lib/leadgen";

test("form detection: static contact form present", async () => {
  const html = `
    <html><body>
      <form id="contact">
        <input type="text" name="name" />
        <input type="email" name="email" />
        <textarea name="message"></textarea>
        <button type="submit">Send</button>
      </form>
    </body></html>
  `;
  const result = await detectContactFormEvidence(html);
  assert.equal(result.hasContactForm, true);
  assert.ok(result.confidence >= 70);
  assert.ok(result.evidence.some((e) => /static form matched/i.test(e)));
});

test("form detection: dynamic form appears after delay", async () => {
  let calls = 0;
  const page = {
    waitForTimeout: async (_ms: number) => {},
    evaluate: async () => {
      calls += 1;
      if (calls < 2) return { matchedForms: 0, iframeWidgetMatches: 0, modalTriggerMatches: 1 };
      return { matchedForms: 1, iframeWidgetMatches: 0, modalTriggerMatches: 1 };
    },
    frames: () => [],
  };
  const result = await detectContactFormEvidence("<html><body><div id='app'></div></body></html>", page as any);
  assert.equal(result.hasContactForm, true);
  assert.ok(result.dynamicFormMatches >= 1);
});

test("form detection: no form case", async () => {
  const html = "<html><body><h1>Landing Page</h1><p>No form here.</p></body></html>";
  const result = await detectContactFormEvidence(html);
  assert.equal(result.hasContactForm, false);
  assert.ok(result.confidence <= 40);
});
