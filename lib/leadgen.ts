import * as cheerio from "cheerio";
import type { Page } from "playwright";

type ContactEvidence = {
  hasContactForm: boolean;
  confidence: number;
  evidence: string[];
  staticFormMatches: number;
  dynamicFormMatches: number;
  iframeWidgetMatches: number;
  modalTriggerMatches: number;
  hasSubmitControl: boolean;
};

export type LeadGenResult = {
  score: number;
  issues: string[];
  quick_wins: Array<{ action: string; effort: string; impact: string; code?: string }>;
  aboveFoldCta: boolean;
  hasContactForm: boolean;
  contactFormConfidence: number;
  contactFormEvidence: string[];
  hasPasswordForm: boolean;
  roiImpact: string;
};

const CONTACT_WIDGET_RE = /(contact|typeform|hubspot|jotform|formstack|calendly|tally)/i;
const CONTACT_TRIGGER_RE = /(contact|quote|consult|demo|book|schedule|enquire|enquiry|get in touch)/i;

function countStaticFormMatches(html: string) {
  const $ = cheerio.load(html || "");
  const forms = $("form");
  let staticFormMatches = 0;
  let hasSubmitControl = false;
  const evidence: string[] = [];

  forms.each((idx, form) => {
    const root = $(form);
    const controls = root.find("input, textarea, select, button");
    const hasEmail = controls.filter((_, el) => {
      const e = $(el);
      const text = `${e.attr("type") || ""} ${e.attr("name") || ""} ${e.attr("id") || ""} ${e.attr("placeholder") || ""}`.toLowerCase();
      return text.includes("email");
    }).length > 0;
    const hasName = controls.filter((_, el) => {
      const e = $(el);
      const text = `${e.attr("name") || ""} ${e.attr("id") || ""} ${e.attr("placeholder") || ""}`.toLowerCase();
      return text.includes("name");
    }).length > 0;
    const hasPhone = controls.filter((_, el) => {
      const e = $(el);
      const text = `${e.attr("type") || ""} ${e.attr("name") || ""} ${e.attr("id") || ""} ${e.attr("placeholder") || ""}`.toLowerCase();
      return text.includes("phone") || text.includes("mobile") || text.includes("tel");
    }).length > 0;
    const hasMessage = controls.filter((_, el) => {
      const e = $(el);
      const tag = String((el as unknown as { tagName?: string }).tagName || "");
      const text = `${tag} ${e.attr("name") || ""} ${e.attr("id") || ""} ${e.attr("placeholder") || ""}`.toLowerCase();
      return text.includes("message") || text.includes("textarea") || text.includes("comment");
    }).length > 0;
    const submitMatches = controls.filter((_, el) => {
      const e = $(el);
      const text = `${e.attr("type") || ""} ${e.attr("name") || ""} ${e.attr("id") || ""} ${e.text() || ""} ${e.attr("value") || ""}`.toLowerCase();
      return text.includes("submit") || text.includes("send") || text.includes("quote") || text.includes("contact");
    }).length;
    if (submitMatches > 0) hasSubmitControl = true;
    const fieldScore = [hasEmail, hasName || hasPhone, hasMessage].filter(Boolean).length;
    if (fieldScore >= 2 || (hasEmail && submitMatches > 0)) {
      staticFormMatches += 1;
      if (idx < 2) evidence.push(`Static form matched (${fieldScore}/3 key fields)`);
    }
  });

  const iframeWidgetMatches = $("iframe").filter((_, el) => {
    const src = $(el).attr("src") || "";
    const title = $(el).attr("title") || "";
    const text = `${src} ${title}`;
    return CONTACT_WIDGET_RE.test(text);
  }).length;
  if (iframeWidgetMatches > 0) evidence.push(`Contact widget iframe detected (${iframeWidgetMatches})`);

  const modalTriggerMatches = $("a,button,[role='button']").filter((_, el) => {
    const e = $(el);
    const text = `${e.text()} ${e.attr("aria-label") || ""} ${e.attr("data-modal") || ""} ${e.attr("data-bs-target") || ""} ${e.attr("href") || ""} ${e.attr("onclick") || ""}`;
    return CONTACT_TRIGGER_RE.test(text);
  }).length;
  if (modalTriggerMatches > 0) evidence.push(`Contact modal trigger detected (${modalTriggerMatches})`);

  return { staticFormMatches, iframeWidgetMatches, modalTriggerMatches, hasSubmitControl, evidence };
}

type PageLike = Pick<Page, "waitForTimeout" | "evaluate"> & {
  frames?: () => Array<{ url: () => string }>;
};

