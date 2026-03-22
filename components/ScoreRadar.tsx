"use client";

import { useEffect, useRef, useState } from "react";
import { Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";

type Scores = {
  uiux: number;
  performance: number;
  mobile: number;
  accessibility: number;
  seo: number;
  leadConversion: number;
};

export default function ScoreRadar({ scores }: { scores: Scores }) {
  const [mounted, setMounted] = useState(false);
  const [chartWidth, setChartWidth] = useState(420);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const update = () => {
      const width = containerRef.current?.clientWidth ?? 420;
      setChartWidth(Math.max(280, width - 40));
    };
    update();

    const observer = new ResizeObserver(() => update());
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const data = [
    { subject: "UI/UX", value: scores.uiux },
    { subject: "Performance", value: scores.performance },
    { subject: "Mobile", value: scores.mobile },
    { subject: "Accessibility", value: scores.accessibility },
    { subject: "SEO", value: scores.seo },
    { subject: "Leads", value: scores.leadConversion },
  ];

  function bandForScore(v: number): { label: string; className: string } {
    if (v >= 80) return { label: "Strong", className: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" };
    if (v >= 60) return { label: "Solid", className: "bg-sky-500/20 text-sky-600 dark:text-sky-400" };
    if (v >= 40) return { label: "Fair", className: "bg-amber-500/20 text-amber-700 dark:text-amber-400" };
    return { label: "At risk", className: "bg-rose-500/20 text-rose-600 dark:text-rose-400" };
  }

  return (
    <Card ref={containerRef} className="w-full min-w-0">
      <CardHeader>
        <CardTitle className="text-lg">Radar Breakdown</CardTitle>
        <p className="text-sm text-muted-foreground">Six-pillar view of your site quality (same axes as the PDF export).</p>
      </CardHeader>
      <CardContent className="space-y-6 pb-5">
        <div className="flex justify-center">
          {mounted ? (
            <RadarChart width={chartWidth} height={240} data={data}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontWeight: 500 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} />
              <Tooltip
                formatter={(value) => [`${String(value)} / 100`, "Score"]}
                contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--foreground)" }}
                itemStyle={{ color: "var(--primary)", fontWeight: 600 }}
              />
              <Radar name="Score Allocation" dataKey="value" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          ) : (
            <div className="h-[240px] w-full animate-pulse bg-secondary rounded-xl" />
          )}
        </div>

        <div className="rounded-xl border border-border bg-secondary/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[280px]">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-2.5 py-2.5 font-semibold whitespace-nowrap">Dimension</th>
                  <th className="px-2.5 py-2.5 font-semibold whitespace-nowrap">Score</th>
                  <th className="px-2.5 py-2.5 font-semibold hidden sm:table-cell w-[90px]">Scale</th>
                  <th className="px-2.5 py-2.5 font-semibold whitespace-nowrap">Band</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((row) => {
                  const band = bandForScore(row.value);
                  return (
                    <tr key={row.subject} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-2.5 py-2.5 font-medium text-foreground whitespace-nowrap">{row.subject}</td>
                      <td className="px-2.5 py-2.5 tabular-nums text-primary font-semibold">{row.value}</td>
                      <td className="px-2.5 py-2.5 hidden sm:table-cell">
                        <div className="h-1.5 w-full max-w-[100px] rounded-full bg-border overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary/80"
                            style={{ width: `${Math.min(100, Math.max(0, row.value))}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-2.5 py-2.5 whitespace-nowrap">
                        <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium ${band.className}`}>{band.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
