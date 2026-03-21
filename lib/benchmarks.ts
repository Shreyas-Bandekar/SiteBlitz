import type { BenchmarkSite, CompetitorComparison, DeterministicScores, IndustryCategory } from "./audit-types";

type BenchmarksDb = Record<IndustryCategory, BenchmarkSite[]>;
type BenchCacheEntry = { value: CompetitorComparison | null; expiresAt: number };
const benchCache = new Map<string, BenchCacheEntry>();
const BENCHMARK_TTL_MS = 6 * 60 * 60 * 1000;

const PRE_AUDITED_BENCHMARKS: BenchmarksDb = {
  ecommerce: [
    { name: "Flipkart", url: "https://www.flipkart.com", overall: 84, mobile: 88, seo: 81, auditedDate: "2026-03-10", sourceType: "pre-audited", lastUpdated: "2026-03-18" },
    { name: "Myntra", url: "https://www.myntra.com", overall: 80, mobile: 83, seo: 76, auditedDate: "2026-03-10", sourceType: "pre-audited", lastUpdated: "2026-03-18" },
    { name: "Nykaa", url: "https://www.nykaa.com", overall: 78, mobile: 82, seo: 74, auditedDate: "2026-03-10", sourceType: "pre-audited", lastUpdated: "2026-03-18" },
  ],
  saas: [
    { name: "Zoho", url: "https://www.zoho.com", overall: 86, mobile: 85, seo: 84, auditedDate: "2026-03-11", sourceType: "pre-audited", lastUpdated: "2026-03-18" },
    { name: "Freshworks", url: "https://www.freshworks.com", overall: 82, mobile: 80, seo: 83, auditedDate: "2026-03-11", sourceType: "pre-audited", lastUpdated: "2026-03-18" },
    { name: "Notion", url: "https://www.notion.so", overall: 81, mobile: 79, seo: 82, auditedDate: "2026-03-11", sourceType: "pre-audited", lastUpdated: "2026-03-18" },
  ],
  local_service: [
    { name: "Urban Company", url: "https://www.urbancompany.com", overall: 79, mobile: 82, seo: 75, auditedDate: "2026-03-09", sourceType: "pre-audited", lastUpdated: "2026-03-18" },
    { name: "Housejoy", url: "https://www.housejoy.in", overall: 75, mobile: 78, seo: 72, auditedDate: "2026-03-09", sourceType: "pre-audited", lastUpdated: "2026-03-18" },
    { name: "NoBroker", url: "https://www.nobroker.in", overall: 77, mobile: 80, seo: 73, auditedDate: "2026-03-09", sourceType: "pre-audited", lastUpdated: "2026-03-18" },
  ],
  agency: [
    { name: "Ogilvy", url: "https://www.ogilvy.com", overall: 80, mobile: 79, seo: 78, auditedDate: "2026-03-12", sourceType: "pre-audited", lastUpdated: "2026-03-18" },
    { name: "Wieden+Kennedy", url: "https://www.wk.com", overall: 77, mobile: 75, seo: 76, auditedDate: "2026-03-12", sourceType: "pre-audited", lastUpdated: "2026-03-18" },
    { name: "Dentsu", url: "https://www.dentsu.com", overall: 79, mobile: 78, seo: 77, auditedDate: "2026-03-12", sourceType: "pre-audited", lastUpdated: "2026-03-18" },
  ],
  media: [
    { name: "BBC", url: "https://www.bbc.com", overall: 82, mobile: 85, seo: 81, auditedDate: "2026-03-13", sourceType: "pre-audited", lastUpdated: "2026-03-18" },
    { name: "The Guardian", url: "https://www.theguardian.com", overall: 79, mobile: 82, seo: 80, auditedDate: "2026-03-13", sourceType: "pre-audited", lastUpdated: "2026-03-18" },
    { name: "NDTV", url: "https://www.ndtv.com", overall: 76, mobile: 79, seo: 75, auditedDate: "2026-03-13", sourceType: "pre-audited", lastUpdated: "2026-03-18" },
  ],
  nonprofit: [
    { name: "UNICEF", url: "https://www.unicef.org", overall: 81, mobile: 83, seo: 80, auditedDate: "2026-03-14", sourceType: "pre-audited", lastUpdated: "2026-03-18" },
    { name: "WWF", url: "https://www.worldwildlife.org", overall: 78, mobile: 80, seo: 77, auditedDate: "2026-03-14", sourceType: "pre-audited", lastUpdated: "2026-03-18" },
    { name: "CRY India", url: "https://www.cry.org", overall: 74, mobile: 76, seo: 73, auditedDate: "2026-03-14", sourceType: "pre-audited", lastUpdated: "2026-03-18" },
  ],
  manufacturing: [
    { name: "Siemens", url: "https://www.siemens.com", overall: 78, mobile: 76, seo: 77, auditedDate: "2026-03-15", sourceType: "pre-audited", lastUpdated: "2026-03-18" },
    { name: "ABB", url: "https://global.abb", overall: 76, mobile: 74, seo: 75, auditedDate: "2026-03-15", sourceType: "pre-audited", lastUpdated: "2026-03-18" },
    { name: "Bosch", url: "https://www.bosch.com", overall: 77, mobile: 75, seo: 76, auditedDate: "2026-03-15", sourceType: "pre-audited", lastUpdated: "2026-03-18" },
  ],
  other: [
    { name: "Wikipedia", url: "https://www.wikipedia.org", overall: 75, mobile: 78, seo: 79, auditedDate: "2026-03-16", sourceType: "pre-audited", lastUpdated: "2026-03-18" },
    { name: "Mozilla", url: "https://www.mozilla.org", overall: 79, mobile: 80, seo: 80, auditedDate: "2026-03-16", sourceType: "pre-audited", lastUpdated: "2026-03-18" },
    { name: "GitHub", url: "https://github.com", overall: 81, mobile: 79, seo: 82, auditedDate: "2026-03-16", sourceType: "pre-audited", lastUpdated: "2026-03-18" },
  ],
};

