import type { IndustryCategory, ROIResult } from "./audit-types";

interface TrafficEstimate {
  traffic: number;
  conversionRate: number;
  avgOrderValue: number;
  dataSource: string;
  confidence: number;
}

// Industry defaults combined with PageSpeed insights
const INDUSTRY_DEFAULTS: Record<
  IndustryCategory,
  { traffic: number; conversionRate: number; avgOrderValue: number }
> = {
  ecommerce: { traffic: 45000, conversionRate: 0.025, avgOrderValue: 2500 },
  saas: { traffic: 28000, conversionRate: 0.032, avgOrderValue: 5500 },
  local_service: { traffic: 18000, conversionRate: 0.045, avgOrderValue: 3200 },
  agency: { traffic: 22000, conversionRate: 0.018, avgOrderValue: 4500 },
  media: { traffic: 85000, conversionRate: 0.008, avgOrderValue: 150 },
  nonprofit: { traffic: 15000, conversionRate: 0.04, avgOrderValue: 2000 },
  manufacturing: { traffic: 32000, conversionRate: 0.012, avgOrderValue: 25000 },
  other: { traffic: 25000, conversionRate: 0.02, avgOrderValue: 3500 },
};

export async function getFreeTrafficEstimate(
  industry: IndustryCategory,
  overallScore?: number
): Promise<TrafficEstimate> {
  const defaults = INDUSTRY_DEFAULTS[industry] || INDUSTRY_DEFAULTS.other;
  const overall = Math.min(100, Math.max(0, Math.round(overallScore ?? 65)));
  /** Deterministic nudge from score (no randomness): ~0.92–1.08× base traffic */
  const trafficMult = 0.92 + (overall / 100) * 0.16;
  const convMult = 0.97 + (overall / 100) * 0.06;
  const aovMult = 0.96 + ((overall * 13) % 9) * 0.01;

  return {
    traffic: Math.round(defaults.traffic * trafficMult),
    conversionRate: Math.min(0.2, Math.max(0.001, defaults.conversionRate * convMult)),
    avgOrderValue: Math.round(defaults.avgOrderValue * aovMult),
    dataSource: "Industry benchmarks + deterministic score-based calibration",
    confidence: Math.round(58 + overall * 0.22),
  };
}

export async function calculateLiveROI(
  scores: { overall: number },
  industry: IndustryCategory,
  trafficData?: TrafficEstimate
): Promise<ROIResult | null> {
  try {
    const traffic =
      trafficData?.traffic || INDUSTRY_DEFAULTS[industry].traffic;
    const conversionRate =
      trafficData?.conversionRate || INDUSTRY_DEFAULTS[industry].conversionRate;
    const avgOrderValue =
      trafficData?.avgOrderValue || INDUSTRY_DEFAULTS[industry].avgOrderValue;

    // Conservative lift calculation based on score gap
    const scoreGap = Math.max(0, 100 - Math.min(100, scores.overall));
    const liftMultiplier = 0.18; // 18% max lift for median performing site
    const projectedLift = (scoreGap / 100) * liftMultiplier;
    const projectedConversionRate = conversionRate * (1 + projectedLift);

    const currentRevenue = Math.round(traffic * conversionRate * avgOrderValue);
    const projectedRevenue = Math.round(
      traffic * projectedConversionRate * avgOrderValue
    );
    const monthlyUplift = projectedRevenue - currentRevenue;
    const upliftPercent =
      currentRevenue > 0
        ? Math.round((monthlyUplift / currentRevenue) * 100)
        : 0;

    const template: ROIResult["template"] =
      industry === "ecommerce" || industry === "saas" || industry === "local_service" ? industry : "custom";

    return {
      traffic,
      conversionRate,
      avgOrderValue,
      currency: "INR",
      currentRevenue,
      projectedRevenue,
      monthlyUplift,
      upliftPercent,
      template,
    };
  } catch (error) {
    console.error("[FreeROI] Error calculating ROI:", error);
    return null;
  }
}
