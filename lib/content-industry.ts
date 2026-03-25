import * as cheerio from "cheerio";
import type { IndustryCategory } from "./audit-types";

interface IndustrySignals {
  category: IndustryCategory;
  confidence: number;
  matchedSignals: string[];
}

const INDUSTRY_KEYWORDS: Record<IndustryCategory, string[]> = {
  ecommerce: [
    "cart",
    "buy now",
    "add to cart",
    "checkout",
    "price",
    "product",
    "shop",
    "store",
    "purchase",
    "order",
    "pay",
    "shipping",
  ],
  saas: [
    "sign up",
    "get started",
    "demo",
    "trial",
    "login",
    "dashboard",
    "free trial",
    "pricing plans",
    "features",
    "api",
    "integrations",
    "cloud",
  ],
  local_service: [
    "book now",
    "contact us",
    "appointment",
    "service",
    "near me",
    "location",
    "address",
    "phone",
    "schedule",
    "available",
    "booking",
  ],
  agency: [
    "portfolio",
    "case studies",
    "team",
    "creative",
    "design",
    "marketing",
    "campaign",
    "services",
    "expertise",
    "work",
    "clients",
  ],
  media: [
    "article",
    "news",
    "read more",
    "published",
    "author",
    "category",
    "tags",
    "subscribe",
    "newsletter",
    "latest",
    "trending",
  ],
  nonprofit: [
    "donate",
    "donation",
    "charity",
    "mission",
    "volunteer",
    "community",
    "impact",
    "cause",
    "help us",
    "support",
    "organization",
  ],
  manufacturing: [
    "product",
    "specifications",
    "industrial",
    "solutions",
    "materials",
    "quality",
    "certifications",
    "supplier",
    "export",
    "wholesale",
    "distributor",
  ],
  other: ["website", "page", "content", "information"],
};

export function detectIndustryFromContent(html: string): IndustrySignals {
  const $ = cheerio.load(html || "");

  // Extract text content
  const text = $("body").text().toLowerCase();
  const title = $("title").text().toLowerCase();
  const metaDesc = $('meta[name="description"]').attr("content") || "";
  const h1Text = $("h1").text().toLowerCase();

  // Combine all text sources
  const combinedText = `${title} ${metaDesc} ${h1Text} ${text}`.toLowerCase();

  // Score each industry
  const scores = Object.entries(INDUSTRY_KEYWORDS).map(
    ([industry, keywords]) => {
      const matched = keywords.filter((kw) =>
        combinedText.includes(kw.toLowerCase())
      );

      return {
        industry: industry as IndustryCategory,
        score: matched.length,
        matched,
      };
    }
  );

  // Sort by score
  scores.sort((a, b) => b.score - a.score);

  const topMatch = scores[0];
  const topScore = topMatch.score;
  const secondScore = scores[1]?.score ?? 0;

  // Calculate confidence (0-100)
  let confidence = 0;
  if (topScore === 0) {
    confidence = 5; // Almost no signals detected
  } else if (topScore >= 5) {
    confidence = Math.min(95, 60 + topScore * 5); // High confidence for many matches
  } else {
    confidence = Math.min(85, 40 + topScore * 8); // Medium confidence
  }

  // Reduce confidence if close between top 2
  if (secondScore > 0 && topScore - secondScore <= 2) {
    confidence = Math.min(confidence, 65);
  }

  return {
    category: topMatch.industry,
    confidence: Math.round(confidence),
    matchedSignals: topMatch.matched.slice(0, 5), // Top 5 matched keywords
  };
}

export function improveIndustryDetectionWithMetrics(
  htmlContent: string,
  formCount: number,
  ctalCount: number
): IndustrySignals {
  const baseDetection = detectIndustryFromContent(htmlContent);

  // Adjust confidence based on content structure signals
  let adjustedConfidence = baseDetection.confidence;

  // Local service and agencies often have forms
  if (formCount >= 2 && baseDetection.category !== "ecommerce") {
    adjustedConfidence = Math.min(100, adjustedConfidence + 10);
  }

  // Ecommerce and SaaS often have multiple CTAs
  if (ctalCount >= 3 && ["ecommerce", "saas"].includes(baseDetection.category)) {
    adjustedConfidence = Math.min(100, adjustedConfidence + 8);
  }

  return {
    ...baseDetection,
    confidence: adjustedConfidence,
  };
}
