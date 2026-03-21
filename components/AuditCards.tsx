"use client";

import { useEffect, useMemo, useState } from "react";

type Scores = {
  uiux: number;
  performance: number;
  mobile: number;
  accessibility: number;
  seo: number;
  leadConversion: number;
  overall: number;
};

const LABELS: Array<{ key: keyof Scores; title: string; weight?: string }> = [
  { key: "uiux", title: "UI/UX", weight: "20%" },
  { key: "performance", title: "Performance", weight: "20%" },
  { key: "mobile", title: "Mobile", weight: "15%" },
  { key: "accessibility", title: "Accessibility", weight: "15%" },
  { key: "seo", title: "SEO", weight: "20%" },
  { key: "leadConversion", title: "Lead Conversion", weight: "10%" },
];

function getBarColor(score: number) {
  if (score >= 80) return "from-emerald-400 to-green-300";
  if (score >= 60) return "from-amber-300 to-yellow-300";
  return "from-rose-400 to-red-300";
}

function severityLabel(score: number) {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Moderate";
  return "Critical";
}

export default function AuditCards({ scores, industryAverageOverall }: { scores: Scores; industryAverageOverall?: number }) {
  const [display, setDisplay] = useState<Record<string, number>>({});

  const fields = useMemo(
    () =>
      LABELS.map((entry) => ({
        ...entry,
        value: scores[entry.key],
      })),
    [scores]
  );

  useEffect(() => {
    const durationMs = 900;
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const next: Record<string, number> = {};
      for (const f of fields) next[f.key] = Math.round(f.value * t);
      setDisplay(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [fields]);

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {fields.map((item) => {
        const value = display[item.key] ?? 0;
        return (
          <article
            key={item.key}
            className="glass shimmer rounded-2xl border border-white/20 bg-gradient-to-br from-white/15 to-white/5 p-5 shadow-xl transition-transform hover:scale-105"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-wide text-slate-100">{item.title}</h3>
              <span className="text-xs text-slate-300">{item.weight}</span>
            </div>
            <div className="mb-2 text-3xl font-bold text-white">{value}</div>
            <p className="mb-2 text-xs text-slate-300">Severity: {severityLabel(value)}</p>
            <div className="h-2.5 w-full rounded-full bg-white/15">
              <div
                className={`h-2.5 rounded-full bg-gradient-to-r ${getBarColor(value)} transition-all duration-500`}
                style={{ width: `${value}%` }}
              />
            </div>
          </article>
        );
      })}
      {typeof industryAverageOverall === "number" ? (
        <article className="glass shimmer rounded-2xl border border-cyan-200/30 bg-gradient-to-br from-cyan-300/10 to-violet-300/10 p-5 shadow-xl">
          <div className="mb-2 text-sm font-semibold text-cyan-100">Competitor Delta</div>
          <div className="text-3xl font-bold text-white">{scores.overall - industryAverageOverall}</div>
          <p className="mt-2 text-xs text-slate-200">Difference vs industry average overall score benchmark.</p>
        </article>
      ) : null}
    </section>
  );
}