export function refreshBenchmarksCache() {
  benchCache.clear();
}

export function getSameIndustryCompetitors(input: { industry: IndustryCategory; yourScores: DeterministicScores; confidence: number }): CompetitorComparison | null {
  const cacheKey = `${input.industry}:${input.yourScores.overall}:${input.confidence}`;
  const cached = benchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const sites = PRE_AUDITED_BENCHMARKS[input.industry] ?? [];
  if (input.confidence < 75) return null;
  if (!sites.length) {
    const value: CompetitorComparison = {
      industry: input.industry,
      topCompetitors: [],
      industryAverageRange: { min: 0, max: 0 },
      topFixesToBeat: [],
      disclaimer: "No same-industry pre-audited benchmarks are currently available for this category.",
    };
    benchCache.set(cacheKey, { value, expiresAt: Date.now() + BENCHMARK_TTL_MS });
    return value;
  }

  const sorted = [...sites].sort((a, b) => b.overall - a.overall).slice(0, 3);
  const scores = sorted.map((s) => s.overall);
  const avgMin = Math.min(...scores);
  const avgMax = Math.max(...scores);
  const top = sorted[0];
  const fixes: string[] = [];
  if (input.yourScores.mobile < top.mobile) fixes.push("Increase mobile interaction quality and tap-target coverage.");
  if (input.yourScores.seo < top.seo) fixes.push("Improve metadata quality and heading semantics for search intent.");
  if (input.yourScores.performance < top.overall) fixes.push("Reduce LCP and script execution overhead to close performance gap.");
  while (fixes.length < 3) fixes.push("Address high-priority issues first for faster score recovery.");

  const value: CompetitorComparison = {
    industry: input.industry,
    topCompetitors: sorted,
    industryAverageRange: { min: avgMin, max: avgMax },
    topFixesToBeat: fixes.slice(0, 3),
  };
  benchCache.set(cacheKey, { value, expiresAt: Date.now() + BENCHMARK_TTL_MS });
  return value;
}
