"use client";

import { useMemo, useState } from "react";
import type { AuditReport } from "../lib/audit-types";
import { Card, CardContent } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { ChevronDown, ChevronUp, FileCode2, Search, BrainCircuit, Wrench, Smartphone, Zap } from "lucide-react";

type Tone = "good" | "warn" | "critical";

function toneVariant(tone: Tone) {
  if (tone === "good") return "success";
  if (tone === "warn") return "warning";
  return "destructive";
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
  const stopwords = new Set(["the", "and", "for", "that", "with", "this", "from", "your", "have", "are", "you", "our", "not", "will", "can", "has", "was"]);
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
    { id: "onpage", icon: FileCode2, title: "On-Page SEO Analysis" },
    { id: "serp", icon: Search, title: "SERP Preview" },
    { id: "keywords", icon: BrainCircuit, title: "Keyword Analysis" },
    { id: "technical", icon: Wrench, title: "Technical SEO Checks" },
    { id: "usability", icon: Smartphone, title: "Usability Analysis" },
    { id: "performance", icon: Zap, title: "Performance Breakdown" },
  ] as const;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Deep Diagnostics</h2>
      </div>
      
      <div className="grid gap-4">
        {sections.map((section) => {
          const expanded = open[section.id];
          const Icon = section.icon;
          
          return (
            <Card key={section.id} className="overflow-hidden transition-all duration-300">
              <button
                type="button"
                onClick={() => setOpen((prev) => ({ ...prev, [section.id]: !prev[section.id] }))}
                className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-secondary/50 focus:outline-none"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center p-2 rounded-lg bg-success/10 text-success">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground tracking-tight">{section.title}</h3>
                </div>
                <div className="text-foreground/50 transition-transform duration-300">
                  {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </button>
              
              <div 
                className={`transition-all duration-300 ease-in-out ${expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                style={{ display: "grid" }}
              >
                <div className="overflow-hidden">
                  <div className="p-5 pt-0 border-t border-border mt-3">
                    {section.id === "onpage" && (
                      <div className="grid gap-4 text-sm text-foreground/80 md:grid-cols-2">
                        <div className="flex justify-between p-3 rounded-lg bg-secondary/30">
                          <span className="font-medium">Title Tag <span className="text-muted-foreground font-normal">({report.seoDetails?.titleLength ?? 0} chars)</span></span>
                          <span className="truncate max-w-[200px] text-success">{report.serpPreview?.title || "Unavailable"}</span>
                        </div>
                        <div className="flex justify-between p-3 rounded-lg bg-secondary/30">
                          <span className="font-medium">Meta Desc <span className="text-muted-foreground font-normal">({report.seoDetails?.metaLength ?? 0} chars)</span></span>
                          <Badge variant={report.seoDetails?.metaLength ? "success" : "destructive"}>{report.seoDetails?.metaLength ? "Present" : "Missing"}</Badge>
                        </div>
                        <div className="flex justify-between p-3 rounded-lg bg-secondary/30">
                          <span className="font-medium">Content Length</span>
                          <span>{computed.plainWordCount} words</span>
                        </div>
                        <div className="flex justify-between p-3 rounded-lg bg-secondary/30">
                          <span className="font-medium">Images Missing Alt</span>
                          <span>{report.seoDetails?.altMissing ?? "Unavailable"}</span>
                        </div>
                        <div className="flex justify-between p-3 rounded-lg bg-secondary/30">
                          <span className="font-medium">Canonical Tag</span>
                          <span className="truncate max-w-[200px] text-primary">{computed.canonical || "Not found"}</span>
                        </div>
                        <div className="flex justify-between p-3 rounded-lg bg-secondary/30">
                          <span className="font-medium">Robots / Sitemap</span>
                          <span className="truncate max-w-[200px]">{computed.robotsMeta || "Unknown"} / {computed.sitemapLink ? "Detected" : "Unknown"}</span>
                        </div>
                        <div className="md:col-span-2 p-4 rounded-lg bg-secondary/30">
                          <p className="mb-3 font-medium">Heading Structure Hierarchy</p>
                          <div className="flex flex-wrap gap-2">
                            {computed.headings.map((h) => (
                              <Badge key={h.level} variant="outline" className="border-border bg-background">
                                {h.level}: <span className="ml-1 text-success">{h.count}</span>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {section.id === "serp" && (
                      <div className="rounded-xl border border-border bg-secondary/30 p-5 shadow-inner">
                        <div className="text-sm text-success mb-1 flex items-center gap-2">
                          <span className="bg-success/20 text-success text-[10px] px-2 py-0.5 rounded-full font-bold">Ad</span>
                          {report.serpPreview?.url || report.url}
                        </div>
                        <p className="text-xl text-primary hover:underline cursor-pointer font-medium mb-1">
                          {report.serpPreview?.title || "Untitled page"}
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {report.serpPreview?.description || "No meta description found for this target URL."}
                        </p>
                      </div>
                    )}

                    {section.id === "keywords" && (
                      <div className="rounded-xl border border-border overflow-hidden">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-secondary/30 text-muted-foreground text-xs uppercase tracking-wider">
                            <tr>
                              <th className="px-6 py-3 font-medium">Top Extracted Keyword</th>
                              <th className="px-6 py-3 font-medium">Frequency Count</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {computed.topKeywords.map((k, idx) => (
                              <tr key={k.keyword} className="hover:bg-secondary/30 transition-colors">
                                <td className="px-6 py-4 flex items-center gap-2 font-medium text-foreground">
                                  {k.keyword}
                                  {idx < 3 && <Badge variant="success" className="h-5 text-[10px]">Top</Badge>}
                                </td>
                                <td className="px-6 py-4 text-success font-mono">
                                  {k.count}
                                </td>
                              </tr>
                            ))}
                            {computed.topKeywords.length === 0 && (
                              <tr>
                                <td colSpan={2} className="px-6 py-8 text-center text-muted-foreground">
                                  No meaningful keywords could be extracted from the target body content.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {section.id === "technical" && (
                      <div className="grid gap-3 text-sm text-foreground/80 md:grid-cols-2">
                        {[
                          { label: "SSL Certification", flag: report.url.startsWith("https://") },
                          { label: "HTTPS Enforcement", flag: report.url.startsWith("https://") },
                          { label: "Analytics Detection", flag: computed.analyticsDetected },
                          { label: "Schema.org Markup", flag: computed.schema },
                          { label: "Search Indexability", flag: !computed.robotsMeta?.includes("noindex") },
                        ].map((item, i) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                            <span className="font-medium">{item.label}</span>
                            <Badge variant={item.flag ? "success" : "warning"}>{item.flag ? "Verified" : "Missing / Needs Check"}</Badge>
                          </div>
                        ))}
                      </div>
                    )}

                    {section.id === "usability" && (
                      <div className="grid gap-3 text-sm text-foreground/80 md:grid-cols-2">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                          <span className="font-medium">Responsive Emulation Score</span>
                          <Badge variant={toneVariant(rowTone(report.scores.mobile, 75, 60))}>{report.scores.mobile}/100</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                          <span className="font-medium">Meta Viewport</span>
                          <Badge variant={computed.viewport ? "success" : "destructive"}>{computed.viewport ? "Configured" : "Missing"}</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                          <span className="font-medium">Obsolete &lt;iframe&gt; Tags</span>
                          <Badge variant={computed.hasIframe ? "warning" : "success"}>{computed.hasIframe ? "Detected" : "Clear"}</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                          <span className="font-medium">Flash Plugins</span>
                          <Badge variant={computed.hasFlash ? "destructive" : "success"}>{computed.hasFlash ? "Detected" : "Clear"}</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                          <span className="font-medium">Plaintext Email Exposure</span>
                          <Badge variant={computed.emailExposure ? "warning" : "success"}>{computed.emailExposure ? "Vulnerable" : "Secure"}</Badge>
                        </div>
                      </div>
                    )}

                    {section.id === "performance" && (
                      <div className="grid gap-4 text-sm text-foreground/80 md:grid-cols-2">
                        <div className="flex flex-col gap-1 p-4 rounded-xl bg-secondary/30 border border-border">
                          <span className="text-muted-foreground text-xs font-semibold uppercase">Total DOM Load Time</span>
                          <span className="text-2xl font-bold tracking-tight text-white">{computed.loadMs ? `${(computed.loadMs / 1000).toFixed(2)}s` : "N/A"}</span>
                        </div>
                        <div className="flex flex-col gap-1 p-4 rounded-xl bg-secondary/30 border border-border">
                          <span className="text-muted-foreground text-xs font-semibold uppercase">Script Execution Thread</span>
                          <span className="text-2xl font-bold tracking-tight text-white">{computed.scriptExecMs ? `${(computed.scriptExecMs / 1000).toFixed(2)}s` : "N/A"}</span>
                        </div>
                        <div className="flex flex-col gap-1 p-4 rounded-xl bg-secondary/30 border border-border">
                          <span className="text-muted-foreground text-xs font-semibold uppercase">Total Document Size</span>
                          <span className="text-2xl font-bold tracking-tight text-white">{(computed.htmlBytes / 1024).toFixed(1)} KB</span>
                        </div>
                        <div className="col-span-1 flex flex-col items-start justify-center p-4 rounded-xl border border-dashed border-border text-muted-foreground">
                          <span className="text-xs text-center w-full">Detailed asset waterfall timeline unavailable in fast snapshot mode.</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
