"use client";

type Suggestion = {
  type: "title" | "metaDescription" | "h1";
  current: string;
  suggested: string;
  reason: string;
  confidence: number;
  guidelineBullets: string[];
};

export default function ContentSuggestions({ suggestions, warning }: { suggestions: Suggestion[]; warning?: string }) {
  return (
    <article className="glass rounded-2xl border border-white/20 bg-gradient-to-br from-white/15 to-white/5 p-5 backdrop-blur-xl">
      <h2 className="mb-3 text-xl font-bold">AI Content Suggestions</h2>
      {warning ? <p className="mb-3 text-xs text-amber-200">{warning}</p> : null}
      <ul className="space-y-3 text-sm text-slate-100">
        {suggestions.map((s) => (
          <li key={s.type} className="rounded-xl border border-white/15 bg-black/15 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-300">{s.type}</p>
            <p className="mt-1 text-rose-200">Current: {s.current || "Missing"}</p>
            <p className="mt-1 text-emerald-200">Suggested: {s.suggested}</p>
            <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <p className="text-xs text-slate-300">{s.reason} (confidence: {s.confidence}%)</p>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(s.suggested)}
                className="rounded-lg border border-cyan-200/50 bg-cyan-200/10 px-3 py-1 text-xs font-semibold text-cyan-100"
              >
                Copy
              </button>
            </div>
            <ul className="mt-2 list-disc pl-4 text-xs text-slate-300">
              {s.guidelineBullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </article>
  );
}
