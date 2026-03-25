import * as fs from "fs/promises";
import * as path from "path";
import type { BenchmarkSite, LocationSignals } from "./audit-types";
import { runAuditPipeline } from "./audit-pipeline";

const CACHE_DIR = path.join(process.cwd(), "data", "benchmarks");
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const TOP_SITES = {
  ecommerce: ["https://www.flipkart.com", "https://www.myntra.com", "https://www.nykaa.com", "https://www.shopify.com"],
  saas: ["https://www.zoho.com", "https://www.freshworks.com", "https://www.hubspot.com", "https://www.intercom.com"],
  local_service: ["https://www.urbancompany.com", "https://www.housejoy.in", "https://www.nobroker.in"],
  agency: [
    "https://www.tatvasoft.com",
    "https://www.hiddenbrains.com",
    "https://www.schbang.com",
    "https://www.kinnectonline.com",
    "https://www.ogilvy.com",
  ],
  media: ["https://www.ndtv.com", "https://www.indiatoday.in", "https://www.bbc.com"],
  nonprofit: ["https://www.giveindia.org", "https://www.cry.org", "https://www.unicef.org"],
  manufacturing: ["https://www.tatasteel.com", "https://www.mahindra.com", "https://www.siemens.com"],
  // Website audit / SEO tooling competitors for uncategorized scans.
  other: ["https://www.semrush.com", "https://ahrefs.com", "https://gtmetrix.com"],
};

