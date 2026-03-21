export type Severity = "high" | "medium" | "low";
export type IndustryCategory =
  | "ecommerce"
  | "saas"
  | "local_service"
  | "agency"
  | "media"
  | "nonprofit"
  | "manufacturing"
  | "other";

export type Issue = {
  category: "uiux" | "seo" | "mobile" | "performance" | "accessibility" | "leadConversion";
  title: string;
  detail: string;
  severity: Severity;
};

export type Recommendation = {
  priority: Severity;
  category: Issue["category"];
  action: string;
  rationale: string;
};

export type DeterministicScores = {
  uiux: number;
  seo: number;
  mobile: number;
  performance: number;
  accessibility: number;
  leadConversion: number;
  overall: number;
};

export type IndustryDetection = {
  category: IndustryCategory;
  confidence: number;
  matchedSignals: string[];
};

export type BenchmarkSite = {
  name: string;
  url: string;
  overall: number;
  mobile: number;
  seo: number;
  auditedDate: string;
  sourceType: "pre-audited" | "live";
  lastUpdated: string;
};

export type CompetitorComparison = {
  industry: IndustryCategory;
  topCompetitors: BenchmarkSite[];
  industryAverageRange: { min: number; max: number };
  topFixesToBeat: string[];
  disclaimer?: string;
};

export type ROIResult = {
  traffic: number;
  conversionRate: number;
  avgOrderValue: number;
  currency: "INR";
  currentRevenue: number;
  projectedRevenue: number;
  monthlyUplift: number;
  upliftPercent: number;
  template: "ecommerce" | "saas" | "local_service" | "custom";
};

export type ContentFix = {
  type: "title" | "metaDescription" | "h1";
  current: string;
  suggested: string;
  reason: string;
  confidence: number;
  guidelineBullets: string[];
};

export type TrendsSummary = {
  deltaPercent: number;
  rollingAverage: number;
  leadPotentialTrend: number;
};

export type AiInsights = {
  executiveSummary: string;
  topFixesFirst: Array<{ priority: Severity; fix: string; reason: string; expectedImpact: string }>;
  businessImpactNarrative: string;
  actionPlan30Days: Array<{ week: string; focus: string; outcome: string }>;
  source: "model" | "fallback";
};

export type AuditReport = {
  url: string;
  scores: DeterministicScores;
  issues: Issue[];
  recommendations: Recommendation[];
  detectedIndustry: IndustryDetection;
  competitors: CompetitorComparison | null;
  roi?: ROIResult;
  contentFixes: ContentFix[];
  trends: Array<{ date: string; overall: number }>;
  trendsSummary: TrendsSummary;
  aiInsights: AiInsights;
  disclaimers: string[];
  summary: string;
  deterministicNotes: string[];
  pipeline: string[];
  screenshot?: string;
  screenshots?: { desktop?: string; mobile?: string };
  seoDetails?: {
    titleLength: number;
    metaLength: number;
    h1Count: number;
    wordCount: number;
    altMissing: number;
  };
  serpPreview?: {
    title: string;
    description: string;
    url: string;
  };
};
