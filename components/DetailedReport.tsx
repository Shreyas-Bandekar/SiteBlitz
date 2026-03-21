"use client";

import { useMemo, useState } from "react";
import type { AuditReport } from "../lib/audit-types";

type Tone = "good" | "warn" | "critical";

function toneClass(tone: Tone) {
  if (tone === "good") return "bg-emerald-400/20 text-emerald-100 border-emerald-300/40";
  if (tone === "warn") return "bg-amber-400/20 text-amber-100 border-amber-300/40";
  return "bg-rose-400/20 text-rose-100 border-rose-300/40";
}

function Badge({ tone, label }: { tone: Tone; label: string }) {
  return <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${toneClass(tone)}`}>{label}</span>;
}

function rowTone(value: number, passAt: number, warnAt: number): Tone {
  if (value >= passAt) return "good";
  if (value >= warnAt) return "warn";
  return "critical";
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function headingCount(html: string, level: 1 | 2 | 3 | 4 | 5 | 6) {
  return (html.match(new RegExp(`<h${level}[\\s>]`, "gi")) || []).length;
}

function keywordFrequency(text: string) {
  const stopwords = new Set(["the", "and", "for", "that", "with", "this", "from", "your", "have", "are", "you", "our", "not"]);
  const words = text.toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) || [];
  const freq = new Map<string, number>();
  for (const w of words) {
    if (stopwords.has(w)) continue;
    freq.set(w, (freq.get(w) || 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([keyword, count]) => ({ keyword, count }));
}

export default function DetailedReport({ report }: { report: AuditReport }) {
  const [open, setOpen] = useState<Record<string, boolean>>({
    onpage: true,
    serp: true,
    keywords: false,
    technical: false,
    usability: false,
    performance: false,
  });

  const computed = useMemo(() => {
    const html = report.rawHtml || "";
    const plain = stripHtml(html);
    const headings = [1, 2, 3, 4, 5, 6].map((n) => ({ level: `H${n}`, count: headingCount(html, n as 1 | 2 | 3 | 4 | 5 | 6) }));
    const canonical = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/i)?.[1] || null;
    const viewport = /<meta[^>]*name=["']viewport["']/i.test(html);
    const hasIframe = /<iframe[\s>]/i.test(html);
    const hasFlash = /<object[^>]*flash|swf/i.test(html);
    const emailExposure = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi.test(html);
    const robotsMeta = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']+)/i)?.[1] || null;
    const sitemapLink = /sitemap\.xml/i.test(html);
    const schema = /application\/ld\+json/i.test(html);
    const analyticsDetected = Boolean(report.analytics?.ga4Id.value);
    const topKeywords = keywordFrequency(plain);
    const htmlBytes = html ? new TextEncoder().encode(html).length : 0;
    const stageMap = new Map((report.stageTrace || []).map((s) => [s.stage, s.durationMs]));

    return {
      plainWordCount: plain ? plain.split(/\s+/).length : 0,
      headings,
      canonical,
      viewport,
      hasIframe,
      hasFlash,
      emailExposure,
      robotsMeta,
      sitemapLink,
      schema,
      analyticsDetected,
      topKeywords,
      htmlBytes,
      loadMs: stageMap.get("playwright") || null,
      scriptExecMs: stageMap.get("lighthouse") || null,
    };
  }, [report]);

  const sections = [
    { id: "onpage", icon: "🧩", title: "On-Page SEO Analysis" },
    { id: "serp", icon: "🔎", title: "SERP Preview" },
    { id: "keywords", icon: "🧠", title: "Keyword Analysis" },
    { id: "technical", icon: "⚙️", title: "Technical SEO Checks" },
    { id: "usability", icon: "📱", title: "Usability Analysis" },
    { id: "performance", icon: "⚡", title: "Performance Breakdown" },
  ] as const;

  return (
    <section className="mt-8 space-y-4">
      <h2 className="text-2xl font-bold text-white">Detailed Analytics Report</h2>
      {sections.map((section) => {
        const expanded = open[section.id];
        return (
          <article key={section.id} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
            <button
              type="button"
              onClick={() => setOpen((prev) => ({ ...prev, [section.id]: !prev[section.id] }))}
              className="flex w-full items-center justify-between px-5 py-4 text-left"
            >
              <div className="flex items-center gap-3">
                <span>{section.icon}</span>
                <h3 className="text-lg font-semibold text-white">{section.title}</h3>
              </div>
              <span className="text-white/80">{expanded ? "−" : "+"}</span>
            </button>
            <div className={`overflow-hidden px-5 transition-all duration-300 ${expanded ? "max-h-[1000px] pb-5" : "max-h-0"}`}>
              {section.id === "onpage" ? (
                <div className="grid gap-2 text-sm text-slate-100 md:grid-cols-2">
                  <p>Title Tag: {report.serpPreview?.title || "Unavailable"} ({report.seoDetails?.titleLength ?? 0})</p>
                  <p>Meta Description: ({report.seoDetails?.metaLength ?? 0})</p>
                  <p>Content length: {computed.plainWordCount} words</p>
                  <p>Alt missing: {report.seoDetails?.altMissing ?? "Unavailable"}</p>
                  <p>Canonical: {computed.canonical || "Not found"}</p>
                  <p>Robots/Sitemap: {computed.robotsMeta || "Unknown"} / {computed.sitemapLink ? "Detected" : "Unknown"}</p>
                  <div className="md:col-span-2">
                    <p className="mb-1">Heading structure:</p>
                    <div className="flex flex-wrap gap-2">
                      {computed.headings.map((h) => (
                        <span key={h.level} className="rounded-lg border border-white/15 bg-black/20 px-2 py-1 text-xs">
                          {h.level}: {h.count}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {section.id === "serp" ? (
                <div className="rounded-xl border border-white/15 bg-white/5 p-4">
                  <p className="truncate text-xs text-emerald-200">{report.serpPreview?.url || report.url}</p>
                  <p className="mt-1 text-lg text-blue-300">{report.serpPreview?.title || "Untitled page"}</p>
                  <p className="mt-1 text-sm text-slate-200">{report.serpPreview?.description || "No meta description found."}</p>
                </div>
              ) : null}

              {section.id === "keywords" ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-slate-100">
                    <thead>
                      <tr className="border-b border-white/15 text-left text-slate-300">
                        <th className="py-2">Keyword</th>
                        <th className="py-2">Frequency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {computed.topKeywords.map((k, idx) => (
                        <tr key={k.keyword} className="border-b border-white/10">
                          <td className="py-2">{k.keyword} {idx < 3 ? <Badge tone="good" label="Top" /> : null}</td>
                          <td className="py-2">{k.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {section.id === "technical" ? (
                <div className="grid gap-2 text-sm text-slate-100 md:grid-cols-2">
                  <p className="flex items-center gap-2">SSL enabled <Badge tone={report.url.startsWith("https://") ? "good" : "critical"} label={report.url.startsWith("https://") ? "Good" : "Critical"} /></p>
                  <p className="flex items-center gap-2">HTTPS redirect <Badge tone={report.url.startsWith("https://") ? "good" : "warn"} label={report.url.startsWith("https://") ? "Likely" : "Unknown"} /></p>
                  <p className="flex items-center gap-2">Analytics detection <Badge tone={computed.analyticsDetected ? "good" : "warn"} label={computed.analyticsDetected ? "Detected" : "Not Found"} /></p>
                  <p className="flex items-center gap-2">Schema presence <Badge tone={computed.schema ? "good" : "warn"} label={computed.schema ? "Present" : "Not Found"} /></p>
                  <p className="flex items-center gap-2">Indexing status <Badge tone={computed.robotsMeta?.includes("noindex") ? "critical" : "good"} label={computed.robotsMeta?.includes("noindex") ? "Noindex" : "Indexable"} /></p>
                </div>
              ) : null}

              {section.id === "usability" ? (
                <div className="grid gap-2 text-sm text-slate-100 md:grid-cols-2">
                  <p className="flex items-center gap-2">Mobile responsiveness <Badge tone={rowTone(report.scores.mobile, 75, 60)} label={`${report.scores.mobile}/100`} /></p>
                  <p className="flex items-center gap-2">Viewport usage <Badge tone={computed.viewport ? "good" : "critical"} label={computed.viewport ? "Present" : "Missing"} /></p>
                  <p className="flex items-center gap-2">iFrame detection <Badge tone={computed.hasIframe ? "warn" : "good"} label={computed.hasIframe ? "Detected" : "None"} /></p>
                  <p className="flex items-center gap-2">Flash detection <Badge tone={computed.hasFlash ? "critical" : "good"} label={computed.hasFlash ? "Detected" : "None"} /></p>
                  <p className="flex items-center gap-2">Email exposure <Badge tone={computed.emailExposure ? "warn" : "good"} label={computed.emailExposure ? "Visible" : "Not Found"} /></p>
                </div>
              ) : null}

              {section.id === "performance" ? (
                <div className="grid gap-2 text-sm text-slate-100 md:grid-cols-2">
                  <p>Load time: {computed.loadMs ? `${computed.loadMs}ms` : "Unavailable"}</p>
                  <p>Script execution proxy: {computed.scriptExecMs ? `${computed.scriptExecMs}ms` : "Unavailable"}</p>
                  <p>Page size (HTML): {(computed.htmlBytes / 1024).toFixed(1)} KB</p>
                  <p>Breakdown (CSS/JS/Images/Other): Not exposed by current payload</p>
                  <p>Compression percentage: Not inferable from current payload</p>
                </div>
              ) : null}
            </div>
          </article>
        );
      })}
    </section>
  );
}
