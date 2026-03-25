const SCREENSHOT_NAV_TIMEOUT_MS = 30000;
/** Wait after navigation before capture so JS-heavy / lazy sites paint real content (not blank). */
const POST_LOAD_SETTLE_MS = 2000;
const DESKTOP_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const MOBILE_UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

type ScreenshotOptions = {
  navTimeoutMs?: number;
  settleMs?: number;
  includeMobile?: boolean;
};

async function preparePage(page: import("puppeteer").Page, userAgent: string, navTimeoutMs: number) {
  await page.setUserAgent(userAgent);
  await page.setDefaultNavigationTimeout(navTimeoutMs + 15000);
  await page.setExtraHTTPHeaders({
    "Accept-Language": "en-US,en;q=0.9",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Upgrade-Insecure-Requests": "1",
  });
}

async function safeGoto(page: import("puppeteer").Page, url: string, navTimeoutMs: number, settleMs: number) {
  try {
    // Use networkidle2 instead of networkidle0 so tracking pixels don't cause timeouts
    await page.goto(url, { waitUntil: "networkidle2", timeout: navTimeoutMs });
  } catch {
    // Keep fallback bounded so fast mode does not exceed API budget.
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 5000 });
    } catch (err) {
      console.warn("[screenshot:safeGoto:fallback]", String(err));
    }
  }
  // Let client-side render, images, and fonts settle before screenshot
  await new Promise((r) => setTimeout(r, settleMs));
}

async function tryCapture(
  page: import("puppeteer").Page,
  url: string,
  navTimeoutMs: number,
  settleMs: number
): Promise<string | undefined> {
  try {
    await safeGoto(page, url, navTimeoutMs, settleMs);
    // Request raw base64 string directly from Puppeteer to avoid Buffer casting errors
    const raw = await page.screenshot({ type: "png", fullPage: false, encoding: "base64" });
    if (typeof raw === "string") {
      return `data:image/png;base64,${raw}`;
    }
    return undefined;
  } catch (err) {
    console.warn("[screenshot:tryCapture:error]", String(err));
    return undefined;
  }
}

export async function captureScreenshots(url: string, options: ScreenshotOptions = {}) {
  const navTimeoutMs = options.navTimeoutMs ?? SCREENSHOT_NAV_TIMEOUT_MS;
  const settleMs = options.settleMs ?? POST_LOAD_SETTLE_MS;
  const includeMobile = options.includeMobile ?? true;
  const start = Date.now();
  console.log("[screenshot:start]", JSON.stringify({ url, timeoutMs: navTimeoutMs, includeMobile }));

  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--use-gl=swiftshader",
      "--enable-webgl",
      "--ignore-gpu-blocklist",
      "--enable-unsafe-swiftshader",
    ],
  });

  try {
    let desktop: string | undefined;
    let mobile: string | undefined;

    const desktopPage = await browser.newPage();
    await desktopPage.setViewport({ width: 1366, height: 900 });
    await preparePage(desktopPage, DESKTOP_UA, navTimeoutMs);
    desktop = await tryCapture(desktopPage, url, navTimeoutMs, settleMs);
    if (!desktop) {
      // One relaxed retry for JS-heavy sites that miss the first short window.
      desktop = await tryCapture(desktopPage, url, Math.max(navTimeoutMs, 10000), Math.max(settleMs, 800));
    }
    if (!desktop) {
      const error = new Error("desktop screenshot retry exhausted");
      console.log("[screenshot:desktop:failed]", JSON.stringify({ url, error: error instanceof Error ? error.message : "unknown" }));
    }

    if (includeMobile) {
      const mobilePage = await browser.newPage();
      await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
      await preparePage(mobilePage, MOBILE_UA, navTimeoutMs);
      mobile = await tryCapture(mobilePage, url, navTimeoutMs, settleMs);
      if (!mobile) {
        mobile = await tryCapture(mobilePage, url, Math.max(navTimeoutMs, 10000), Math.max(settleMs, 800));
      }
      if (!mobile) {
        const error = new Error("mobile screenshot retry exhausted");
        console.log("[screenshot:mobile:failed]", JSON.stringify({ url, error: error instanceof Error ? error.message : "unknown" }));
      }
    }

    if (!desktop && !mobile) {
      throw new Error("screenshot stage failed: both desktop and mobile captures failed");
    }

    console.log(
      "[screenshot:end]",
      JSON.stringify({ url, durationMs: Date.now() - start, desktop: Boolean(desktop), mobile: Boolean(mobile) })
    );

    return { desktop, mobile };
  } finally {
    await browser.close();
  }
}
