import { chromium, devices } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import * as cheerio from "cheerio";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { generateContentSuggestions } from "./audit-engine";
import { generateAiInsights } from "./ai-insights";
import { detectIndustry } from "./industry";
import { computeTrendsSummary } from "./trends";
import { computeScores, prioritizeRecommendations } from "./scoring";
import type { AuditReport, Issue, StageTraceEntry } from "./audit-types";

const execFileAsync = promisify(execFile);
const PLAYWRIGHT_DESKTOP_TIMEOUT_MS = 15000;
const AXE_TIMEOUT_MS = 10000;
const MOBILE_TIMEOUT_MS = 12000;
const SCREENSHOT_TIMEOUT_MS = 18000;
const LIGHTHOUSE_TIMEOUT_MS = 25000;
const HTML_FETCH_TIMEOUT_MS = 10000;

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
  options: { includeAi?: boolean } = {}
): Promise<Omit<AuditReport, "competitors" | "analytics" | "roi" | "roiReason" | "isLive" | "status" | "liveTimestamp" | "auditId" | "history">> {
  const url = normalizeUrl(rawUrl);
  if (!url) throw new Error("Invalid URL.");

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid URL.");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Invalid URL.");

  const pipeline: string[] = ["validate-url"];
  const stageTrace: StageTraceEntry[] = [];
  const issues: Issue[] = [];

  let desktopHtml = "";
  let mobileHtml = "";
  let mobileTapTargets = 0;
  let playwrightFailed = false;
  let lighthouseFailed = false;

  const [playwrightResult, screenshotResult, lighthouseResult] = await Promise.allSettled([
    runStageTrace(stageTrace, "playwright", async () =>
      withTimeout(async () => {
      const browser = await chromium.launch({ headless: true });
      try {
        pipeline.push("playwright-desktop");
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: PLAYWRIGHT_DESKTOP_TIMEOUT_MS });
        desktopHtml = await page.content();

        pipeline.push("axe-accessibility");
        const axe = await withTimeout(async () => await new AxeBuilder({ page }).analyze(), AXE_TIMEOUT_MS, "axe");
        const axeViolations = axe.violations.length;
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

        pipeline.push("playwright-mobile");
        const mobileCtx = await browser.newContext({ ...devices["iPhone 13"] });
        const mobilePage = await mobileCtx.newPage();
        await mobilePage.goto(url, { waitUntil: "domcontentloaded", timeout: MOBILE_TIMEOUT_MS });
        mobileHtml = await mobilePage.content();
        mobileTapTargets = await mobilePage.locator("a,button,input[type='button'],input[type='submit']").count();
        await mobileCtx.close();
      } finally {
        await browser.close();
      }
    }, PLAYWRIGHT_DESKTOP_TIMEOUT_MS + AXE_TIMEOUT_MS + MOBILE_TIMEOUT_MS, "playwright")
    ),
    runStageTrace(stageTrace, "screenshot", async () => withTimeout(async () => {
      pipeline.push("puppeteer-screenshot");
      return await captureScreenshots(url);
    }, SCREENSHOT_TIMEOUT_MS, "screenshot")),
    runStageTrace(stageTrace, "lighthouse", async () => withTimeout(async () => {
      pipeline.push("lighthouse");
      return await runLighthouseCli(url);
    }, LIGHTHOUSE_TIMEOUT_MS, "lighthouse")),
  ]);

  if (playwrightResult.status === "rejected") {
    playwrightFailed = true;
    issues.push(
      failIssue(
        "uiux",
        "Playwright rendered scan failed",
        "Rendered browser scan failed; attempting live HTML fallback extraction.",
        "medium"
      )
    );

    const htmlFallback = await runStageTrace(stageTrace, "http-html", async () =>
      await withTimeout(async () => {
        const res = await fetch(url, {
          method: "GET",
          redirect: "follow",
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; SiteBlitzLiveAudit/1.0)",
            Accept: "text/html,application/xhtml+xml",
          },
        });
        if (!res.ok) throw new Error(`http-html returned ${res.status}`);
        return await res.text();
      }, HTML_FETCH_TIMEOUT_MS, "http-html")
    ).catch((error) => {
      throw withTrace(error, stageTrace);
    });

    desktopHtml = htmlFallback;
    mobileHtml = htmlFallback;
    mobileTapTargets = 0;
  }

  if (screenshotResult.status === "rejected") {
    issues.push(
      failIssue(
        "uiux",
        "Screenshot capture failed",
        "Puppeteer screenshot failed; continuing without screenshots.",
        "low"
      )
    );
  }

  if (lighthouseResult.status === "rejected") {
    lighthouseFailed = true;
    issues.push(
      failIssue(
        "performance",
        "Lighthouse scan failed",
        "Lighthouse metrics unavailable for this run; performance/SEO/accessibility may be conservative.",
        "medium"
      )
    );
  }

  if (!desktopHtml && lighthouseFailed) {
    throw withTrace(new Error("No usable live data: rendered scan and Lighthouse both failed."), stageTrace);
  }

  const screenshots = screenshotResult.status === "fulfilled" ? screenshotResult.value : undefined;
  const screenshot = screenshots?.desktop;

  const lighthousePerformance = Math.round(
    ((lighthouseResult.status === "fulfilled" ? lighthouseResult.value?.categories?.performance?.score : 0) ?? 0) * 100
  );
  const lighthouseSeo = Math.round(
    ((lighthouseResult.status === "fulfilled" ? lighthouseResult.value?.categories?.seo?.score : 0) ?? 0) * 100
  );
  const lighthouseAccessibility = Math.round(
    ((lighthouseResult.status === "fulfilled" ? lighthouseResult.value?.categories?.accessibility?.score : 0) ?? 0) * 100
  );

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
  const ctaCount = $("a,button,input[type='submit']")
    .filter((_, el) => {
      const text = $(el).text().toLowerCase().trim();
      const value = ($(el).attr("value") || "").toLowerCase();
      return /(book|demo|start|get|contact|free|trial|audit)/.test(`${text} ${value}`);
    })
    .length;
  const mobileTapTargetsOk = !playwrightFailed && mobileTapTargets >= 3;

  if (!titlePresent) issues.push(failIssue("seo", "Missing title tag", "Add a unique title to improve search snippets.", "high"));
  if (!metaDescriptionPresent) issues.push(failIssue("seo", "Missing meta description", "Add a description for stronger CTR in search results.", "medium"));
  if (h1Count !== 1) issues.push(failIssue("uiux", "Heading hierarchy issue", "Use exactly one H1 and structured H2/H3 sections.", "medium"));
  if (!hasViewport) issues.push(failIssue("mobile", "Missing viewport meta", "Add viewport meta for mobile layout.", "high"));
  if (!mobileTapTargetsOk) issues.push(failIssue("mobile", "Low mobile tap target coverage", "Increase tappable controls for mobile UX.", "medium"));
  if (formCount === 0) issues.push(failIssue("leadConversion", "No lead form detected", "Add a lead form near primary CTA.", "high"));
  if (ctaCount === 0) issues.push(failIssue("leadConversion", "No clear CTA text", "Add action-oriented CTAs.", "high"));

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
  const contentFixes = generateContentSuggestions(desktopHtml || mobileHtml, detectedIndustry.category, detectedIndustry.confidence);
  const trends = [{ date: new Date().toISOString(), overall: scores.overall }];
  const trendsSummary = computeTrendsSummary(trends);

  let aiInsights;
  if (options.includeAi !== false) {
    try {
      aiInsights = await runStageTrace(stageTrace, "ai", async () => await generateAiInsights({
          url,
          overall: scores.overall,
          recommendations,
          issueCount: issues.length,
        })
      );
    } catch (error) {
      throw withTrace(error, stageTrace);
    }
    pipeline.push("ai:model");
  }

  pipeline.push("summary");

  return {
    url,
    scores,
    issues,
    recommendations,
    detectedIndustry,
    contentFixes,
    trends,
    trendsSummary,
    aiInsights,
    disclaimers: ["Live-only mode: all values come from real-time scans."],
    summary: aiInsights?.executiveSummary || "AI summary unavailable",
    deterministicNotes: ["Scores are deterministic from live tooling outputs."],
    pipeline,
    screenshot,
    screenshots,
    seoDetails: {
      titleLength: titleText.length,
      metaLength: metaText.length,
      h1Count,
      wordCount,
      altMissing: Math.max(0, imgCount - altCount),
    },
    serpPreview: {
      title: titleText || "Homepage",
      description: metaText || "",
      url,
    },
    rawHtml: desktopHtml || mobileHtml,
    stageTrace,
  };
}

