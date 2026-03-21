"use client";

type CompetitorData = {
  industry: string;
  topCompetitors: Array<{
    name: string;
    url: string;
    overall: number;
    mobile: number;
    seo: number;
    auditedDate: string;
    sourceType: string;
    lastUpdated: string;
  }>;
  industryAverageRange: { min: number; max: number };
  topFixesToBeat: string[];
  disclaimer?: string;
};

export default function CompetitorComparison({ yourScore, data }: { yourScore: number; data: CompetitorData }) {
  const topGap = Math.max(0, (data.topCompetitors[0]?.overall ?? yourScore) - yourScore);

  return (
    <article className="glass rounded-2xl border border-white/20 bg-gradient-to-br from-white/15 to-white/5 p-5 backdrop-blur-xl">
      <h2 className="mb-3 text-xl font-bold">Competitor Analysis</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm text-slate-100">
          <thead>
            <tr className="border-b border-white/20 text-left text-slate-300">
              <th className="py-2">Brand</th>
              <th className="py-2">Overall</th>
              <th className="py-2">Mobile</th>
              <th className="py-2">SEO</th>
              <th className="py-2">Gap</th>
              <th className="py-2">Meta</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-white/10">
              <td className="py-2">Your Site</td>
              <td className="py-2 font-semibold">{yourScore}</td>
              <td className="py-2">-</td>
              <td className="py-2">-</td>
            </tr>
            {data.topCompetitors.map((c) => (
              <tr key={c.url} className="border-b border-white/10">
                <td className="py-2">{c.name}</td>
                <td className="py-2">{c.overall}</td>
                <td className="py-2">{c.mobile}</td>
                <td className="py-2">{c.seo}</td>
                <td className={`py-2 font-semibold ${c.overall - yourScore > 10 ? "text-rose-200" : "text-amber-200"}`}>+{c.overall - yourScore}</td>
                <td className="py-2 text-xs text-slate-300">
                  {c.sourceType}, {c.auditedDate}, {c.lastUpdated}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-cyan-100">Industry range: {data.industryAverageRange.min}-{data.industryAverageRange.max}</p>
      <p className="mt-2 text-sm text-cyan-100">Top 3 fixes to beat competitors:</p>
      <ul className="list-disc pl-5 text-sm text-slate-200">
        {data.topFixesToBeat.map((fix) => (
          <li key={fix}>{fix}</li>
        ))}
      </ul>
      {data.disclaimer ? <p className="mt-2 text-xs text-amber-200">{data.disclaimer}</p> : null}
      <p className="mt-1 text-xs text-slate-300">Gap to best-in-class benchmark: {topGap} points.</p>
    </article>
  );
}
