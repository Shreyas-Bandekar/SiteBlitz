"use client";

import { useEffect, useRef, useState } from "react";
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  Tooltip,
} from "recharts";
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
    if (v >= 80)
      return {
        label: "Strong",
        className: "bg-emerald-500/20 text-emerald-300",
      };
    if (v >= 60)
      return { label: "Solid", className: "bg-lime-500/20 text-lime-300" };
    if (v >= 40)
      return { label: "Fair", className: "bg-amber-500/20 text-amber-300" };
    return { label: "At risk", className: "bg-rose-500/20 text-rose-300" };
  }

  return (
    <Card ref={containerRef} className="liquid-glass-soft w-full min-w-0">
      <CardHeader>
        <CardTitle className="text-lg text-emerald-100">
          Radar Breakdown
        </CardTitle>
        <p className="text-sm text-emerald-100/65">
          Six-pillar view of your site quality (same axes as the PDF export).
        </p>
      </CardHeader>
      <CardContent className="space-y-6 pb-5">
        <div className="flex justify-center">
          {mounted ? (
            <RadarChart width={chartWidth} height={240} data={data}>
              <PolarGrid stroke="rgba(110,231,183,0.25)" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: "#a7f3d0", fontSize: 11, fontWeight: 600 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: "#86efac", fontSize: 10 }}
                axisLine={false}
              />
              <Tooltip
                formatter={(value) => [`${String(value)} / 100`, "Score"]}
                contentStyle={{
                  backgroundColor: "#06110b",
                  border: "1px solid rgba(74,222,128,0.35)",
                  borderRadius: "10px",
                  color: "#d1fae5",
                }}
                itemStyle={{ color: "#6ee7b7", fontWeight: 700 }}
              />
              <Radar
                name="Score Allocation"
                dataKey="value"
                stroke="#6ee7b7"
                fill="#6ee7b7"
                fillOpacity={0.24}
                strokeWidth={2.5}
              />
            </RadarChart>
          ) : (
            <div className="h-[240px] w-full animate-pulse rounded-xl bg-emerald-950/50" />
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-emerald-300/20 bg-black/45">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[280px]">
              <thead>
                <tr className="border-b border-emerald-300/20 bg-emerald-500/10 text-left text-xs uppercase tracking-wider text-emerald-100/75">
                  <th className="px-2.5 py-2.5 font-semibold whitespace-nowrap">
                    Dimension
                  </th>
                  <th className="px-2.5 py-2.5 font-semibold whitespace-nowrap">
                    Score
                  </th>
                  <th className="px-2.5 py-2.5 font-semibold hidden sm:table-cell w-[90px]">
                    Scale
                  </th>
                  <th className="px-2.5 py-2.5 font-semibold whitespace-nowrap">
                    Band
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-300/10">
                {data.map((row) => {
                  const band = bandForScore(row.value);
                  return (
                    <tr
                      key={row.subject}
                      className="transition-colors hover:bg-emerald-900/20"
                    >
                      <td className="px-2.5 py-2.5 font-medium text-emerald-100 whitespace-nowrap">
                        {row.subject}
                      </td>
                      <td className="px-2.5 py-2.5 tabular-nums text-emerald-200 font-semibold">
                        {row.value}
                      </td>
                      <td className="px-2.5 py-2.5 hidden sm:table-cell">
                        <div className="h-1.5 w-full max-w-[100px] overflow-hidden rounded-full bg-emerald-900/70">
                          <div
                            className="h-full rounded-full bg-emerald-300"
                            style={{
                              width: `${Math.min(100, Math.max(0, row.value))}%`,
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-2.5 py-2.5 whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium ${band.className}`}
                        >
                          {band.label}
                        </span>
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
