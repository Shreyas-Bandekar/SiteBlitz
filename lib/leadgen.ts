import * as cheerio from "cheerio";
import type { Page } from "playwright";

export type LeadGenResult = {
  score: number;
  issues: string[];
  quick_wins: Array<{ action: string; effort: string; impact: string; code?: string }>;
  aboveFoldCta: boolean;
  hasContactForm: boolean;
  hasPasswordForm: boolean;
  roiImpact: string;
};

/** Rule-based lead-gen scoring: no AI dependency. */
export async function analyzeLeadGen(
  healthData: { html: string; lighthouse?: unknown },
  page?: Page | null
): Promise<LeadGenResult> {
  const { html } = healthData;
  const $ = cheerio.load(html);

  const formCount = $("form").length;
  const passwordForms = $("form input[type='password']").length;
  const hasPasswordForm = passwordForms > 0;

  // All CTAs: explicit .cta class, onclick handlers, or "click here" link text
  const ctaCount =
    $(".cta").length +
    $("[onclick]").length +
    $("a, button").filter((_, el) => /click here|get started|contact us|free|demo|quote/i.test($(el).text())).length;

  // Above-fold CTA check: either via Playwright or a heuristic from first 4KB of HTML
  let aboveFoldCta = false;
  if (page) {
    try {
      aboveFoldCta = await page.evaluate(() => {
        const ctaSelectors = [".cta", "[onclick]"];
        const textCtas = Array.from(document.querySelectorAll("a, button")).filter((el) =>
          /click here|get started|contact us|free|demo|quote/i.test(el.textContent || "")
        );
        const allCtas = [
          ...ctaSelectors.flatMap((s) => Array.from(document.querySelectorAll(s))),
          ...textCtas,
        ] as HTMLElement[];
        return allCtas.some((el) => {
          const rect = el.getBoundingClientRect();
          return rect.top < window.innerHeight && rect.bottom > 0;
        });
      });
    } catch {
      // fallback to heuristic
      aboveFoldCta = /cta|quote|contact|call|demo/i.test(html.slice(0, 5000));
    }
  } else {
    aboveFoldCta = /cta|quote|contact|call|demo/i.test(html.slice(0, 5000));
  }

  // Phone/WhatsApp/email links
  const directContactLinks = $("a[href^='tel:'], a[href^='mailto:'], a[href*='wa.me']").length;

  // --- Scoring ---
  let score = 0;
  const issues: string[] = [];
  const quick_wins: LeadGenResult["quick_wins"] = [];

  if (formCount >= 1) {
    score += 8;
  } else {
    issues.push("No contact form detected — add one above the fold");
    quick_wins.push({
      action: "Hero → 'Get Quote' sticky CTA",
      effort: "5min",
      impact: "+18% conversions",
      code: `<button class="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-full shadow-lg z-50">💬 Get Quote</button>`,
    });
  }

  if (ctaCount >= 2 && aboveFoldCta) {
    score += 7;
  } else {
    issues.push("Fewer than 2 visible CTAs above the fold — 3 CTAs → +25% leads");
    quick_wins.push({
      action: "Add a prominent CTA above the fold",
      effort: "30min",
      impact: "+25% leads",
    });
  }

  if (!hasPasswordForm) {
    // Frictionless: no login barriers on main lead-gen page
    score += 5;
  } else {
    issues.push("Login/password form detected — consider a frictionless lead pathway");
  }

  if (directContactLinks > 0) {
    score += 5;
  } else {
    issues.push("No WhatsApp/phone/email link found");
    quick_wins.push({
      action: "Add WhatsApp/tel above fold",
      effort: "10min",
      impact: "+12% leads",
      code: `<a href="https://wa.me/YOUR_NUMBER" class="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-lg">📱 WhatsApp</a>`,
    });
  }

  // Bonus: multiple forms or newsletter signup
  const newsletterForm = $("form input[type='email']").length > 0;
  if (newsletterForm) score += 5;

  const finalScore = Math.min(100, Math.round(score * 3.33)); // scale 0–30 → 0–100

  // Simple ROI estimate based on score deficit
  const deficit = 100 - finalScore;
  const roiImpact = deficit > 50 ? "₹1.8L/mo" : deficit > 25 ? "₹75K/mo" : "₹50K/mo";

  return {
    score: finalScore,
    issues,
    quick_wins,
    aboveFoldCta,
    hasContactForm: formCount >= 1,
    hasPasswordForm,
    roiImpact,
  };
}
