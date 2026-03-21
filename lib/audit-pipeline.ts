import { chromium, devices } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import * as cheerio from "cheerio";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { env } from "./env";
import { log } from "./logger";
import { generateContentSuggestions } from "./audit-engine";
import { generateAiInsights } from "./ai-insights";
import { getSameIndustryCompetitors } from "./benchmarks";
import { detectIndustry } from "./industry";
import { calculateEnterpriseRoi } from "./roi";
import { computeTrendsSummary } from "./trends";
import {
  computeScores,
  getCachedReport,
  getCachedScore,
  isRetest,
  makeScoreCacheKey,
  prioritizeRecommendations,
  setCachedReport,
  setCachedScore,
} from "./scoring";
import type { AuditReport, Issue } from "./audit-types";

const execFileAsync = promisify(execFile);
const PLAYWRIGHT_TIMEOUT_MS = 12000;
const SCREENSHOT_TIMEOUT_MS = 12000;
const LIGHTHOUSE_TIMEOUT_MS = 30000;

function normalizeUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function failIssue(category: Issue["category"], title: string, detail: string, severity: Issue["severity"]): Issue {
  return { category, title, detail, severity };
}

export async function runAuditPipeline(
  rawUrl: string,
  options: { roiEnabled?: boolean; roiTemplate?: "ecommerce" | "saas" | "local_service" | "custom" } = {}
): Promise<AuditReport> {
  const url = normalizeUrl(rawUrl);
  if (!url) throw new Error("URL is required.");
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid URL format.");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Only http/https URLs are supported.");
  const cachedReport = getCachedReport(url);
  if (cachedReport) {
    return { ...cachedReport, pipeline: [...cachedReport.pipeline, "cached-result"] };
  }

  const pipeline: string[] = ["validate-url"];
  const issues: Issue[] = [];

  log("info", "Starting audit pipeline", { url });

  let desktopHtml = "";
  let mobileHtml = "";
  let mobileTapTargets = 0;
  let axeViolations = -1;
  let screenshot: string | undefined;
  let screenshots: { desktop?: string; mobile?: string } | undefined;

  const retest = isRetest(url);
  let playwrightOk = false;
  const playwrightStage = retest
    ? Promise.resolve()
    : withTimeout(async () => {
      const browser = await chromium.launch({ headless: true });
      try {
        pipeline.push("playwright-desktop");
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: PLAYWRIGHT_TIMEOUT_MS });
        desktopHtml = await page.content();

        pipeline.push("axe-accessibility");
        try {
          const axe = await new AxeBuilder({ page }).analyze();
          axeViolations = axe.violations.length;
          if (axeViolations > 0) {
            issues.push(
              failIssue(
                "accessibility",
                "Accessibility violations detected",
                `axe-core reported ${axeViolations} violation group(s).`,
                axeViolations > 10 ? "high" : axeViolations > 3 ? "medium" : "low"
              )
            );
          }
        } catch (error) {
          issues.push(failIssue("accessibility", "axe-core scan unavailable", "Accessibility scan failed; using Lighthouse accessibility as fallback baseline.", "low"));
          log("warn", "Axe stage failed", { message: error instanceof Error ? error.message : "unknown" });
        }

        pipeline.push("playwright-mobile");
        const mobileCtx = await browser.newContext({ ...devices["iPhone 13"] });
        const mobilePage = await mobileCtx.newPage();
        await mobilePage.goto(url, { waitUntil: "domcontentloaded", timeout: PLAYWRIGHT_TIMEOUT_MS });
        mobileHtml = await mobilePage.content();
        mobileTapTargets = await mobilePage.locator("a,button,input[type='button'],input[type='submit']").count();
        await mobileCtx.close();
        playwrightOk = true;
      } finally {
        await browser.close();
      }
    }, PLAYWRIGHT_TIMEOUT_MS, "playwright");

  const screenshotStage = retest
    ? Promise.resolve(undefined)
    : withTimeout(async () => {
        pipeline.push("puppeteer-screenshot");
        return await captureScreenshots(url);
      }, SCREENSHOT_TIMEOUT_MS, "puppeteer");

  let lighthousePerformance = 0;
  let lighthouseSeo = 0;
  let lighthouseAccessibility = 0;
  const lighthouseStage = withTimeout(async () => {
    pipeline.push("lighthouse");
    const perfCache = getCachedScore(makeScoreCacheKey(url, "lighthouse:performance"));
    const seoCache = getCachedScore(makeScoreCacheKey(url, "lighthouse:seo"));
    const accessCache = getCachedScore(makeScoreCacheKey(url, "lighthouse:accessibility"));
    if (perfCache !== null && seoCache !== null && accessCache !== null) {
      return { performance: perfCache, seo: seoCache, accessibility: accessCache };
    }
    const lighthouseData = await runLighthouseCli(url);
    const performance = Math.round((lighthouseData?.categories?.performance?.score ?? 0) * 100);
    const seo = Math.round((lighthouseData?.categories?.seo?.score ?? 0) * 100);
    const accessibility = Math.round((lighthouseData?.categories?.accessibility?.score ?? 0) * 100);
    setCachedScore(makeScoreCacheKey(url, "lighthouse:performance"), performance);
    setCachedScore(makeScoreCacheKey(url, "lighthouse:seo"), seo);
    setCachedScore(makeScoreCacheKey(url, "lighthouse:accessibility"), accessibility);
    return { performance, seo, accessibility };
  }, LIGHTHOUSE_TIMEOUT_MS, "lighthouse");

  const [playwrightResult, screenshotResult, lighthouseResult] = await Promise.allSettled([
    playwrightStage,
    screenshotStage,
    lighthouseStage,
  ]);

  if (playwrightResult.status === "rejected") {
    issues.push(failIssue("uiux", "Rendered checks unavailable", "Playwright stage failed; report generated with available checks only.", "medium"));
    log("warn", "Playwright stage failed", { message: playwrightResult.reason instanceof Error ? playwrightResult.reason.message : "unknown" });
  }
  if (screenshotResult.status === "fulfilled") {
    screenshots = screenshotResult.value;
    screenshot = screenshotResult.value?.desktop;
  } else if (!retest) {
    issues.push(failIssue("uiux", "Screenshot capture skipped", "Puppeteer screenshot timed out or target blocked rendering.", "low"));
    log("warn", "Puppeteer screenshot failed", { message: screenshotResult.reason instanceof Error ? screenshotResult.reason.message : "unknown" });
  }
  if (lighthouseResult.status === "fulfilled") {
    lighthousePerformance = lighthouseResult.value.performance;
    lighthouseSeo = lighthouseResult.value.seo;
    lighthouseAccessibility = lighthouseResult.value.accessibility;
  } else {
    issues.push(failIssue("performance", "Lighthouse unavailable", "Performance/SEO baseline unavailable; fallback scoring applied.", "medium"));
    log("warn", "Lighthouse stage failed", { message: lighthouseResult.reason instanceof Error ? lighthouseResult.reason.message : "unknown" });
  }

  if (!playwrightOk && lighthousePerformance === 0 && lighthouseSeo === 0 && lighthouseAccessibility === 0) {
    throw new Error("Target unreachable or blocked, and scan timed out across all stages.");
  }

  const $ = cheerio.load(desktopHtml || "<html></html>");
  const m$ = cheerio.load(mobileHtml || desktopHtml || "<html></html>");
  const h1Count = $("h1").length;
  const titlePresent = $("title").text().trim().length > 0;
  const metaDescriptionPresent = $('meta[name="description"]').length > 0;
  const hasViewport = m$('meta[name="viewport"]').length > 0;
  const titleText = $("title").text().trim();
  const metaText = $('meta[name="description"]').attr("content")?.trim() || "";
  const formCount = $("form").length;
  const imgCount = $("img").length;
  const altCount = $("img[alt]").length;
  const wordCount = $("body").text().replace(/\s+/g, " ").trim().split(" ").filter(Boolean).length;
  const ctaCount = $("a,button,input[type='submit']").filter((_, el) => {
    const text = $(el).text().toLowerCase().trim();
    const value = ($(el).attr("value") || "").toLowerCase();
    return /(book|demo|start|get|contact|free|trial|audit)/.test(`${text} ${value}`);
  }).length;
  const mobileTapTargetsOk = playwrightOk ? mobileTapTargets >= 3 : false;

  if (!titlePresent) issues.push(failIssue("seo", "Missing title tag", "Add a unique title to improve search snippets.", "high"));
  if (!metaDescriptionPresent) {
    issues.push(failIssue("seo", "Missing meta description", "Add a description for stronger CTR in search results.", "medium"));
  }
  if (h1Count !== 1) issues.push(failIssue("uiux", "Heading hierarchy issue", "Use exactly one H1 and structured H2/H3 sections.", "medium"));
  if (!hasViewport) issues.push(failIssue("mobile", "Missing viewport meta", "Add a viewport meta tag for mobile layout.", "high"));
  if (!mobileTapTargetsOk) issues.push(failIssue("mobile", "Low mobile tap target coverage", "Increase tappable controls for mobile UX.", "medium"));
  if (formCount === 0) issues.push(failIssue("leadConversion", "No lead form detected", "Add a lead form near primary CTA.", "high"));
  if (ctaCount === 0) issues.push(failIssue("leadConversion", "No clear CTA text", "Add action-oriented CTAs like Start Free Trial.", "high"));
  if (lighthousePerformance > 0 && lighthousePerformance < 60) {
    issues.push(failIssue("performance", "Low Lighthouse performance score", "Optimize LCP, JS execution, and image sizes.", "high"));
  }

  const scores = computeScores({
    lighthousePerformance,
    lighthouseSeo,
    lighthouseAccessibility,
    hasViewport,
    mobileTapTargetsOk,
    h1Count,
    titlePresent,
    metaDescriptionPresent,
    formCount,
    ctaCount,
  });

  const recommendations = prioritizeRecommendations(issues).sort((a, b) => {
    const rank = { high: 3, medium: 2, low: 1 };
    return rank[b.priority] - rank[a.priority];
  });

  pipeline.push("report-assembly");
  const detectedIndustry = detectIndustry(desktopHtml || mobileHtml);
  const competitors = getSameIndustryCompetitors({
    industry: detectedIndustry.category,
    yourScores: scores,
    confidence: detectedIndustry.confidence,
  });
  const roi = calculateEnterpriseRoi({
    enabled: options.roiEnabled ?? true,
    confidence: detectedIndustry.confidence,
    template: options.roiTemplate ?? (detectedIndustry.category === "ecommerce"
      ? "ecommerce"
      : detectedIndustry.category === "saas"
        ? "saas"
        : detectedIndustry.category === "local_service"
          ? "local_service"
          : "custom"),
    traffic: 10000,
    score: scores.overall,
  });
  const contentFixes = generateContentSuggestions(desktopHtml || mobileHtml, detectedIndustry.category, detectedIndustry.confidence);
  const trends = [{ date: new Date().toISOString(), overall: scores.overall }];
  const trendsSummary = computeTrendsSummary(trends);
  const seoDetails = {
    titleLength: titleText.length,
    metaLength: metaText.length,
    h1Count,
    wordCount,
    altMissing: Math.max(0, imgCount - altCount),
  };
  const serpPreview = {
    title: titleText || "Homepage",
    description: metaText || "Website audit preview unavailable. Add a meta description for better search snippets.",
    url,
  };
  const disclaimers = [
    "Deterministic scores are measured from Lighthouse, Playwright, axe-core, and DOM parsing.",
    "Industry classification and content guidance are estimated from page signals.",
  ];
  if (detectedIndustry.confidence < 75) {
    disclaimers.push("Industry confidence is below threshold; competitor and ROI outputs are intentionally hidden.");
  }
  if (options.roiEnabled === false) {
    disclaimers.push("ROI is disabled by user preference for this audit run.");
  }
  setCachedScore(makeScoreCacheKey(url, "overall"), scores.overall);

  const deterministicNotes = [
    "All scores are deterministic from Lighthouse, axe-core, Playwright checks, and DOM parsing.",
    "AI insights are generated locally with Ollama when available and fall back deterministically when unavailable.",
    "Lighthouse metrics are cached for 24 hours to speed up repeat audits.",
  ];
  const aiInsights = await generateAiInsights({
    url,
    overall: scores.overall,
    recommendations,
    issueCount: issues.length,
  });
  const summary = aiInsights.executiveSummary;
  pipeline.push(aiInsights.source === "model" ? "ai:model" : "ai:fallback");
  pipeline.push("summary");

  const report: AuditReport = {
    url,
    scores,
    issues,
    recommendations,
    detectedIndustry,
    competitors: detectedIndustry.confidence >= 75 ? competitors : null,
    roi,
    contentFixes,
    trends,
    trendsSummary,
    aiInsights,
    disclaimers,
    summary,
    deterministicNotes,
    pipeline,
    screenshot,
    screenshots,
    seoDetails,
    serpPreview,
  };
  setCachedReport(url, report);
  return report;
}

