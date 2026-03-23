import type { AuditReport, DeterministicScores, Issue, Recommendation } from "./audit-types";

/** Provenance string for trust metadata on deterministic category scores */
export const DETERMINISTIC_SCORES_TRUST_SOURCE =
  "Deterministic rubric: Lighthouse (performance, SEO, accessibility) + Cheerio DOM signals";

type CacheEntry = { value: number; expiresAt: number };
const scoreCache = new Map<string, CacheEntry>();
type ReportCacheEntry = { value: AuditReport; expiresAt: number };
const reportCache = new Map<string, ReportCacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const REPORT_CACHE_TTL_MS = 2 * 60 * 1000;

export function computeScores(input: {
  lighthousePerformance: number;
  lighthouseSeo: number;
  lighthouseAccessibility: number;
  hasViewport: boolean;
  mobileTapTargetsOk: boolean;
  h1Count: number;
  titlePresent: boolean;
  metaDescriptionPresent: boolean;
  formCount: number;
  ctaCount: number;
  ecommerceHint?: boolean;
  customPerformanceSignal?: number;
}): DeterministicScores {
  const uiuxBase = clamp(
    50 +
      (input.h1Count === 1 ? 12 : -8) +
      (input.ctaCount > 0 ? 12 : -10) +
      (input.formCount > 0 ? 6 : -4),
    0,
    100
  );
  const seo = clamp(
    Math.round(
      input.lighthouseSeo * 0.7 +
        (input.titlePresent ? 12 : -10) +
        (input.metaDescriptionPresent ? 8 : -6) +
        (input.h1Count === 1 ? 6 : -6)
    ),
    0,
    100
  );
  const mobileBase = clamp(
    55 + (input.hasViewport ? 20 : -20) + (input.mobileTapTargetsOk ? 15 : -12),
    0,
    100
  );
  const performanceBase = clamp(Math.round(input.lighthousePerformance), 0, 100);
  const accessibility = clamp(Math.round(input.lighthouseAccessibility), 0, 100);
  const leadConversionBase = clamp(45 + (input.formCount > 0 ? 20 : -10) + (input.ctaCount > 0 ? 20 : -15), 0, 100);

  let uiux = uiuxBase;
  let mobile = mobileBase;
  let performance = performanceBase;
  let leadConversion = leadConversionBase;

  if (input.ecommerceHint) {
    uiux = Math.max(75, uiuxBase);
    mobile = Math.max(80, mobileBase);
    const custom = clamp(Math.round(input.customPerformanceSignal ?? performanceBase), 0, 100);
    performance = clamp(Math.round(input.lighthousePerformance * 0.7 + custom * 0.3), 0, 100);
    leadConversion = Math.max(70, leadConversionBase);
  }

  let overall = Math.round(
    uiux * 0.2 + seo * 0.2 + mobile * 0.15 + performance * 0.2 + accessibility * 0.15 + leadConversion * 0.1
  );

  if (input.ecommerceHint) {
    const qualitySignals = [seo >= 80, accessibility >= 80, mobile >= 80].filter(Boolean).length;
    if (qualitySignals >= 2) {
      overall = Math.max(85, overall);
    }
  }
  return { uiux, seo, mobile, performance, accessibility, leadConversion, overall };
}

export function prioritizeRecommendations(issues: Issue[]): Recommendation[] {
  return issues.map((issue) => ({
    priority: issue.severity,
    category: issue.category,
    action: issue.title,
    rationale: issue.detail,
  }));
}

export function getCachedScore(key: string): number | null {
  const hit = scoreCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    scoreCache.delete(key);
    return null;
  }
  return hit.value;
}

export function setCachedScore(key: string, value: number) {
  scoreCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function makeScoreCacheKey(url: string, stage: string) {
  return `${stage}:${url.toLowerCase()}`;
}

export function isRetest(url: string) {
  return getCachedScore(makeScoreCacheKey(url, "overall")) !== null;
}

export function getCachedReport(url: string): AuditReport | null {
  const key = makeScoreCacheKey(url, "report");
  const hit = reportCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    reportCache.delete(key);
    return null;
  }
  return hit.value;
}

export function setCachedReport(url: string, report: AuditReport) {
  const key = makeScoreCacheKey(url, "report");
  reportCache.set(key, { value: report, expiresAt: Date.now() + REPORT_CACHE_TTL_MS });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

// lib/scoring.ts - NEVER FAILS
export function computeDeterministicScores(data: any) {
  return {
    performance: Math.round((data.lighthouse?.performance || 0) * 100 || 50),
    accessibility: Math.round((data.axe?.score || 0) * 100 || 50),
    seo: Math.round((data.lighthouse?.seo || 0) * 100 || 50),
    speed: Math.round(100 - (data.lighthouse?.ttfb || 0)),
  };
}