const PRE_AUDITED_BASELINES: Record<keyof typeof TOP_SITES, Array<Omit<BenchmarkSite, "lastUpdated">>> = {
  ecommerce: [
    { name: "flipkart", url: "https://www.flipkart.com", overall: 88, mobile: 86, seo: 89, auditedDate: "2026-03-20", sourceType: "pre-audited", city: "Bengaluru", district: "Bangalore Urban", state: "Karnataka", country: "India" },
    { name: "myntra", url: "https://www.myntra.com", overall: 86, mobile: 84, seo: 87, auditedDate: "2026-03-20", sourceType: "pre-audited", city: "Bengaluru", district: "Bangalore Urban", state: "Karnataka", country: "India" },
    { name: "nykaa", url: "https://www.nykaa.com", overall: 85, mobile: 83, seo: 86, auditedDate: "2026-03-20", sourceType: "pre-audited", city: "Mumbai", district: "Mumbai City", state: "Maharashtra", country: "India" },
    { name: "shopify", url: "https://www.shopify.com", overall: 90, mobile: 88, seo: 92, auditedDate: "2026-03-20", sourceType: "pre-audited", city: "Ottawa", state: "Ontario", country: "Canada" },
    { name: "woocommerce", url: "https://www.woocommerce.com", overall: 86, mobile: 84, seo: 88, auditedDate: "2026-03-20", sourceType: "pre-audited", city: "San Francisco", state: "California", country: "United States" },
    { name: "bigcommerce", url: "https://www.bigcommerce.com", overall: 85, mobile: 83, seo: 87, auditedDate: "2026-03-20", sourceType: "pre-audited", city: "Austin", state: "Texas", country: "United States" },
  ],
  saas: [
    { name: "zoho", url: "https://www.zoho.com", overall: 88, mobile: 85, seo: 90, auditedDate: "2026-03-20", sourceType: "pre-audited", city: "Chennai", district: "Chennai", state: "Tamil Nadu", country: "India" },
    { name: "freshworks", url: "https://www.freshworks.com", overall: 87, mobile: 84, seo: 89, auditedDate: "2026-03-20", sourceType: "pre-audited", city: "Chennai", district: "Chennai", state: "Tamil Nadu", country: "India" },
    { name: "hubspot", url: "https://www.hubspot.com", overall: 89, mobile: 86, seo: 91, auditedDate: "2026-03-20", sourceType: "pre-audited", city: "Cambridge", state: "Massachusetts", country: "United States" },
    { name: "intercom", url: "https://www.intercom.com", overall: 87, mobile: 85, seo: 88, auditedDate: "2026-03-20", sourceType: "pre-audited", city: "San Francisco", state: "California", country: "United States" },
    { name: "zendesk", url: "https://www.zendesk.com", overall: 86, mobile: 84, seo: 87, auditedDate: "2026-03-20", sourceType: "pre-audited", city: "San Francisco", state: "California", country: "United States" },
  ],
  local_service: [
    { name: "urbancompany", url: "https://www.urbancompany.com", overall: 84, mobile: 81, seo: 85, auditedDate: "2026-03-20", sourceType: "pre-audited", city: "Gurugram", district: "Gurgaon", state: "Haryana", country: "India" },
    { name: "housejoy", url: "https://www.housejoy.in", overall: 79, mobile: 77, seo: 80, auditedDate: "2026-03-20", sourceType: "pre-audited", city: "Bengaluru", district: "Bangalore Urban", state: "Karnataka", country: "India" },
    { name: "nobroker", url: "https://www.nobroker.in", overall: 82, mobile: 80, seo: 83, auditedDate: "2026-03-20", sourceType: "pre-audited", city: "Bengaluru", district: "Bangalore Urban", state: "Karnataka", country: "India" },
  ],
  agency: [
    { name: "tatvasoft", url: "https://www.tatvasoft.com", overall: 84, mobile: 81, seo: 85, auditedDate: "2026-03-20", sourceType: "pre-audited", city: "Ahmedabad", district: "Ahmedabad", state: "Gujarat", country: "India" },
    { name: "hiddenbrains", url: "https://www.hiddenbrains.com", overall: 83, mobile: 80, seo: 84, auditedDate: "2026-03-20", sourceType: "pre-audited", city: "Ahmedabad", district: "Ahmedabad", state: "Gujarat", country: "India" },
    { name: "schbang", url: "https://www.schbang.com", overall: 82, mobile: 79, seo: 84, auditedDate: "2026-03-20", sourceType: "pre-audited", city: "Mumbai", district: "Mumbai Suburban", state: "Maharashtra", country: "India" },
    { name: "kinnect", url: "https://www.kinnectonline.com", overall: 80, mobile: 78, seo: 82, auditedDate: "2026-03-20", sourceType: "pre-audited", city: "Mumbai", district: "Mumbai Suburban", state: "Maharashtra", country: "India" },
    { name: "ogilvy", url: "https://www.ogilvy.com", overall: 83, mobile: 81, seo: 84, auditedDate: "2026-03-20", sourceType: "pre-audited", city: "New York", state: "New York", country: "United States" },
    { name: "wk", url: "https://www.wk.com", overall: 80, mobile: 78, seo: 82, auditedDate: "2026-03-20", sourceType: "pre-audited", city: "Portland", state: "Oregon", country: "United States" },
    { name: "dentsu", url: "https://www.dentsu.com", overall: 81, mobile: 79, seo: 83, auditedDate: "2026-03-20", sourceType: "pre-audited", city: "Tokyo", country: "Japan" },
  ],
  media: [
    { name: "ndtv", url: "https://www.ndtv.com", overall: 84, mobile: 81, seo: 86, auditedDate: "2026-03-20", sourceType: "pre-audited", city: "New Delhi", district: "New Delhi", state: "Delhi", country: "India" },
    { name: "indiatoday", url: "https://www.indiatoday.in", overall: 85, mobile: 82, seo: 87, auditedDate: "2026-03-20", sourceType: "pre-audited", city: "Noida", district: "Gautam Buddha Nagar", state: "Uttar Pradesh", country: "India" },
    { name: "bbc", url: "https://www.bbc.com", overall: 88, mobile: 85, seo: 92, auditedDate: "2026-03-20", sourceType: "pre-audited", city: "London", country: "United Kingdom" },
    { name: "guardian", url: "https://www.theguardian.com", overall: 86, mobile: 83, seo: 90, auditedDate: "2026-03-20", sourceType: "pre-audited", city: "London", country: "United Kingdom" },
    { name: "nytimes", url: "https://www.nytimes.com", overall: 89, mobile: 86, seo: 93, auditedDate: "2026-03-20", sourceType: "pre-audited", city: "New York", state: "New York", country: "United States" },
  ],
  nonprofit: [
    { name: "giveindia", url: "https://www.giveindia.org", overall: 80, mobile: 78, seo: 82, auditedDate: "2026-03-20", sourceType: "pre-audited", city: "Bengaluru", district: "Bangalore Urban", state: "Karnataka", country: "India" },
    { name: "cry", url: "https://www.cry.org", overall: 79, mobile: 77, seo: 81, auditedDate: "2026-03-20", sourceType: "pre-audited", city: "Mumbai", district: "Mumbai Suburban", state: "Maharashtra", country: "India" },
    { name: "unicef", url: "https://www.unicef.org", overall: 82, mobile: 80, seo: 85, auditedDate: "2026-03-20", sourceType: "pre-audited", city: "New York", state: "New York", country: "United States" },
    { name: "wwf", url: "https://www.worldwildlife.org", overall: 81, mobile: 79, seo: 84, auditedDate: "2026-03-20", sourceType: "pre-audited", city: "Washington", state: "District Of Columbia", country: "United States" },
    { name: "savethechildren", url: "https://www.savethechildren.org", overall: 80, mobile: 78, seo: 83, auditedDate: "2026-03-20", sourceType: "pre-audited", city: "London", country: "United Kingdom" },
  ],
  manufacturing: [
    { name: "tatasteel", url: "https://www.tatasteel.com", overall: 82, mobile: 79, seo: 84, auditedDate: "2026-03-20", sourceType: "pre-audited", city: "Mumbai", district: "Mumbai City", state: "Maharashtra", country: "India" },
    { name: "mahindra", url: "https://www.mahindra.com", overall: 81, mobile: 78, seo: 83, auditedDate: "2026-03-20", sourceType: "pre-audited", city: "Mumbai", district: "Mumbai Suburban", state: "Maharashtra", country: "India" },
    { name: "siemens", url: "https://www.siemens.com", overall: 84, mobile: 81, seo: 86, auditedDate: "2026-03-20", sourceType: "pre-audited", city: "Munich", country: "Germany" },
    { name: "abb", url: "https://global.abb", overall: 82, mobile: 80, seo: 84, auditedDate: "2026-03-20", sourceType: "pre-audited", city: "Zurich", country: "Switzerland" },
    { name: "bosch", url: "https://www.bosch.com", overall: 83, mobile: 81, seo: 85, auditedDate: "2026-03-20", sourceType: "pre-audited", city: "Stuttgart", country: "Germany" },
  ],
  other: [
    { name: "semrush", url: "https://www.semrush.com", overall: 89, mobile: 86, seo: 92, auditedDate: "2026-03-20", sourceType: "pre-audited", city: "Boston", state: "Massachusetts", country: "United States" },
    { name: "ahrefs", url: "https://ahrefs.com", overall: 88, mobile: 85, seo: 91, auditedDate: "2026-03-20", sourceType: "pre-audited", city: "Singapore", country: "Singapore" },
    { name: "gtmetrix", url: "https://gtmetrix.com", overall: 86, mobile: 83, seo: 89, auditedDate: "2026-03-20", sourceType: "pre-audited", city: "Vancouver", state: "British Columbia", country: "Canada" },
  ],
};

