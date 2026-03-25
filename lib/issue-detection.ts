import type { Issue } from "./audit-types";

type IssueSignalInput = {
  titlePresent: boolean;
  metaDescriptionPresent: boolean;
  h1Count: number;
  hasViewport: boolean;
  mobileTapTargetsOk: boolean;
  formCount: number;
  ctaCount: number;
  scriptCount?: number;
  domNodeCount?: number;
  isEcommerce: boolean;
};

function makeIssue(category: Issue["category"], title: string, detail: string, severity: Issue["severity"]): Issue {
  return { category, title, detail, severity };
}

export function detectStructuralIssues(input: IssueSignalInput): Issue[] {
  const issues: Issue[] = [];

  if (!input.titlePresent) {
    issues.push(makeIssue("seo", "Missing title tag", "Add a unique title to improve search snippets.", "high"));
  }

  if (!input.metaDescriptionPresent) {
    issues.push(makeIssue("seo", "Missing meta description", "Add a description for stronger CTR in search results.", "medium"));
  }

  // E-commerce whitelist: multiple H1 can be valid in section-based storefront themes.
  const ignoreMultipleH1 = input.isEcommerce;
  if (!ignoreMultipleH1 && input.h1Count !== 1) {
    issues.push(makeIssue("uiux", "Heading hierarchy issue", "Use exactly one H1 and structured H2/H3 sections.", "medium"));
  }

  if (!input.hasViewport) {
    issues.push(makeIssue("mobile", "Missing viewport meta", "Add viewport meta for mobile layout.", "high"));
  }

  if (!input.mobileTapTargetsOk) {
    issues.push(makeIssue("mobile", "Low mobile tap target coverage", "Increase tappable controls for mobile UX.", "medium"));
  }

  if (input.formCount === 0) {
    issues.push(
      makeIssue(
        "leadConversion",
        "No lead form detected",
        "Place a simple contact form next to your main button so visitors can reach you quickly.",
        "high"
      )
    );
  }

  if (input.ctaCount === 0) {
    issues.push(makeIssue("leadConversion", "No clear CTA text", "Add action-oriented CTAs.", "high"));
  }

  // E-commerce whitelist placeholders for compatibility with richer detectors.
  const ignoreManyScripts = input.isEcommerce;
  const ignoreComplexDom = input.isEcommerce;
  if (!ignoreManyScripts && (input.scriptCount ?? 0) > 80) {
    issues.push(makeIssue("performance", "Many scripts loaded", "Reduce third-party scripts to improve page speed.", "medium"));
  }
  if (!ignoreComplexDom && (input.domNodeCount ?? 0) > 2500) {
    issues.push(makeIssue("performance", "Complex DOM structure", "Simplify heavy nested markup to improve rendering time.", "low"));
  }

  return issues;
}
