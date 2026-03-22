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

  return (
    <Card ref={containerRef} className="w-full min-w-0">
      <CardHeader>
        <CardTitle className="text-lg">Radar Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="flex justify-center pb-6">
        {mounted ? (
          <RadarChart width={chartWidth} height={280} data={data}>
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
        ) : <div className="h-[280px] w-full animate-pulse bg-secondary rounded-xl" />}
      </CardContent>
    </Card>
  );
}
