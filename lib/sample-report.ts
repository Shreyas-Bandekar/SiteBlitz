import type { AuditReport } from "./audit-types";

export const SAMPLE_REPORT: AuditReport = {
  url: "https://sample-business-site.demo",
  scores: {
    uiux: 62,
    seo: 58,
    mobile: 54,
    performance: 49,
    accessibility: 57,
    leadConversion: 44,
    overall: 55,
  },
  issues: [
    { category: "performance", title: "Low Lighthouse performance score", detail: "Large hero assets and blocking JS delay first render.", severity: "high" },
    { category: "mobile", title: "Low mobile tap target coverage", detail: "Interactive elements are sparse on mobile above the fold.", severity: "medium" },
    { category: "leadConversion", title: "No lead form detected", detail: "No clear lead capture form present on primary landing page.", severity: "high" },
    { category: "seo", title: "Missing meta description", detail: "Search snippets are not optimized for click-through.", severity: "medium" },
    { category: "uiux", title: "Heading hierarchy issue", detail: "Multiple H1s reduce content clarity for users and crawlers.", severity: "medium" },
  ],
  recommendations: [
    { priority: "high", category: "performance", action: "Compress hero media and defer non-critical scripts", rationale: "Fast load speed improves engagement and ad conversion efficiency." },
    { priority: "high", category: "leadConversion", action: "Add a short above-the-fold lead form with one primary CTA", rationale: "Reduces friction and captures intent before drop-off." },
    { priority: "medium", category: "mobile", action: "Increase mobile CTA button prominence and spacing", rationale: "Improves tap confidence and mobile funnel progression." },
    { priority: "medium", category: "seo", action: "Add unique meta descriptions on key pages", rationale: "Improves SERP CTR and qualified traffic volume." },
    { priority: "low", category: "uiux", action: "Normalize H1/H2 hierarchy for clarity", rationale: "Strengthens readability and SEO signal structure." },
  ],
  detectedIndustry: {
    category: "local_service",
    confidence: 82,
    matchedSignals: ["local-service-cta", "local-service-contact"],
  },
  competitors: {
    industry: "local_service",
    topCompetitors: [
      {
        name: "Urban Company",
        url: "https://www.urbancompany.com",
        overall: 79,
        mobile: 82,
        seo: 75,
        auditedDate: "2026-03-09",
        sourceType: "pre-audited",
        lastUpdated: "2026-03-18",
      },
    ],
    industryAverageRange: { min: 75, max: 79 },
    topFixesToBeat: [
      "Increase mobile interaction quality and tap-target coverage.",
      "Improve metadata quality and heading semantics for search intent.",
      "Reduce LCP and script execution overhead to close performance gap.",
    ],
  },
  roi: {
    traffic: 10000,
    conversionRate: 0.06,
    avgOrderValue: 3000,
    currency: "INR",
    currentRevenue: 1800000,
    projectedRevenue: 1940400,
    monthlyUplift: 140400,
    upliftPercent: 8,
    template: "local_service",
  },
  contentFixes: [
    {
      type: "title",
      current: "About Us",
      suggested: "Boost SMB Leads 27% Overnight - Free Audit",
      reason: "Short current title lacks intent keywords and conversion framing.",
      confidence: 82,
      guidelineBullets: ["Align headline with local_service buyer intent.", "Use specific outcomes and credibility cues.", "Keep metadata human-readable and concise."],
    },
    {
      type: "metaDescription",
      current: "Missing",
      suggested: "Fix your website and capture more qualified leads with a fast AI audit roadmap in minutes.",
      reason: "Adds value proposition and stronger SERP click appeal.",
      confidence: 80,
      guidelineBullets: ["Align headline with local_service buyer intent.", "Use specific outcomes and credibility cues.", "Keep metadata human-readable and concise."],
    },
    {
      type: "h1",
      current: "Welcome",
      suggested: "Grow Revenue Faster With a 2-Minute Website Conversion Audit",
      reason: "Shifts headline to a concrete business outcome.",
      confidence: 78,
      guidelineBullets: ["Align headline with local_service buyer intent.", "Use specific outcomes and credibility cues.", "Keep metadata human-readable and concise."],
    },
  ],
  trends: [{ date: new Date().toISOString(), overall: 55 }],
  trendsSummary: { deltaPercent: 0, rollingAverage: 55, leadPotentialTrend: 0 },
  aiInsights: {
    executiveSummary:
      "Sample report indicates core technical and conversion opportunities with a phased remediation plan.",
    topFixesFirst: [
      {
        priority: "high",
        fix: "Compress hero media and defer non-critical scripts",
        reason: "Large assets and blocking scripts delay first render.",
        expectedImpact: "High conversion and bounce-rate impact",
      },
      {
        priority: "high",
        fix: "Add above-the-fold lead form with one clear CTA",
        reason: "Primary conversion path is missing for first-visit users.",
        expectedImpact: "High conversion and bounce-rate impact",
      },
      {
        priority: "medium",
        fix: "Improve metadata quality and heading hierarchy",
        reason: "Weak SERP snippet quality and content structure reduce discoverability.",
        expectedImpact: "Moderate engagement and SEO impact",
      },
    ],
    businessImpactNarrative:
      "Addressing speed, mobile interaction quality, and trust cues can increase qualified lead flow and conversion consistency.",
    actionPlan30Days: [
      { week: "Week 1", focus: "Resolve high-priority blockers", outcome: "Stabilize critical conversion paths" },
      { week: "Week 2", focus: "Improve mobile and SEO metadata", outcome: "Improve quality traffic and engagement" },
      { week: "Week 3", focus: "Accessibility and content polish", outcome: "Increase usability confidence" },
      { week: "Week 4", focus: "Measure trend gains and iterate", outcome: "Sustain improvements" },
    ],
    source: "fallback",
  },
  disclaimers: [
    "Sample mode uses cached report values for offline reliability.",
    "Live mode enforces same-industry comparison and confidence gating.",
  ],
  summary:
    "Sample fallback report loaded. This demonstrates scoring, issues, and prioritized action planning when live internet conditions are unstable during judging.",
  deterministicNotes: [
    "Sample uses the same report shape as live pipeline output.",
    "Live scores remain deterministic from Lighthouse + Playwright + axe + DOM checks.",
  ],
  pipeline: ["sample-cache"],
  screenshots: {},
  seoDetails: {
    titleLength: 8,
    metaLength: 0,
    h1Count: 2,
    wordCount: 220,
    altMissing: 3,
  },
  serpPreview: {
    title: "Sample Business Site",
    description: "Example fallback SERP preview for offline demo mode.",
    url: "https://sample-business-site.demo",
  },
};
