"use client";

import { useState } from "react";
import { ArrowRightLeft, Gauge, MapPinned, Sparkles } from "lucide-react";
import type { AuditReport } from "../lib/audit-types";
import { Button } from "./ui/Button";

type CompareResult = {
  siteA: AuditReport;
  siteB: AuditReport;
};

export default function ManualCompetitorCompare() {
  const [siteA, setSiteA] = useState("");
  const [siteB, setSiteB] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CompareResult | null>(null);

  const runCompare = async () => {
    const a = siteA.trim();
    const b = siteB.trim();
    if (!a || !b) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const [resA, resB] = await Promise.all([
        fetch("/api/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: a,
            enrichCompetitors: false,
            enrichAi: false,
            strictDb: false,
          }),
        }),
        fetch("/api/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: b,
            enrichCompetitors: false,
            enrichAi: false,
            strictDb: false,
          }),
        }),
      ]);

      const jsonA = (await resA.json()) as AuditReport & { message?: string };
      const jsonB = (await resB.json()) as AuditReport & { message?: string };

      if (!resA.ok || !resB.ok) {
        throw new Error(
          jsonA.message ||
            jsonB.message ||
            "Unable to compare these sites right now",
        );
      }

      setResult({ siteA: jsonA, siteB: jsonB });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Comparison failed");
    } finally {
      setLoading(false);
    }
  };

  const rows = result
    ? [
        {
          label: "Overall",
          a: result.siteA.scores.overall,
          b: result.siteB.scores.overall,
        },
        {
          label: "UI/UX",
          a: result.siteA.scores.uiux,
          b: result.siteB.scores.uiux,
        },
        {
          label: "Performance",
          a: result.siteA.scores.performance,
          b: result.siteB.scores.performance,
        },
        {
          label: "Mobile",
          a: result.siteA.scores.mobile,
          b: result.siteB.scores.mobile,
        },
        {
          label: "Accessibility",
          a: result.siteA.scores.accessibility,
          b: result.siteB.scores.accessibility,
        },
        {
          label: "SEO",
          a: result.siteA.scores.seo,
          b: result.siteB.scores.seo,
        },
        {
          label: "Lead Conversion",
          a: result.siteA.scores.leadConversion,
          b: result.siteB.scores.leadConversion,
        },
      ]
    : [];

  return (
    <section className="liquid-glass-soft mb-10 rounded-2xl p-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center rounded-lg border border-emerald-300/20 bg-black/35 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-300">
          <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" />
          Compare Mode
        </div>
        <div className="inline-flex items-center rounded-lg border border-emerald-300/20 bg-black/35 px-3 py-1 text-xs text-emerald-100/75">
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          Side-by-side deltas
        </div>
      </div>

      <h3 className="text-2xl font-black text-emerald-50">
        Competitor Compare
      </h3>
      <p className="mt-1 text-sm text-emerald-100/70">
        Enter your site and competitor URL to run both audits and compare
        metrics.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <input
          value={siteA}
          onChange={(e) => setSiteA(e.target.value)}
          placeholder="Site A URL (your site)"
          className="w-full rounded-xl border border-emerald-300/20 bg-black/45 px-4 py-3 text-emerald-50 outline-none transition focus:border-emerald-300/45 focus:ring-1 focus:ring-emerald-300/25"
        />
        <input
          value={siteB}
          onChange={(e) => setSiteB(e.target.value)}
          placeholder="Site B URL (competitor)"
          className="w-full rounded-xl border border-emerald-300/20 bg-black/45 px-4 py-3 text-emerald-50 outline-none transition focus:border-emerald-300/45 focus:ring-1 focus:ring-emerald-300/25"
        />
      </div>

      <div className="mt-4">
        <Button
          onClick={runCompare}
          disabled={loading || !siteA.trim() || !siteB.trim()}
          isLoading={loading}
          className="rounded-xl bg-emerald-300 text-black hover:bg-emerald-200"
        >
          Compare Sites
        </Button>
      </div>

      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

      {result ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-300/20 bg-black/45 p-4">
              <p className="text-xs uppercase tracking-wider text-emerald-200/70">
                Site A Overall
              </p>
              <p className="mt-1 inline-flex items-center text-2xl font-black text-emerald-100">
                <Gauge className="mr-2 h-5 w-5 text-emerald-300" />
                {result.siteA.scores.overall}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-300/20 bg-black/45 p-4">
              <p className="text-xs uppercase tracking-wider text-emerald-200/70">
                Site B Overall
              </p>
              <p className="mt-1 inline-flex items-center text-2xl font-black text-emerald-100">
                <Gauge className="mr-2 h-5 w-5 text-emerald-300" />
                {result.siteB.scores.overall}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-300/20 bg-black/45 p-4">
              <p className="text-xs uppercase tracking-wider text-emerald-200/70">
                Winner
              </p>
              <p className="mt-1 text-2xl font-black text-emerald-100">
                {result.siteA.scores.overall >= result.siteB.scores.overall
                  ? "Site A"
                  : "Site B"}
              </p>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto rounded-2xl border border-emerald-300/20 bg-black/45">
            <table className="min-w-full text-sm">
              <thead className="bg-emerald-500/10 text-left text-emerald-100">
                <tr>
                  <th className="px-4 py-3">Metric</th>
                  <th className="px-4 py-3">Site A</th>
                  <th className="px-4 py-3">Site B</th>
                  <th className="px-4 py-3">Delta (A-B)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.label}
                    className="border-t border-emerald-300/10 text-emerald-100/90"
                  >
                    <td className="px-4 py-3 font-medium text-emerald-100">
                      {r.label}
                    </td>
                    <td className="px-4 py-3">{r.a}</td>
                    <td className="px-4 py-3">{r.b}</td>
                    <td
                      className={`px-4 py-3 font-semibold ${r.a - r.b >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                    >
                      {r.a - r.b}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-emerald-300/10 bg-emerald-500/5">
                  <td className="px-4 py-3 font-medium">
                    City / District / Country
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {result.siteA.targetLocation?.city || "-"} /{" "}
                    {result.siteA.targetLocation?.district || "-"} /{" "}
                    {result.siteA.targetLocation?.country || "-"}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {result.siteB.targetLocation?.city || "-"} /{" "}
                    {result.siteB.targetLocation?.district || "-"} /{" "}
                    {result.siteB.targetLocation?.country || "-"}
                  </td>
                  <td className="px-4 py-3 text-xs text-emerald-200/70">
                    <span className="inline-flex items-center gap-1">
                      <MapPinned className="h-3.5 w-3.5" />
                      Location context
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}
