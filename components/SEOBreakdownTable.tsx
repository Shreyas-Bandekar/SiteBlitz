"use client";

type SeoDetails = {
  titleLength: number;
  metaLength: number;
  h1Count: number;
  wordCount: number;
  altMissing: number;
};

function statusBadge(status: "pass" | "warn" | "fail") {
  if (status === "pass") return "bg-emerald-400/20 text-emerald-100";
  if (status === "warn") return "bg-amber-400/20 text-amber-100";
  return "bg-rose-400/20 text-rose-100";
}

export default function SEOBreakdownTable({ details }: { details?: SeoDetails }) {
  const safe = details ?? { titleLength: 0, metaLength: 0, h1Count: 0, wordCount: 0, altMissing: 0 };
  const rows = [
    { label: "Title length", value: safe.titleLength, status: safe.titleLength >= 30 && safe.titleLength <= 60 ? "pass" : safe.titleLength > 0 ? "warn" : "fail" },
    { label: "Meta description length", value: safe.metaLength, status: safe.metaLength >= 120 && safe.metaLength <= 160 ? "pass" : safe.metaLength > 0 ? "warn" : "fail" },
    { label: "H1 count", value: safe.h1Count, status: safe.h1Count === 1 ? "pass" : safe.h1Count > 0 ? "warn" : "fail" },
    { label: "Word count", value: safe.wordCount, status: safe.wordCount >= 300 ? "pass" : safe.wordCount >= 150 ? "warn" : "fail" },
    { label: "Missing alt count", value: safe.altMissing, status: safe.altMissing === 0 ? "pass" : safe.altMissing <= 3 ? "warn" : "fail" },
  ] as const;

  return (
    <article className="glass rounded-2xl border border-white/20 bg-gradient-to-br from-white/15 to-white/5 p-5">
      <h2 className="mb-3 text-xl font-bold text-white">SEO Breakdown</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-slate-100">
          <thead>
            <tr className="border-b border-white/20 text-left text-slate-300">
              <th className="py-2">Metric</th>
              <th className="py-2">Value</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-white/10">
                <td className="py-2">{row.label}</td>
                <td className="py-2">{row.value}</td>
                <td className="py-2">
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusBadge(row.status)}`}>{row.status.toUpperCase()}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}
