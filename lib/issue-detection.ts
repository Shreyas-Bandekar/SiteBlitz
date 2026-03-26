import type { Issue } from "./audit-types";

type IssueSignalInput = {
  titlePresent: boolean;
  titleLength: number;
  metaDescriptionPresent: boolean;
  metaDescriptionLength: number;
  canonicalPresent: boolean;
  langAttrPresent: boolean;
  h1Count: number;
  hasViewport: boolean;
  mobileTapTargetsOk: boolean;
  mobileTapTargetsMeasured: boolean;
  formCount: number;
  hasContactFormEvidence?: boolean;
  contactFormConfidence?: number;
  ctaCount: number;
  internalLinkCount?: number;
  wordCount?: number;
  imgCount?: number;
  altCount?: number;
  scriptCount?: number;
  domNodeCount?: number;
  isEcommerce: boolean;
};

function makeIssue(
  category: Issue["category"],
  title: string,
  detail: string,
  severity: Issue["severity"],
): Issue {
  return { category, title, detail, severity };
}

export function detectStructuralIssues(input: IssueSignalInput): Issue[] {
  const issues: Issue[] = [];

  if (!input.titlePresent) {
    issues.push(
      makeIssue(
        "seo",
        "Missing title tag",
        "Add a unique title to improve search snippets.",
        "high",
      ),
    );
  }

  if (!input.metaDescriptionPresent) {
    issues.push(
      makeIssue(
        "seo",
        "Missing meta description",
        "Add a description for stronger CTR in search results.",
        "medium",
      ),
    );
  } else if (input.metaDescriptionLength < 70) {
    issues.push(
      makeIssue(
        "seo",
        "Meta description is too short",
        "Expand it to clearly explain value and improve search click-through.",
        "low",
      ),
    );
  }

  if (input.titlePresent && input.titleLength < 25) {
    issues.push(
      makeIssue(
        "seo",
        "Title tag is too short",
        "Use a more descriptive title including primary topic and intent.",
        "low",
      ),
    );
  }

  if (!input.canonicalPresent) {
    issues.push(
      makeIssue(
        "seo",
        "Missing canonical tag",
        "Add a canonical URL to reduce duplicate-index ambiguity.",
        "low",
      ),
    );
  }

  if (!input.langAttrPresent) {
    issues.push(
      makeIssue(
        "accessibility",
        "Missing page language attribute",
        "Set <html lang='…'> to improve screen reader and crawler interpretation.",
        "low",
      ),
    );
  }

  // E-commerce whitelist: multiple H1 can be valid in section-based storefront themes.
  const ignoreMultipleH1 = input.isEcommerce;
  if (!ignoreMultipleH1 && input.h1Count !== 1) {
    issues.push(
      makeIssue(
        "uiux",
        "Heading hierarchy issue",
        "Use exactly one H1 and structured H2/H3 sections.",
        "medium",
      ),
    );
  }

  if (!input.hasViewport) {
    issues.push(
      makeIssue(
        "mobile",
        "Missing viewport meta",
        "Add viewport meta for mobile layout.",
        "high",
      ),
    );
  }

  if (input.mobileTapTargetsMeasured && !input.mobileTapTargetsOk) {
    issues.push(
      makeIssue(
        "mobile",
        "Low mobile tap target coverage",
        "Increase tappable controls for mobile UX.",
        "medium",
      ),
    );
  }

  if (input.formCount === 0 && !input.hasContactFormEvidence) {
    issues.push(
      makeIssue(
        "leadConversion",
        "No lead form detected",
        "Add a lead form near primary CTA.",
        "high",
      ),
    );
  } else if ((input.contactFormConfidence ?? 100) < 60) {
    issues.push(
      makeIssue(
        "leadConversion",
        "Lead form confidence is weak",
        "Ensure contact form fields and submit actions are clearly visible.",
        "low",
      ),
    );
  }

  if (input.ctaCount === 0) {
    issues.push(
      makeIssue(
        "leadConversion",
        "No clear CTA text",
        "Add action-oriented CTAs.",
        "high",
      ),
    );
  } else if (input.ctaCount < 2) {
    issues.push(
      makeIssue(
        "leadConversion",
        "Limited conversion CTAs",
        "Add at least two clear CTAs across hero and mid-page sections.",
        "medium",
      ),
    );
  }

  if ((input.wordCount ?? 0) > 0 && (input.wordCount ?? 0) < 120) {
    issues.push(
      makeIssue(
        "seo",
        "Thin on-page content",
        "Add more original copy to better explain services and intent.",
        "medium",
      ),
    );
  }

  if (
    (input.internalLinkCount ?? 0) > 0 &&
    (input.internalLinkCount ?? 0) < 3
  ) {
    issues.push(
      makeIssue(
        "seo",
        "Low internal linking",
        "Add links to key pages to improve crawlability and user navigation.",
        "low",
      ),
    );
  }

  if ((input.imgCount ?? 0) >= 4) {
    const altCoverage =
      (input.altCount ?? 0) / Math.max(1, input.imgCount ?? 1);
    if (altCoverage < 0.8) {
      issues.push(
        makeIssue(
          "accessibility",
          "Incomplete image alt coverage",
          "Add descriptive alt text for meaningful images.",
          altCoverage < 0.5 ? "high" : "medium",
        ),
      );
    }
  }

  // E-commerce whitelist placeholders for compatibility with richer detectors.
  const ignoreManyScripts = input.isEcommerce;
  const ignoreComplexDom = input.isEcommerce;
  if (!ignoreManyScripts && (input.scriptCount ?? 0) > 120) {
    issues.push(
      makeIssue(
        "performance",
        "Very high script load",
        "Reduce third-party scripts and defer non-critical bundles.",
        "high",
      ),
    );
  } else if (!ignoreManyScripts && (input.scriptCount ?? 0) > 80) {
    issues.push(
      makeIssue(
        "performance",
        "Many scripts loaded",
        "Reduce third-party scripts to improve page speed.",
        "medium",
      ),
    );
  }
  if (!ignoreComplexDom && (input.domNodeCount ?? 0) > 5000) {
    issues.push(
      makeIssue(
        "performance",
        "Extremely complex DOM structure",
        "Reduce deeply nested nodes and heavy sections to improve rendering time.",
        "high",
      ),
    );
  } else if (!ignoreComplexDom && (input.domNodeCount ?? 0) > 3500) {
    issues.push(
      makeIssue(
        "performance",
        "Complex DOM structure",
        "Simplify heavy nested markup to improve rendering time.",
        "medium",
      ),
    );
  } else if (!ignoreComplexDom && (input.domNodeCount ?? 0) > 2500) {
    issues.push(
      makeIssue(
        "performance",
        "Complex DOM structure",
        "Simplify heavy nested markup to improve rendering time.",
        "low",
      ),
    );
  }

  return issues;
}
