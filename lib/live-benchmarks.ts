import * as fs from "fs/promises";
import * as path from "path";
import type { BenchmarkSite, IndustryCategory } from "./audit-types";
import { getRecentIndustryBenchmarks } from "./live-database";

const CACHE_DIR = path.join(process.cwd(), "data", "benchmarks");
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

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
  industry: IndustryCategory,
  opts?: { targetUrl?: string; limit?: number }
): Promise<BenchmarkSite[]> {
  const maxItems = Math.max(1, Math.min(10, opts?.limit ?? 3));
  const targetHost = hostFromUrl(opts?.targetUrl || "");

  // Read from local cache and DB-backed live history.
  const cached = await readCache(industry);
  const fresh = cached.filter((b) => isCacheFresh(new Date(b.auditedDate).getTime()));
  const industryLive = await getRecentIndustryBenchmarks(industry, 32);

  // Prefer latest live industry records, then fresh cache, then stale cache.
  const merged = dedupeByHost([
    ...industryLive,
    ...fresh,
    ...cached,
  ]).filter((b) => hostFromUrl(b.url) !== targetHost);

  const ranked = merged
    .filter((b) => Number.isFinite(b.overall) && b.overall > 0)
    .sort((a, b) => b.overall - a.overall)
    .slice(0, maxItems);

  if (ranked.length > 0) {
    await writeCache(industry, ranked);
  }

  return ranked;
}

function hostFromUrl(input: string): string {
  try {
    return new URL(input).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

function dedupeByHost(items: BenchmarkSite[]): BenchmarkSite[] {
  const out = new Map<string, BenchmarkSite>();
  for (const item of items) {
    const host = hostFromUrl(item.url);
    if (!host || out.has(host)) continue;
    out.set(host, item);
  }
  return [...out.values()];
}
