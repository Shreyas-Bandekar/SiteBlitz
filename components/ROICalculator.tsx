"use client";

type ROI = {
  traffic: number;
  conversionRate: number;
  avgOrderValue: number;
  currency: "INR";
  currentRevenue: number;
  projectedRevenue: number;
  monthlyUplift: number;
  upliftPercent: number;
  template: "ecommerce" | "saas" | "local_service" | "custom";
};

function fmtMoney(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export default function ROICalculator({ revenue }: { revenue: ROI }) {
  return (
    <article className="glass rounded-2xl border border-emerald-200/30 bg-gradient-to-br from-emerald-300/10 to-cyan-300/10 p-5 backdrop-blur-xl">
      <h2 className="mb-3 text-xl font-bold">ROI Calculator</h2>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-white/20 bg-white/10 p-3">
          <p className="text-xs text-slate-300">Current Revenue / mo</p>
          <p className="text-2xl font-bold">{fmtMoney(revenue.currentRevenue)}</p>
          <p className="text-xs text-slate-300">({(revenue.conversionRate * 100).toFixed(1)}% conversion)</p>
        </div>
        <div className="rounded-xl border border-white/20 bg-white/10 p-3">
          <p className="text-xs text-slate-300">After Fixes / mo</p>
          <p className="text-2xl font-bold">{fmtMoney(revenue.projectedRevenue)}</p>
          <p className="text-xs text-slate-300">Template: {revenue.template}</p>
        </div>
        <div className="rounded-xl border border-emerald-300/50 bg-emerald-300/15 p-3">
          <p className="text-xs text-emerald-100">Revenue Uplift</p>
          <p className="text-2xl font-black text-emerald-100">+{fmtMoney(revenue.monthlyUplift)}</p>
          <p className="text-xs text-emerald-100">+{revenue.upliftPercent}% growth potential</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-300">
        Assumptions: traffic {revenue.traffic.toLocaleString("en-IN")}/month, conversion {(revenue.conversionRate * 100).toFixed(2)}%,
        AOV {fmtMoney(revenue.avgOrderValue)}.
      </p>
    </article>
  );
}
