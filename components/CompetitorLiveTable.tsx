"use client";

import type { LiveCompetitorAudit } from "../lib/audit-types";

export default function CompetitorLiveTable({ competitors }: { competitors: LiveCompetitorAudit[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
      <table className="min-w-full text-sm">
        <thead className="bg-white/10 text-left text-white/80">
          <tr>
            <th className="px-4 py-3">Competitor</th>
            <th className="px-4 py-3">Overall</th>
            <th className="px-4 py-3">Audited</th>
          </tr>
        </thead>
        <tbody>
          {competitors.map((row) => (
            <tr key={`${row.url}-${row.timestamp}`} className="border-t border-white/10 text-white/90">
              <td className="px-4 py-3">{row.url}</td>
              <td className="px-4 py-3 font-semibold">{row.score}</td>
              <td className="px-4 py-3 font-mono text-xs">{new Date(row.timestamp).toLocaleTimeString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
