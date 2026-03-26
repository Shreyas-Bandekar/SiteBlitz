import type { IndustryCategory, StageTraceEntry } from "./audit-types";

const industryToDomains: Record<IndustryCategory, string[]> = {
  ecommerce: ["flipkart.com", "myntra.com", "nykaa.com"],
  saas: ["zoho.com", "freshworks.com", "atlassian.com"],
  local_service: ["urbancompany.com", "housejoy.in", "nobroker.in"],
  agency: ["ogilvy.com", "wk.com", "dentsu.com"],
  media: ["bbc.com", "theguardian.com", "ndtv.com"],
  nonprofit: ["unicef.org", "worldwildlife.org", "cry.org"],
  manufacturing: ["siemens.com", "bosch.com", "global.abb"],
  other: ["semrush.com", "ahrefs.com", "gtmetrix.com"],
};

export async function runLiveCompetitorAudits(input: {
  industry: IndustryCategory;
  maxConcurrency?: 1 | 2;
  trace?: StageTraceEntry[];
  runAudit: (url: string) => Promise<{ scores: { overall: number; mobile: number; seo: number } }>;
}) {
  const domains = industryToDomains[input.industry].slice(0, 3).map((domain) => `https://${domain}`);
  const concurrency = input.maxConcurrency ?? 1;
  const results: Array<{ url: string; score: number; timestamp: string; mobile: number; seo: number }> = [];
  const queue = [...domains];

  const worker = async () => {
    while (queue.length) {
      const next = queue.shift();
      if (!next) return;
      const started = Date.now();
      const startedAt = new Date(started).toISOString();
      try {
        const report = await input.runAudit(next);
        results.push({
          url: next,
          score: report.scores.overall,
          mobile: report.scores.mobile,
          seo: report.scores.seo,
          timestamp: new Date().toISOString(),
        });
        input.trace?.push({
          stage: "competitors",
          startedAt,
          endedAt: new Date().toISOString(),
          durationMs: Date.now() - started,
          status: "ok",
        });
      } catch (error) {
        input.trace?.push({
          stage: "competitors",
          startedAt,
          endedAt: new Date().toISOString(),
          durationMs: Date.now() - started,
          status: "failed",
          error: error instanceof Error ? error.message : "unknown",
        });
        throw error;
      }
    }
  };
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}
