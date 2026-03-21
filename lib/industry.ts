import type { IndustryCategory, IndustryDetection } from "./audit-types";

type Rule = { category: IndustryCategory; regex: RegExp; weight: number; signal: string };

const RULES: Rule[] = [
  { category: "ecommerce", regex: /(add to cart|checkout|shop now|product|sku|price|buy now)/i, weight: 22, signal: "commerce-cta" },
  { category: "ecommerce", regex: /(woocommerce|shopify|productschema|offers)/i, weight: 20, signal: "commerce-schema-platform" },
  { category: "saas", regex: /(start free trial|get started|book demo|pricing plan|api docs|integrations)/i, weight: 20, signal: "saas-funnel" },
  { category: "saas", regex: /(saas|b2b software|cloud platform|enterprise software)/i, weight: 16, signal: "saas-copy" },
  { category: "local_service", regex: /(book appointment|call now|near me|service area|opening hours)/i, weight: 20, signal: "local-service-cta" },
  { category: "local_service", regex: /(google maps|address|phone|whatsapp|location)/i, weight: 14, signal: "local-service-contact" },
  { category: "agency", regex: /(our clients|portfolio|case studies|creative agency|marketing agency)/i, weight: 20, signal: "agency-proof" },
  { category: "media", regex: /(subscribe|newsletter|breaking news|editorial|latest stories)/i, weight: 20, signal: "media-publisher" },
  { category: "nonprofit", regex: /(donate|volunteer|our mission|charity|nonprofit)/i, weight: 24, signal: "nonprofit-mission" },
  { category: "manufacturing", regex: /(factory|industrial|supply chain|oem|machinery|rfq)/i, weight: 20, signal: "manufacturing-b2b" },
];

function extractSignals(html: string) {
  const title = html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1] ?? "";
  const h1 = html.match(/<h1[^>]*>(.*?)<\/h1>/i)?.[1] ?? "";
  const metaDescription =
    html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)?.[1] ?? "";
  const schema = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)?.join(" ") ?? "";
  return `${title} ${h1} ${metaDescription} ${html} ${schema}`.toLowerCase();
}

export function detectIndustry(htmlRaw: string): IndustryDetection {
  const corpus = extractSignals(String(htmlRaw || ""));
  const byCategory = new Map<IndustryCategory, { score: number; signals: string[] }>();
  for (const rule of RULES) {
    if (!rule.regex.test(corpus)) continue;
    const current = byCategory.get(rule.category) ?? { score: 0, signals: [] };
    current.score += rule.weight;
    current.signals.push(rule.signal);
    byCategory.set(rule.category, current);
  }

  if (byCategory.size === 0) {
    return { category: "other", confidence: 45, matchedSignals: ["insufficient-industry-signals"] };
  }

  let best: IndustryCategory = "other";
  let bestScore = -1;
  let bestSignals: string[] = [];
  for (const [category, payload] of byCategory.entries()) {
    if (payload.score > bestScore) {
      best = category;
      bestScore = payload.score;
      bestSignals = payload.signals;
    }
  }
  const confidence = Math.min(100, Math.max(35, 40 + bestScore));
  return { category: best, confidence, matchedSignals: bestSignals.slice(0, 8) };
}
