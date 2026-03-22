import * as fs from "fs/promises";
import * as path from "path";
import type { BenchmarkSite } from "./audit-types";
import { runAuditPipeline } from "./audit-pipeline";

const CACHE_DIR = path.join(process.cwd(), "data", "benchmarks");
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const TOP_SITES = {
  ecommerce: ["https://www.shopify.com", "https://www.woocommerce.com"],
  saas: ["https://www.hubspot.com", "https://www.intercom.com"],
  local_service: ["https://www.urbancompany.com", "https://www.housejoy.in"],
  agency: ["https://www.ogilvy.com", "https://www.wk.com"],
  media: ["https://www.bbc.com", "https://www.theguardian.com"],
  nonprofit: ["https://www.unicef.org", "https://www.worldwildlife.org"],
  manufacturing: ["https://www.siemens.com", "https://global.abb"],
  other: ["https://www.wikipedia.org", "https://www.mozilla.org"],
};

async function ensureCacheDir() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch {
    // Directory already exists
  }
}

async function getCacheFile(industry: string): Promise<string> {
  await ensureCacheDir();
  return path.join(CACHE_DIR, `${industry}.json`);
}

async function readCache(industry: string): Promise<BenchmarkSite[]> {
  try {
    const cacheFile = await getCacheFile(industry);
    const data = await fs.readFile(cacheFile, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeCache(industry: string, data: BenchmarkSite[]) {
  try {
    const cacheFile = await getCacheFile(industry);
    await fs.writeFile(cacheFile, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("[LiveBenchmarks] Failed to write cache:", error);
  }
}

function isCacheFresh(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_TTL_MS;
}

export async function getLiveBenchmarks(
  industry: keyof typeof TOP_SITES
): Promise<BenchmarkSite[]> {
  // Read from local cache
  const cached = await readCache(industry);
  const fresh = cached.filter((b) => isCacheFresh(new Date(b.auditedDate).getTime()));

  // If we have fresh data, return it
  if (fresh.length >= 2) {
    return fresh;
  }

  // Otherwise, audit top sites and cache
  const sites = TOP_SITES[industry] || TOP_SITES.other;
  const toAudit = sites.slice(0, 2);

  try {
    const audited: BenchmarkSite[] = [];

    for (const url of toAudit) {
      try {
        const report = await runAuditPipeline(url, { includeAi: false });

        audited.push({
          name: new URL(url).hostname.replace("www.", "").split(".")[0],
          url,
          overall: report.scores.overall,
          mobile: report.scores.mobile,
          seo: report.scores.seo,
          auditedDate: new Date().toISOString().split("T")[0],
          sourceType: "live",
          lastUpdated: new Date().toISOString(),
        });
      } catch (error) {
        console.warn(`[LiveBenchmarks] Failed to audit ${url}:`, error);
        // Continue with next site
      }
    }

    // Combine with some cached data if available
    const combined = [...audited, ...fresh.slice(0, Math.max(0, 3 - audited.length))];

    // Save to cache
    if (audited.length > 0) {
      await writeCache(industry, combined);
    }

    return combined.slice(0, 3);
  } catch (error) {
    console.error("[LiveBenchmarks] Error auditing sites:", error);
    // Fall back to cached data
    return fresh.length > 0 ? fresh : cached;
  }
}
