"use client";

import { CompetitorLiveBadge } from "./LiveDataBadges";
import type { LiveCompetitorAudit } from "../lib/audit-types";

export default function CompetitorLiveTable({ competitors }: { competitors: (LiveCompetitorAudit & { sourceType?: "live" | "pre-audited"; audited?: string; city?: string; district?: string; state?: string; country?: string })[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
      <table className="min-w-full text-sm">
        <thead className="bg-white/10 text-left text-white/80">
          <tr>
            <th className="px-4 py-3">Competitor</th>
            <th className="px-4 py-3">Overall Score</th>
            <th className="px-4 py-3">City</th>
            <th className="px-4 py-3">District</th>
            <th className="px-4 py-3">State</th>
            <th className="px-4 py-3">Country</th>
            <th className="px-4 py-3">Audit Status</th>
          </tr>
        </thead>
        <tbody>
          {competitors.map((row) => {
            const displayUrl = new URL(row.url).hostname.replace("www.", "");
            const auditDate = row.audited || (row as any).auditedDate || new Date(row.timestamp).toISOString();
            const sourceType = row.sourceType || "pre-audited";

            return (
              <tr key={`${row.url}-${row.timestamp}`} className="border-t border-white/10 text-white/90 hover:bg-white/5 transition">
                <td className="px-4 py-3 font-medium text-white">
                  <a href={row.url} target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400">
                    {displayUrl}
                  </a>
                </td>
                <td className="px-4 py-3 font-semibold text-lg">{row.score}</td>
                <td className="px-4 py-3">{row.city || "-"}</td>
                <td className="px-4 py-3">{row.district || "-"}</td>
                <td className="px-4 py-3">{row.state || "-"}</td>
                <td className="px-4 py-3">{row.country || "-"}</td>
                <td className="px-4 py-3">
                  <CompetitorLiveBadge auditedDate={auditDate} sourceType={sourceType} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