async function detectDynamicFormEvidence(page?: PageLike | null) {
  if (!page) {
    return { dynamicFormMatches: 0, iframeWidgetMatches: 0, modalTriggerMatches: 0, evidence: [] as string[] };
  }

  const waits = [0, 700, 1500];
  let best = { dynamicFormMatches: 0, iframeWidgetMatches: 0, modalTriggerMatches: 0, evidence: [] as string[] };
  for (const ms of waits) {
    if (ms > 0) await page.waitForTimeout(ms);
    const sample = await page.evaluate(() => {
      const controls = (root: ParentNode) => Array.from(root.querySelectorAll("input,textarea,button,select"));
      const forms = Array.from(document.querySelectorAll("form"));
      const matchedForms = forms.filter((form) => {
        const c = controls(form);
        const tokens = c.map((el) => `${(el as HTMLInputElement).type || ""} ${(el as HTMLInputElement).name || ""} ${(el as HTMLInputElement).id || ""} ${(el as HTMLInputElement).placeholder || ""} ${(el.textContent || "")}`.toLowerCase());
        const hasEmail = tokens.some((t) => t.includes("email"));
        const hasNameOrPhone = tokens.some((t) => t.includes("name") || t.includes("phone") || t.includes("mobile") || t.includes("tel"));
        const hasMessage = tokens.some((t) => t.includes("message") || t.includes("comment")) || Array.from(form.querySelectorAll("textarea")).length > 0;
        const hasSubmit = tokens.some((t) => t.includes("submit") || t.includes("send") || t.includes("quote") || t.includes("contact"));
        return (hasEmail && hasSubmit) || [hasEmail, hasNameOrPhone, hasMessage].filter(Boolean).length >= 2;
      }).length;

      const iframeWidgetMatches = Array.from(document.querySelectorAll("iframe")).filter((f) => {
        const text = `${f.getAttribute("src") || ""} ${f.getAttribute("title") || ""}`.toLowerCase();
        return /(contact|typeform|hubspot|jotform|formstack|calendly|tally)/.test(text);
      }).length;

      const modalTriggerMatches = Array.from(document.querySelectorAll("a,button,[role='button']")).filter((el) => {
        const text = `${el.textContent || ""} ${el.getAttribute("aria-label") || ""} ${el.getAttribute("data-modal") || ""} ${el.getAttribute("data-bs-target") || ""} ${el.getAttribute("href") || ""} ${el.getAttribute("onclick") || ""}`.toLowerCase();
        return /(contact|quote|consult|demo|book|schedule|enquire|enquiry|get in touch)/.test(text);
      }).length;

      return { matchedForms, iframeWidgetMatches, modalTriggerMatches };
    });
    if (sample.matchedForms > best.dynamicFormMatches) {
      best = {
        dynamicFormMatches: sample.matchedForms,
        iframeWidgetMatches: sample.iframeWidgetMatches,
        modalTriggerMatches: sample.modalTriggerMatches,
        evidence: [`Dynamic DOM forms matched (${sample.matchedForms})`],
      };
    }
  }
  return best;
}

export async function detectContactFormEvidence(
  html: string,
  page?: PageLike | null
): Promise<ContactEvidence> {
  const staticEvidence = countStaticFormMatches(html);
  const dynamicEvidence = await detectDynamicFormEvidence(page);
  const iframeFrameMatches = (page?.frames?.() || []).filter((f) => CONTACT_WIDGET_RE.test(f.url())).length;

  const dynamicFormMatches = dynamicEvidence.dynamicFormMatches;
  const iframeWidgetMatches =
    staticEvidence.iframeWidgetMatches + dynamicEvidence.iframeWidgetMatches + iframeFrameMatches;
  const modalTriggerMatches = Math.max(staticEvidence.modalTriggerMatches, dynamicEvidence.modalTriggerMatches);
  const modalLikelyForm = modalTriggerMatches >= 2;
  const hasContactForm =
    staticEvidence.staticFormMatches > 0 || dynamicFormMatches > 0 || iframeWidgetMatches > 0 || modalLikelyForm;
  const evidence = [
    ...staticEvidence.evidence,
    ...dynamicEvidence.evidence,
    ...(iframeFrameMatches > 0 ? [`Frame URL contact widgets detected (${iframeFrameMatches})`] : []),
  ];

  let confidence = 20;
  if (staticEvidence.staticFormMatches > 0) confidence += 55;
  if (dynamicFormMatches > 0) confidence += 20;
  if (iframeWidgetMatches > 0) confidence += 15;
  if (modalTriggerMatches > 0) confidence += 8;
  if (staticEvidence.hasSubmitControl) confidence += 5;
  confidence = Math.min(99, Math.max(5, confidence));
  if (modalLikelyForm && !staticEvidence.staticFormMatches && !dynamicFormMatches) {
    confidence = Math.max(confidence, 68);
    evidence.push("Modal/contact triggers strongly indicate form flow");
  }
  if (!hasContactForm) confidence = Math.min(confidence, 40);
  if (!evidence.length) evidence.push("No contact form evidence in static or dynamic scan");

  return {
    hasContactForm,
    confidence,
    evidence,
    staticFormMatches: staticEvidence.staticFormMatches,
    dynamicFormMatches,
    iframeWidgetMatches,
    modalTriggerMatches,
    hasSubmitControl: staticEvidence.hasSubmitControl,
  };
}

/** Rule-based lead-gen scoring: no AI dependency. */
export async function analyzeLeadGen(
  healthData: { html: string; lighthouse?: unknown },
  page?: Page | null
): Promise<LeadGenResult> {
  const { html } = healthData;
  const $ = cheerio.load(html);

  const contactFormEvidence = await detectContactFormEvidence(html, page || null);
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

  if (contactFormEvidence.hasContactForm) {
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
    hasContactForm: contactFormEvidence.hasContactForm,
    contactFormConfidence: contactFormEvidence.confidence,
    contactFormEvidence: contactFormEvidence.evidence,
    hasPasswordForm,
    roiImpact,
  };
}
