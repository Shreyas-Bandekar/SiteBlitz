import type { ROIResult } from "./audit-types";

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
