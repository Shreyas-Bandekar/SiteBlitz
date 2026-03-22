"use client";

import { useEffect, useRef, useState } from "react";
import { Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, Tooltip } from "recharts";

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
      setChartWidth(Math.max(280, width - 8));
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
    <div ref={containerRef} className="glass w-full min-w-0 rounded-2xl border border-white/20 bg-gradient-to-br from-white/15 to-white/5 p-4">
      <h3 className="mb-3 text-lg font-bold text-white">Score Radar</h3>
      {mounted ? (
        <div className="w-full overflow-x-auto">
          <RadarChart width={chartWidth} height={280} data={data}>
            <PolarGrid stroke="rgba(255,255,255,0.25)" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: "#e2e8f0", fontSize: 12 }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#cbd5e1", fontSize: 10 }} />
            <Tooltip formatter={(value) => [`${String(value)}/100`, "Score"]} />
            <Legend />
            <Radar name="Category Score" dataKey="value" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.35} />
          </RadarChart>
        </div>
      ) : null}
    </div>
  );
}
