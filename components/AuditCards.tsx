"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "./ui/Card";
import { Progress } from "./ui/Progress";

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
  if (score >= 80) return "bg-success";
  if (score >= 60) return "bg-warning";
  return "bg-destructive";
}

function severityLabel(score: number) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Average";
  return "Needs Work";
}

function severityColor(score: number) {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-warning";
  return "text-destructive";
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
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {fields.map((item) => {
        const value = display[item.key] ?? 0;
        return (
          <Card key={item.key} className="hover:border-foreground/20 transition-colors">
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground/80">{item.title}</h3>
                <span className="text-xs font-mono text-muted-foreground">{item.weight} weight</span>
              </div>
              <div className="mb-1 flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-foreground">{value}</span>
                <span className={`text-xs font-semibold uppercase ${severityColor(value)}`}>
                  {severityLabel(value)}
                </span>
              </div>
              <Progress value={value} className="mt-4 h-2 bg-secondary" indicatorClassName={getBarColor(value)} />
            </CardContent>
          </Card>
        );
      })}

      {typeof industryAverageOverall === "number" ? (
        <Card className="border-primary bg-primary/5 transition-colors">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-primary">Competitor Delta</h3>
              <span className="text-xs font-mono text-muted-foreground">Benchmark</span>
            </div>
            <div className="mb-1 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-foreground">
                {scores.overall - industryAverageOverall > 0 ? "+" : ""}
                {scores.overall - industryAverageOverall}
              </span>
              <span className="text-xs font-semibold uppercase text-primary">Points vs Avg</span>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Your overall score compared to the industry average of {industryAverageOverall}.</p>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
