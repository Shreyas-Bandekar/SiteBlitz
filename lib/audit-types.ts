export type TrustLevel = "VERIFIED" | "ESTIMATED" | "INFERRED" | "FALLBACK";

export type TrustMeta<T = unknown> = {
  value: T;
  trustLevel: TrustLevel;
  source: string;
  /** 0–1, constrained by trust level band */
  confidence: number;
};

export type TrustBreakdown = {
  verified: number;
  estimated: number;
  inferred: number;
  fallback: number;
};

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
  category:
    | "uiux"
    | "seo"
    | "mobile"
    | "performance"
    | "accessibility"
    | "leadConversion";
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
  city?: string;
  district?: string;
  state?: string;
  country?: string;
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
  type: "contentClarity" | "conversionPath" | "trustAndProof";
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
  ui_ux_score: number;
  lead_gen_score: number;
  issues: Array<{
    type: string;
    severity: "low" | "medium" | "high";
    fix: string;
    roi: string;
  }>;
  quick_wins: Array<{
    action: string;
    effort: "5min" | "30min" | "2hr";
    impact: string;
    priority: number;
  }>;
  source: "model";
};

export type LiveCompetitorAudit = {
  url: string;
  score: number;
  timestamp: string;
  audited?: string;
  sourceType?: "live" | "pre-audited";
  city?: string;
  district?: string;
  state?: string;
  country?: string;
};

export type LocationSignals = {
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  confidence: number;
  matchedSignals: string[];
};

export type AnalyticsSignal = {
  value: string | number | null;
  confidence: number;
  evidence: string[];
};

export type LiveAnalytics = {
  ga4Id: AnalyticsSignal;
  monthlyUsers: AnalyticsSignal;
  avgOrderValue: AnalyticsSignal;
  conversionRate: AnalyticsSignal;
};

export type LiveAuditHistory = {
  id: string;
  url: string;
  scores: DeterministicScores;
  timestamp: string;
};

export type TrustData = {
  trustScore: number;
  grade: "A" | "B" | "C";
  badgeText: string;
  factors: string[];
};

export type GroqInsights = {
  summary: string;
  quickWins: string[];
  trustScore: number;
  working: boolean;
  fallback?: string;
  fallbackReason?: string;
  sourceMode?: "real" | "fallback" | "skipped";
  evidenceSnippet?: string[];
};

export type ManualRoadmap = {
  summary: string;
  week1: string[];
  week2: string[];
  outcome: string;
};

export type LeadGenScan = {
  leadScore: number;
  status: string;
  issues: string[];
  details: string;
  roi: string;
  confidence?: number;
  evidence?: string[];
};

export type LiveDataSource = {
  name: string;
  timestamp: string;
  method: string;
};

export type StageTraceEntry = {
  stage: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  status: "ok" | "failed";
  error?: string;
};

export type AuditReport = {
  url: string;
  scores: DeterministicScores;
  issues: Issue[];
  recommendations: Recommendation[];
  detectedIndustry: IndustryDetection;
  competitors: LiveCompetitorAudit[];
  roi: ROIResult | null;
  roiReason?: string;
  analytics: LiveAnalytics;
  contentFixes: ContentFix[];
  trends: Array<{ date: string; overall: number }>;
  trendsSummary: TrendsSummary;
  aiInsights?: AiInsights;
  quick_wins?: Array<{
    action: string;
    effort: "5min" | "30min" | "2hr";
    impact: string;
  }>;
  cvBreakdown?: {
    contrast: number;
    layout: number;
    typography: number;
    color: number;
    space: number;
  } | null;
  hasCv?: boolean;
  aiStatus?: "ok" | "failed" | "skipped";
  cvStatus?: "ok" | "failed" | "skipped";
  disclaimers: string[];
  summary?: string;
  deterministicNotes: string[];
  pipeline: string[];
  pipelineWarnings?: string[];
  isLive: true;
  status: "live-complete";
  liveTimestamp: string;
  auditId: string;
  history: LiveAuditHistory[];
  stageTrace?: StageTraceEntry[];
  rawHtml?: string;
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
  uxScore?: number;
  uxIssuesCount?: number;
  /** Lead gen rule-based analysis result */
  leadGenAnalysis?: {
    score: number;
    issues: string[];
    roiImpact: string;
    aboveFoldCta: boolean;
    hasContactForm: boolean;
    contactFormConfidence?: number;
    contactFormEvidence?: string[];
  };
  /** Multi-device tap target results */
  deviceResults?: Array<{
    device: string;
    tapTargetsOk: boolean;
    smallTargets: number;
  }>;
  /** All manual rule issues combined (UX + Lead Gen) */
  manualRulesIssues?: string[];
  /** Per-artifact trust labels (additive; optional for older clients). */
  trustByField?: Record<string, TrustMeta>;
  /** 0–100 aggregate trust score */
  overallTrustScore?: number;
  trustBreakdown?: TrustBreakdown;
  /** True when blocked response, degraded fallback, or critical scan gaps */
  scanBlockedOrDegraded?: boolean;
  trustData?: TrustData;
  groqInsights?: GroqInsights;
  roadmap?: ManualRoadmap;
  leadGen?: LeadGenScan;
  deterministic?: boolean;
  roiSource?: string;
  trafficEstimate?: {
    traffic: number;
    conversionRate: number;
    avgOrderValue: number;
    dataSource: string;
  };
  targetLocation?: LocationSignals;
  industry?: IndustryDetection;
  liveDataSources?: LiveDataSource[];
  dbStatus?: "saved" | "failed";
  dbError?: string | null;
};
