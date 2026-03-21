import type { ROIResult } from "./audit-types";
import type { DeterministicScores, LiveAnalytics } from "./audit-types";

type RoiTemplate = "ecommerce" | "saas" | "local_service" | "custom";
type RoiInput = {
  enabled: boolean;
  confidence: number;
  template?: RoiTemplate;
  traffic?: number;
  conversionRate?: number;
  avgOrderValue?: number;
  score: number;
};

const DEFAULTS: Record<RoiTemplate, { conversionRate: number; avgOrderValue: number; liftMultiplier: number }> = {
  ecommerce: { conversionRate: 0.02, avgOrderValue: 2500, liftMultiplier: 0.28 },
  saas: { conversionRate: 0.03, avgOrderValue: 6000, liftMultiplier: 0.24 },
  local_service: { conversionRate: 0.06, avgOrderValue: 3000, liftMultiplier: 0.18 },
  custom: { conversionRate: 0.025, avgOrderValue: 4000, liftMultiplier: 0.2 },
};

export function calculateEnterpriseRoi(input: RoiInput): ROIResult | undefined {
  if (!input.enabled || input.confidence < 75) return undefined;
  const template: RoiTemplate = input.template ?? "custom";
  const baseline = DEFAULTS[template];
  const traffic = Math.max(1, input.traffic ?? 10000);
  const conversionRate = Math.max(0.001, input.conversionRate ?? baseline.conversionRate);
  const avgOrderValue = Math.max(1, input.avgOrderValue ?? baseline.avgOrderValue);
  const scoreGap = Math.max(0, 100 - Math.min(100, input.score));
  const deterministicLift = Number((scoreGap / 100 * baseline.liftMultiplier).toFixed(4));
  const projectedConversion = conversionRate * (1 + deterministicLift);
  const currentRevenue = Math.round(traffic * conversionRate * avgOrderValue);
  const projectedRevenue = Math.round(traffic * projectedConversion * avgOrderValue);
  const monthlyUplift = projectedRevenue - currentRevenue;
  const upliftPercent = Math.round((monthlyUplift / Math.max(1, currentRevenue)) * 100);

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
}

export function calculateRealROI(scores: DeterministicScores, analytics: LiveAnalytics): { roi: ROIResult | null; reason?: string } {
  const monthlyUsers = toPositiveNumber(analytics.monthlyUsers.value);
  const avgOrderValue = toPositiveNumber(analytics.avgOrderValue.value);
  const conversionRate = toPositiveNumber(analytics.conversionRate.value);

  const missing: string[] = [];
  if (!monthlyUsers) missing.push("monthlyUsers");
  if (!avgOrderValue) missing.push("avgOrderValue");
  if (!conversionRate) missing.push("conversionRate");
  if (missing.length) {
    return { roi: null, reason: `Insufficient public analytics signals (${missing.join(", ")}).` };
  }

  const users = monthlyUsers as number;
  const aov = avgOrderValue as number;
  const conv = conversionRate as number;

  const scoreGap = Math.max(0, 100 - Math.min(100, scores.overall));
  const improvementFactor = Number((1 + (scoreGap / 100) * 0.2).toFixed(4));
  const projectedConversionRate = conv * improvementFactor;

  const currentRevenue = Math.round(users * conv * aov);
  const projectedRevenue = Math.round(users * projectedConversionRate * aov);
  const monthlyUplift = projectedRevenue - currentRevenue;
  const upliftPercent = currentRevenue > 0 ? Math.round((monthlyUplift / currentRevenue) * 100) : 0;

  return {
    roi: {
      traffic: users,
      conversionRate: conv,
      avgOrderValue: aov,
      currency: "INR",
      currentRevenue,
      projectedRevenue,
      monthlyUplift,
      upliftPercent,
      template: "custom",
    },
  };
}

function toPositiveNumber(value: string | number | null): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string") {
    const n = Number(value.replace(/,/g, "").trim());
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}
