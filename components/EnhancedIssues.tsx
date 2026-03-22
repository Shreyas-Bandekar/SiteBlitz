"use client";

type Issue = { category: string; title: string; detail: string; severity: "high" | "medium" | "low" };

function badgeClass(severity: Issue["severity"]) {
  if (severity === "high") return "bg-rose-400/20 text-rose-100";
  if (severity === "medium") return "bg-amber-400/20 text-amber-100";
  return "bg-cyan-400/20 text-cyan-100";
}

function impactText(severity: Issue["severity"]) {
  if (severity === "high") return "Likely immediate impact on leads and user trust.";
  if (severity === "medium") return "Moderate impact on engagement and discoverability.";
  return "Incremental impact, useful for polish and retention.";
}

export default function EnhancedIssues({ issues }: { issues: Issue[] }) {
  return (
    <article className="glass rounded-2xl border border-white/20 bg-gradient-to-br from-white/15 to-white/5 p-5">
      <h2 className="mb-3 text-xl font-bold text-white">Enhanced Issues</h2>
      <ul className="space-y-3">
        {issues.map((issue) => (
          <li key={`${issue.category}-${issue.title}`} className="rounded-xl border border-white/15 bg-black/15 p-3 text-sm text-slate-100">
            <div className="mb-1 flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <span className={`shrink-0 w-fit rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-semibold tracking-wide ${badgeClass(issue.severity)}`}>{issue.severity.toUpperCase()}</span>
              <span className="font-semibold">{issue.title}</span>
            </div>
            <p>{issue.detail}</p>
            <p className="mt-1 text-xs text-slate-300">Estimated impact: {impactText(issue.severity)}</p>
            <p className="mt-1 text-xs text-cyan-100">Fix recommendation: Prioritize this in current sprint with measurable before/after checks.</p>
          </li>
        ))}
      </ul>
    </article>
  );
}
