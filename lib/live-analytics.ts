import * as cheerio from "cheerio";
import type { LiveAnalytics } from "./audit-types";

function parseNumber(text: string | undefined) {
  if (!text) return null;
  const clean = text.replace(/,/g, "").trim();
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
}

export function extractLiveAnalytics(html: string): LiveAnalytics {
  const $ = cheerio.load(html || "");
  const scripts = $("script")
    .map((_, el) => $(el).html() || "")
    .get()
    .join("\n");

  const ga4Id = scripts.match(/G-[A-Z0-9]{8,}/i)?.[0] ?? null;
  const users = parseNumber(scripts.match(/monthlyUsers\s*[:=]\s*([0-9,]+)/i)?.[1]);
  const aov = parseNumber(scripts.match(/avgOrderValue\s*[:=]\s*([0-9,]+(?:\.[0-9]+)?)/i)?.[1]);
  const conv = parseNumber(scripts.match(/conversionRate\s*[:=]\s*([0-9]+(?:\.[0-9]+)?)/i)?.[1]);

  return {
    ga4Id: {
      value: ga4Id,
      confidence: ga4Id ? 95 : 0,
      evidence: ga4Id ? [`Found measurement ID ${ga4Id}`] : [],
    },
    monthlyUsers: {
      value: users,
      confidence: users ? 80 : 0,
      evidence: users ? ["Found monthlyUsers token in live page scripts"] : [],
    },
    avgOrderValue: {
      value: aov,
      confidence: aov ? 80 : 0,
      evidence: aov ? ["Found avgOrderValue token in live page scripts"] : [],
    },
    conversionRate: {
      value: conv,
      confidence: conv ? 80 : 0,
      evidence: conv ? ["Found conversionRate token in live page scripts"] : [],
    },
  };
}
