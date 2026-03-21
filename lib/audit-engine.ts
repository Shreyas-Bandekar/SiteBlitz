import { AUDIT_PROMPTS, COLOR_PSYCHOLOGY_TIPS } from "./prompts";

export type AuditScores = {
  uiux: number;
  perf: number;
  mobile: number;
  access: number;
  seo: number;
  leads: number;
  overall: number;
};

export type AuditResult = {
  scores: AuditScores;
  issues: string[];
  fixes: string[];
  leadBoost: string;
  benchmark: { you: number; competitorsAvg: number };
  promptsUsed: typeof AUDIT_PROMPTS;
  colorSuggestions: string[];
};

export type ContentSuggestion = {
  type: "title" | "metaDescription" | "h1";
  current: string;
  suggested: string;
  reason: string;
  confidence: number;
  guidelineBullets: string[];
};

function scoreFromSignals(base: number, bonuses: number[], penalties: number[]) {
  const value = base + bonuses.reduce((a, b) => a + b, 0) - penalties.reduce((a, b) => a + b, 0);
  return Math.max(0, Math.min(100, Math.round(value)));
}

function count(html: string, regex: RegExp) {
  return (html.match(regex) || []).length;
}

export function analyzeWebsite(htmlRaw: string, pagespeedRaw: any): AuditResult {
  const html = String(htmlRaw || "").toLowerCase();
  const metrics = pagespeedRaw?.lighthouseResult?.audits ?? {};
  const perfScore = pagespeedRaw?.lighthouseResult?.categories?.performance?.score;

  const hasViewport = /<meta[^>]*name=["']viewport["']/i.test(html);
  const formCount = count(html, /<form[\s>]/gi);
  const ctaCount = count(html, /(get started|book demo|contact us|sign up|try free|request demo)/gi);
  const h1Count = count(html, /<h1[\s>]/gi);
  const headings = count(html, /<h[1-6][\s>]/gi);
  const altCount = count(html, /<img[^>]*alt=["'][^"']+/gi);
  const imgCount = count(html, /<img[\s>]/gi);
  const ariaCount = count(html, /\saria-[a-z-]+=/gi);
  const navCount = count(html, /<nav[\s>]/gi);
  const titleTag = /<title>.+<\/title>/i.test(html);
  const metaDesc = /<meta[^>]*name=["']description["'][^>]*>/i.test(html);
  const hasCanonical = /<link[^>]*rel=["']canonical["']/i.test(html);

  const lcp = metrics["largest-contentful-paint"]?.numericValue ?? 3500;
  const cls = metrics["cumulative-layout-shift"]?.numericValue ?? 0.18;
  const tbt = metrics["total-blocking-time"]?.numericValue ?? 280;

  const uiux = scoreFromSignals(
    65,
    [navCount > 0 ? 10 : 0, ctaCount > 0 ? 8 : 0, headings >= 5 ? 8 : 0],
    [h1Count === 0 ? 10 : 0, ctaCount === 0 ? 10 : 0]
  );

  const perf = scoreFromSignals(
    typeof perfScore === "number" ? perfScore * 100 : 55,
    [lcp < 2500 ? 10 : 0, cls < 0.1 ? 8 : 0, tbt < 200 ? 8 : 0],
    [lcp > 4000 ? 12 : 0, cls > 0.25 ? 10 : 0, tbt > 600 ? 10 : 0]
  );

  const mobile = scoreFromSignals(
    60,
    [hasViewport ? 20 : 0, ctaCount > 0 ? 6 : 0],
    [!hasViewport ? 20 : 0, headings < 3 ? 6 : 0]
  );

  const access = scoreFromSignals(
    58,
    [imgCount > 0 ? Math.min(20, Math.round((altCount / imgCount) * 20)) : 12, ariaCount > 2 ? 10 : 0],
    [imgCount > 0 && altCount / imgCount < 0.7 ? 12 : 0]
  );

  const seo = scoreFromSignals(
    62,
    [titleTag ? 12 : 0, metaDesc ? 10 : 0, hasCanonical ? 8 : 0, h1Count === 1 ? 6 : 0],
    [!titleTag ? 15 : 0, !metaDesc ? 12 : 0, h1Count > 1 ? 6 : 0]
  );

  const leads = scoreFromSignals(
    50,
    [formCount > 0 ? 20 : 0, ctaCount > 0 ? 20 : 0],
    [formCount === 0 ? 15 : 0, ctaCount === 0 ? 15 : 0]
  );

  const overall = Math.round(
    uiux * 0.25 + perf * 0.2 + mobile * 0.2 + access * 0.15 + seo * 0.15 + leads * 0.05
  );
  const leadBoost = `${Math.round((100 - overall) * 0.3)}%`;

  const issues: string[] = [];
  const fixes: string[] = [];

  if (!hasViewport) {
    issues.push("Missing mobile viewport meta tag.");
    fixes.push('Add `<meta name="viewport" content="width=device-width, initial-scale=1" />`.');
  }
  if (!titleTag || !metaDesc) {
    issues.push("SEO metadata is incomplete.");
    fixes.push("Add unique title + meta description per primary landing page.");
  }
  if (imgCount > 0 && altCount / imgCount < 0.7) {
    issues.push("Many images are missing descriptive alt text.");
    fixes.push("Provide meaningful alt text for all informative images.");
  }
  if (lcp > 4000 || tbt > 600) {
    issues.push("Performance metrics indicate heavy render workload.");
    fixes.push("Compress hero media, defer non-critical JS, and inline critical CSS.");
  }
  if (formCount === 0) {
    issues.push("No lead capture form found.");
    fixes.push("Add above-the-fold lead form with 1 primary CTA.");
  }
  if (ctaCount === 0) {
    issues.push("No clear conversion CTA detected.");
    fixes.push('Add repeated CTA labels like "Book Demo" and "Start Free Trial".');
  }
  if (h1Count !== 1) {
    issues.push("Heading hierarchy is weak (expect exactly one H1).");
    fixes.push("Use one descriptive H1 and structured H2/H3 sections.");
  }

  const competitorsAvg = Math.max(35, Math.min(95, overall - 8 + Math.round(Math.random() * 14)));

  return {
    scores: { uiux, perf, mobile, access, seo, leads, overall },
    issues,
    fixes,
    leadBoost,
    benchmark: { you: overall, competitorsAvg },
    promptsUsed: AUDIT_PROMPTS,
    colorSuggestions: COLOR_PSYCHOLOGY_TIPS,
  };
}

export function generateContentSuggestions(htmlRaw: string, industry: string, industryConfidence: number): ContentSuggestion[] {
  const html = String(htmlRaw || "");
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i);

  const currentTitle = (titleMatch?.[1] || "Missing").trim();
  const currentH1 = (h1Match?.[1] || "Missing").trim();
  const currentMeta = (metaMatch?.[1] || "Missing").trim();

  const lowConfidence = industryConfidence < 75;
  const guidelineBase = lowConfidence
    ? ["Keep messaging clear and benefit-focused.", "Use one keyword phrase per field.", "Avoid exaggerated claims."]
    : [`Align headline with ${industry} buyer intent.`, "Use specific outcomes and credibility cues.", "Keep metadata human-readable and concise."];

  return [
    {
      type: "title",
      current: currentTitle,
      suggested: lowConfidence
        ? "Improve Website Leads with a Fast Performance and SEO Audit"
        : `Top ${industry} Website Audit - Improve Leads and Conversion`,
      reason: lowConfidence ? "Industry confidence is low, so a safe generic SEO title is recommended." : "Title aligns to detected industry intent and conversion language.",
      confidence: lowConfidence ? 62 : 86,
      guidelineBullets: guidelineBase,
    },
    {
      type: "metaDescription",
      current: currentMeta,
      suggested: lowConfidence
        ? "Audit your website for speed, SEO, accessibility, and conversion improvements in minutes."
        : `Get a deterministic ${industry} website audit for speed, SEO, and conversion performance.`,
      reason: lowConfidence ? "Generic fallback description avoids wrong-market assumptions." : "Description provides category-specific value proposition and trust language.",
      confidence: lowConfidence ? 60 : 84,
      guidelineBullets: guidelineBase,
    },
    {
      type: "h1",
      current: currentH1,
      suggested: lowConfidence ? "Improve Website Performance and Conversion" : `Grow ${industry} Revenue with a Conversion-Focused Website`,
      reason: lowConfidence ? "Safe generic H1 while category confidence is below threshold." : "H1 focuses on measurable business outcomes for this category.",
      confidence: lowConfidence ? 58 : 82,
      guidelineBullets: guidelineBase,
    },
  ];
}