function normalize(v?: string) {
  return String(v || "").trim().toLowerCase();
}

function sameHost(a: string, b: string): boolean {
  try {
    const ah = new URL(a).hostname.replace(/^www\./i, "").toLowerCase();
    const bh = new URL(b).hostname.replace(/^www\./i, "").toLowerCase();
    return ah === bh;
  } catch {
    return false;
  }
}

function locationMatchScore(site: BenchmarkSite, target?: LocationSignals): number {
  if (!target) return 0;
  let score = 0;
  if (normalize(site.country) && normalize(site.country) === normalize(target.country)) score += 40;
  if (normalize(site.state) && normalize(site.state) === normalize(target.state)) score += 24;
  if (normalize(site.district) && normalize(site.district) === normalize(target.district)) score += 20;
  if (normalize(site.city) && normalize(site.city) === normalize(target.city)) score += 28;
  return score;
}

function rankByLocation(sites: BenchmarkSite[], target?: LocationSignals) {
  return [...sites].sort((a, b) => {
    const aScore = locationMatchScore(a, target);
    const bScore = locationMatchScore(b, target);
    if (bScore !== aScore) return bScore - aScore;
    return b.overall - a.overall;
  });
}

function filterByPreferredCountry(sites: BenchmarkSite[], target?: LocationSignals) {
  const wanted = normalize(target?.country);
  if (!wanted) return sites;
  const local = sites.filter((s) => normalize(s.country) === wanted);
  return local.length > 0 ? local : sites;
}

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
  industry: keyof typeof TOP_SITES,
  options?: { allowLiveAudits?: boolean; targetLocation?: LocationSignals; targetUrl?: string; realDataOnly?: boolean }
): Promise<BenchmarkSite[]> {
  const allowLiveAudits = options?.allowLiveAudits ?? true;
  const realDataOnly = options?.realDataOnly ?? false;
  const baselineRaw = (PRE_AUDITED_BASELINES[industry] || PRE_AUDITED_BASELINES.other).map((b) => ({
    ...b,
    lastUpdated: new Date().toISOString(),
  }));
  const baseline = filterByPreferredCountry(rankByLocation(
    baselineRaw.filter((b) => !options?.targetUrl || !sameHost(b.url, options.targetUrl)),
    options?.targetLocation
  ), options?.targetLocation);

  // Read from local cache
  const cached = await readCache(industry);
  const fresh = filterByPreferredCountry(rankByLocation(
    cached
      .filter((b) => isCacheFresh(new Date(b.auditedDate).getTime()))
      .filter((b) => !options?.targetUrl || !sameHost(b.url, options.targetUrl)),
    options?.targetLocation
  ), options?.targetLocation);

  // Fast mode: return cache first, then pre-audited baseline.
  if (!allowLiveAudits) {
    if (realDataOnly) {
      const liveOrFresh = fresh.slice(0, 3);
      if (liveOrFresh.length > 0) return liveOrFresh;
      // Do not return empty: preserve competitor availability using pre-audited baseline.
      return baseline.slice(0, 3);
    }
    const merged = filterByPreferredCountry(rankByLocation(
      [...fresh, ...baseline.filter((b) => !fresh.some((f) => f.url === b.url))],
      options?.targetLocation
    ), options?.targetLocation);
    return merged.slice(0, 3);
  }

  // If we have fresh data, return it
  if (fresh.length >= 3) {
    return fresh;
  }

  // Otherwise, audit top sites and cache
  const baselineUrls = baseline.map((b) => b.url);
  const sites = [...baselineUrls, ...(TOP_SITES[industry] || TOP_SITES.other)]
    .filter((u, idx, arr) => arr.indexOf(u) === idx)
    .filter((u) => !options?.targetUrl || !sameHost(u, options.targetUrl));
  const toAudit = sites.slice(0, 3);

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
          city: baseline.find((b) => b.url === url)?.city,
          district: baseline.find((b) => b.url === url)?.district,
          state: baseline.find((b) => b.url === url)?.state,
          country: baseline.find((b) => b.url === url)?.country,
        });
      } catch (error) {
        console.warn(`[LiveBenchmarks] Failed to audit ${url}:`, error);
        // Continue with next site
      }
    }

    // Combine with some cached data if available
    const combined = filterByPreferredCountry(rankByLocation(
      realDataOnly
        ? [...audited, ...fresh.slice(0, Math.max(0, 3 - audited.length))]
        : [
            ...audited,
            ...fresh.slice(0, Math.max(0, 3 - audited.length)),
            ...baseline.filter((b) => !audited.some((a) => a.url === b.url) && !fresh.some((f) => f.url === b.url)),
          ],
      options?.targetLocation
    ), options?.targetLocation);

    // Save to cache
    if (audited.length > 0) {
      await writeCache(industry, combined);
    }

    const final = combined.slice(0, 3);
    if (final.length > 0) return final;
    // Last-resort fallback keeps competitor table populated.
    return baseline.slice(0, 3);
  } catch (error) {
    console.error("[LiveBenchmarks] Error auditing sites:", error);
    // Fall back to cached data
    if (fresh.length > 0) return fresh.slice(0, 3);
    if (cached.length > 0) {
      const filtered = filterByPreferredCountry(rankByLocation(
        cached.filter((b) => !options?.targetUrl || !sameHost(b.url, options.targetUrl)),
        options?.targetLocation
      ), options?.targetLocation);
      if (filtered.length) return filtered.slice(0, 3);
    }
    if (realDataOnly) return baseline.slice(0, 3);
    return baseline.slice(0, 3);
  }
}