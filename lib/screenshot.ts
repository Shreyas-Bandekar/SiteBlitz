const SCREENSHOT_NAV_TIMEOUT_MS = 30000;
const DESKTOP_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const MOBILE_UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

async function preparePage(page: import("puppeteer").Page, userAgent: string) {
  await page.setUserAgent(userAgent);
  await page.setDefaultNavigationTimeout(SCREENSHOT_NAV_TIMEOUT_MS + 15000);
  await page.setExtraHTTPHeaders({
    "Accept-Language": "en-US,en;q=0.9",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Upgrade-Insecure-Requests": "1",
  });
}

async function safeGoto(page: import("puppeteer").Page, url: string) {
  try {
    await page.goto(url, { waitUntil: "networkidle0", timeout: SCREENSHOT_NAV_TIMEOUT_MS });
  } catch {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: SCREENSHOT_NAV_TIMEOUT_MS + 15000 });
  }
  // Brief settle for headless paint / lazy storefronts (Shopify, etc.)
  await new Promise((r) => setTimeout(r, 400));
}

export async function captureScreenshots(url: string) {
  const start = Date.now();
  console.log("[screenshot:start]", JSON.stringify({ url, timeoutMs: SCREENSHOT_NAV_TIMEOUT_MS }));

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
    await preparePage(desktopPage, DESKTOP_UA);
    try {
      await safeGoto(desktopPage, url);
      const raw = ((await desktopPage.screenshot({ type: "png", fullPage: false })) as Buffer).toString("base64");
      desktop = `data:image/png;base64,${raw}`;
    } catch (error) {
      console.log("[screenshot:desktop:failed]", JSON.stringify({ url, error: error instanceof Error ? error.message : "unknown" }));
    }

    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await preparePage(mobilePage, MOBILE_UA);
    try {
      await safeGoto(mobilePage, url);
      const raw = ((await mobilePage.screenshot({ type: "png", fullPage: false })) as Buffer).toString("base64");
      mobile = `data:image/png;base64,${raw}`;
    } catch (error) {
      console.log("[screenshot:mobile:failed]", JSON.stringify({ url, error: error instanceof Error ? error.message : "unknown" }));
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