async function withTimeout<T>(fn: () => Promise<T>, timeoutMs: number, stage: string): Promise<T> {
  return await Promise.race([
    fn(),
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${stage} timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

async function runLighthouseCli(url: string) {
  const chromePath = chromium.executablePath();
  const { stdout } = await execFileAsync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    [
      "lighthouse",
      url,
      "--output=json",
      "--output-path=stdout",
      "--quiet",
      "--only-categories=performance,seo,accessibility",
      `--chrome-path=${chromePath}`,
      "--chrome-flags=--headless --no-sandbox --disable-gpu --disable-dev-shm-usage",
    ],
    {
      maxBuffer: 20 * 1024 * 1024,
      timeout: 45000,
      env: process.env,
    }
  );

  const trimmed = stdout.trim();
  const start = trimmed.indexOf("{");
  if (start < 0) throw new Error("Lighthouse output missing JSON payload.");
  const parsed = JSON.parse(trimmed.slice(start)) as { categories?: Record<string, { score: number }> };
  return parsed;
}

async function captureScreenshots(url: string) {
  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-gpu"] });
  try {
    const desktopPage = await browser.newPage();
    await desktopPage.setViewport({ width: 1440, height: 2000 });
    await desktopPage.goto(url, { waitUntil: "networkidle2", timeout: SCREENSHOT_TIMEOUT_MS });
    const desktop = ((await desktopPage.screenshot({ type: "png", fullPage: true })) as Buffer).toString("base64");

    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await mobilePage.goto(url, { waitUntil: "networkidle2", timeout: SCREENSHOT_TIMEOUT_MS });
    const mobile = ((await mobilePage.screenshot({ type: "png", fullPage: true })) as Buffer).toString("base64");

    return { desktop, mobile };
  } finally {
    await browser.close();
  }
}
