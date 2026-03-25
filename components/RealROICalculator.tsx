"use client";

import type { ROIResult } from "../lib/audit-types";

function inr(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

export default function RealROICalculator({ roi, reason }: { roi: ROIResult | null; reason?: string }) {
  if (!roi) {
    return (
      <div className="rounded-2xl border border-amber-300/30 bg-amber-500/10 p-5 text-sm text-amber-100">
        ROI unavailable: {reason || "No public analytics signals found."}
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-2xl border border-emerald-300/30 bg-emerald-500/10 p-5 text-white md:grid-cols-3">
      <div>
        <p className="text-xs uppercase text-emerald-100/80">Current</p>
        <p className="text-xl font-bold">{inr(roi.currentRevenue)}</p>
      </div>
      <div>
        <p className="text-xs uppercase text-emerald-100/80">Projected</p>
        <p className="text-xl font-bold">{inr(roi.projectedRevenue)}</p>
      </div>
      <div>
        <p className="text-xs uppercase text-emerald-100/80">Monthly Uplift</p>
        <p className="text-xl font-bold">{inr(roi.monthlyUplift)}</p>
      </div>
    </div>
  );
}