function withTrace(error: unknown, stageTrace: StageTraceEntry[]) {
  const wrapped = error instanceof Error ? error : new Error(String(error));
  (wrapped as Error & { stageTrace?: StageTraceEntry[] }).stageTrace = [...stageTrace];
  return wrapped;
}

async function withTimeout<T>(fn: () => Promise<T>, timeoutMs: number, stage: string): Promise<T> {
  return await Promise.race([
    fn(),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${stage} timed out after ${timeoutMs}ms`)), timeoutMs)),
  ]);
}

async function runStageTrace<T>(trace: StageTraceEntry[], stage: string, fn: () => Promise<T>): Promise<T> {
  const started = Date.now();
  const startedAt = new Date(started).toISOString();
  console.log("[pipeline:stage:start]", JSON.stringify({ stage, startedAt }));
  try {
    const result = await fn();
    const ended = Date.now();
    trace.push({
      stage,
      startedAt,
      endedAt: new Date(ended).toISOString(),
      durationMs: ended - started,
      status: "ok",
    });
    console.log("[pipeline:stage:end]", JSON.stringify({ stage, status: "ok", durationMs: ended - started }));
    return result;
  } catch (error) {
    const ended = Date.now();
    trace.push({
      stage,
      startedAt,
      endedAt: new Date(ended).toISOString(),
      durationMs: ended - started,
      status: "failed",
      error: error instanceof Error ? error.message : "unknown",
    });
    console.log("[pipeline:stage:end]", JSON.stringify({ stage, status: "failed", durationMs: ended - started, error: error instanceof Error ? error.message : "unknown" }));
    throw error;
  }
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
    { maxBuffer: 20 * 1024 * 1024, timeout: 60000, env: process.env }
  );

  const trimmed = stdout.trim();
  const start = trimmed.indexOf("{");
  if (start < 0) throw new Error("lighthouse stage failed: output missing JSON payload");
  return JSON.parse(trimmed.slice(start)) as { categories?: Record<string, { score: number }> };
}

async function captureScreenshots(url: string) {
  const start = Date.now();
  console.log("[screenshot:start]", JSON.stringify({ url, timeoutMs: SCREENSHOT_TIMEOUT_MS }));
  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-gpu"] });
  try {
    let desktop: string | undefined;
    let mobile: string | undefined;

    const desktopPage = await browser.newPage();
    await desktopPage.setViewport({ width: 1440, height: 2000 });
    try {
      await desktopPage.goto(url, { waitUntil: "networkidle2", timeout: SCREENSHOT_TIMEOUT_MS });
      const raw = ((await desktopPage.screenshot({ type: "png", fullPage: true })) as Buffer).toString("base64");
      desktop = `data:image/png;base64,${raw}`;
    } catch (error) {
      console.log("[screenshot:desktop:failed]", JSON.stringify({ url, error: error instanceof Error ? error.message : "unknown" }));
    }

    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    try {
      await mobilePage.goto(url, { waitUntil: "networkidle2", timeout: SCREENSHOT_TIMEOUT_MS });
      const raw = ((await mobilePage.screenshot({ type: "png", fullPage: true })) as Buffer).toString("base64");
      mobile = `data:image/png;base64,${raw}`;
    } catch (error) {
      console.log("[screenshot:mobile:failed]", JSON.stringify({ url, error: error instanceof Error ? error.message : "unknown" }));
    }

    if (!desktop && !mobile) {
      throw new Error("screenshot stage failed: both desktop and mobile captures failed");
    }
    console.log("[screenshot:end]", JSON.stringify({ url, durationMs: Date.now() - start, desktop: Boolean(desktop), mobile: Boolean(mobile) }));
    return { desktop, mobile };
  } finally {
    await browser.close();
  }
}
