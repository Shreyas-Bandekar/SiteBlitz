import test from "node:test";
import assert from "node:assert/strict";
import { detectStructuralIssues } from "../lib/issue-detection";

test("detectStructuralIssues flags missing core SEO and conversion signals", () => {
  const issues = detectStructuralIssues({
    titlePresent: false,
    titleLength: 0,
    metaDescriptionPresent: false,
    metaDescriptionLength: 0,
    canonicalPresent: false,
    langAttrPresent: false,
    h1Count: 0,
    hasViewport: false,
    mobileTapTargetsOk: false,
    mobileTapTargetsMeasured: true,
    formCount: 0,
    hasContactFormEvidence: false,
    contactFormConfidence: 10,
    ctaCount: 0,
    internalLinkCount: 0,
    wordCount: 30,
    imgCount: 6,
    altCount: 1,
    scriptCount: 130,
    domNodeCount: 5200,
    isEcommerce: false,
  });

  const titles = issues.map((i) => i.title);
  assert.ok(titles.includes("Missing title tag"));
  assert.ok(titles.includes("Missing meta description"));
  assert.ok(titles.includes("Missing canonical tag"));
  assert.ok(titles.includes("No lead form detected"));
  assert.ok(titles.includes("No clear CTA text"));
  assert.ok(titles.includes("Very high script load"));
  assert.ok(titles.includes("Extremely complex DOM structure"));
});

test("detectStructuralIssues does not flag mobile tap target coverage when unmeasured", () => {
  const issues = detectStructuralIssues({
    titlePresent: true,
    titleLength: 42,
    metaDescriptionPresent: true,
    metaDescriptionLength: 130,
    canonicalPresent: true,
    langAttrPresent: true,
    h1Count: 1,
    hasViewport: true,
    mobileTapTargetsOk: false,
    mobileTapTargetsMeasured: false,
    formCount: 1,
    hasContactFormEvidence: true,
    contactFormConfidence: 90,
    ctaCount: 2,
    internalLinkCount: 4,
    wordCount: 280,
    imgCount: 4,
    altCount: 4,
    scriptCount: 20,
    domNodeCount: 900,
    isEcommerce: false,
  });

  const hasTapIssue = issues.some(
    (i) => i.title === "Low mobile tap target coverage",
  );
  assert.equal(hasTapIssue, false);
});
