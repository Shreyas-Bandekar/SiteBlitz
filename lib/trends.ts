import type { TrendsSummary } from "./audit-types";

export function computeTrendsSummary(history: Array<{ date: string; overall: number }>): TrendsSummary {
  if (history.length === 0) return { deltaPercent: 0, rollingAverage: 0, leadPotentialTrend: 0 };
  const first = history[0].overall;
  const latest = history[history.length - 1].overall;
  const recent = history.slice(-5);
  const rollingAverage = Math.round(recent.reduce((acc, item) => acc + item.overall, 0) / recent.length);
  const deltaPercent = first > 0 ? Math.round(((latest - first) / first) * 100) : 0;
  const leadPotentialTrend = Math.max(0, Math.round((latest - rollingAverage) * 0.8));
  return { deltaPercent, rollingAverage, leadPotentialTrend };
}
