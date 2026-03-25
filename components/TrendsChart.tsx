"use client";

import { useEffect, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type TrendPoint = {
  date: string;
  overall: number;
  rollingAverage?: number;
};

export default function TrendsChart({ history, rollingAverage = 0 }: { history: TrendPoint[]; rollingAverage?: number }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const latest = history[history.length - 1];
  const first = history[0];
  const deltaPct =
    history.length > 1 && first.overall > 0 ? Math.round(((latest.overall - first.overall) / first.overall) * 100) : 0;

  return (
    <article className="glass rounded-2xl border border-white/20 bg-gradient-to-br from-white/15 to-white/5 p-5 backdrop-blur-xl">
      <h2 className="mb-3 text-xl font-bold">Trends Tracking</h2>
      {history.length === 0 ? (
        <p className="text-sm text-slate-300">Run your first audit to start tracking progress.</p>
      ) : (
        <div className="space-y-2 text-sm text-slate-100">
          <div className="h-32 w-full min-w-0 rounded-lg bg-black/20 p-2">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart data={history.slice(-30)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" />
                  <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString()} tick={{ fill: "#cbd5e1", fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#cbd5e1", fontSize: 10 }} />
                  <Line type="monotone" dataKey="overall" stroke="#22d3ee" strokeWidth={2} dot={false} />
                  <Tooltip />
                  <Legend />
                </LineChart>
              </ResponsiveContainer>
            ) : null}
          </div>
          {history.slice(-5).map((p, index) => (
            <p key={`${p.date}-${index}`}>
              Audit #{history.length - Math.min(5, history.length) + index + 1} ({new Date(p.date).toLocaleDateString()}): {p.overall}/100
            </p>
          ))}
          <p className="pt-2 text-cyan-100">Lead potential trend: {deltaPct >= 0 ? "+" : ""}{deltaPct}% improvement</p>
          <p className="text-xs text-slate-300">Rolling average score: {rollingAverage}</p>
        </div>
      )}
    </article>
  );
}
