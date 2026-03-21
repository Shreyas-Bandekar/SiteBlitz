"use client";

type Payload = {
  url: string;
  scores: Record<string, number>;
  issues: Array<{ category: string; title: string; detail: string; severity: string }>;
  recommendations: Array<{ priority: string; action: string; rationale: string }>;
  summary: string;
  aiInsights?: {
    executiveSummary: string;
    topFixesFirst: Array<{ priority: string; fix: string; expectedImpact: string }>;
    businessImpactNarrative: string;
    actionPlan30Days: Array<{ week: string; focus: string; outcome: string }>;
    source: "model" | "fallback";
  };
  detectedIndustry?: { category: string; confidence: number };
  competitors?: { topCompetitors: Array<{ name: string; overall: number }> } | null;
  roi?: {
    traffic: number;
    conversionRate: number;
    avgOrderValue: number;
    currentRevenue: number;
    projectedRevenue: number;
    monthlyUplift: number;
    currency: "INR";
  };
  trendsSummary?: { deltaPercent: number; rollingAverage: number };
  pipeline?: string[];
};

export default function PDFReport({ payload }: { payload: Payload }) {
  const formatInr = (value: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

  const downloadTextFallback = (generatedAt: string) => {
    const fallbackText = [
      `AI Website Auditor Report`,
      `Generated At: ${generatedAt}`,
      `URL: ${payload.url}`,
      `Pipeline: ${payload.pipeline?.join(" -> ") || "Not available"}`,
      `Summary: ${payload.aiInsights?.executiveSummary || payload.summary}`,
    ].join("\n");
    const txtBlob = new Blob([fallbackText], { type: "text/plain;charset=utf-8" });
    const txtUrl = URL.createObjectURL(txtBlob);
    const a = document.createElement("a");
    a.href = txtUrl;
    a.download = `siteblitz-audit-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(txtUrl);
  };

  const exportPdf = async () => {
    const generatedAt = new Date().toLocaleString("en-IN");
    const html = `
      <h1>AI Website Auditor Report</h1>
      <p><strong>Generated At:</strong> ${generatedAt}</p>
      <p><strong>Pipeline:</strong> ${payload.pipeline?.join(" -> ") || "Not available"}</p>
      <p><strong>URL:</strong> ${payload.url}</p>
      <p><strong>Executive Summary:</strong> ${payload.aiInsights?.executiveSummary || payload.summary}</p>
      <h2>Scores</h2>
      <ul>
        ${Object.entries(payload.scores)
          .map(([k, v]) => `<li>${k.toUpperCase()}: ${v}</li>`)
          .join("")}
      </ul>
      <h2>Top Issues</h2>
      <ol>${payload.issues.map((i) => `<li>[${i.severity.toUpperCase()}] ${i.title} - ${i.detail}</li>`).join("")}</ol>
      <h2>Prioritized Recommendations</h2>
      <ol>${payload.recommendations
        .map((r) => `<li>[${r.priority.toUpperCase()}] ${r.action} - ${r.rationale}</li>`)
        .join("")}</ol>
      <h2>AI Insights (${payload.aiInsights?.source || "fallback"})</h2>
      <p>${payload.aiInsights?.businessImpactNarrative || "Business impact narrative not available."}</p>
      <ol>${payload.aiInsights?.topFixesFirst?.map((f) => `<li>[${f.priority.toUpperCase()}] ${f.fix} - ${f.expectedImpact}</li>`).join("") || "<li>Not available</li>"}</ol>
      <h3>30-Day Action Plan</h3>
      <ol>${payload.aiInsights?.actionPlan30Days?.map((s) => `<li>${s.week}: ${s.focus} (${s.outcome})</li>`).join("") || "<li>Not available</li>"}</ol>
      <h2>Detected Industry</h2>
      <p>${payload.detectedIndustry ? `${payload.detectedIndustry.category} (${payload.detectedIndustry.confidence}%)` : "Not available"}</p>
      <h2>Competitor Comparison</h2>
      <ol>${payload.competitors?.topCompetitors?.map((c) => `<li>${c.name}: ${c.overall}</li>`).join("") || "<li>Not available</li>"}</ol>
      <h2>ROI Summary</h2>
      <p>${
        payload.roi
          ? `Current: ${formatInr(payload.roi.currentRevenue)} | Projected: ${formatInr(payload.roi.projectedRevenue)} | Uplift: ${formatInr(payload.roi.monthlyUplift)}`
          : "Not available"
      }</p>
      <p>${payload.roi ? `Assumptions: Traffic ${payload.roi.traffic.toLocaleString("en-IN")}/month, conversion ${(payload.roi.conversionRate * 100).toFixed(2)}%, AOV ${formatInr(payload.roi.avgOrderValue)}.` : ""}</p>
      <h2>Trends Summary</h2>
      <p>${
        payload.trendsSummary
          ? `Delta: ${payload.trendsSummary.deltaPercent}% | Rolling Avg: ${payload.trendsSummary.rollingAverage}`
          : "Not available"
      }</p>
    `;

    try {
      const [htmlToPdfmakeMod, pdfMakeMod] = await Promise.all([
        import("html-to-pdfmake"),
        import("pdfmake/build/pdfmake"),
      ]);
      const pdfFonts = await import("pdfmake/build/vfs_fonts");

      const htmlToPdfmake = htmlToPdfmakeMod.default as (html: string) => any;
      const pdfMake = (pdfMakeMod as any).default || (pdfMakeMod as any);
      (pdfMake as any).vfs = (pdfFonts as any).default?.pdfMake?.vfs || (pdfFonts as any).pdfMake?.vfs;

      const content = htmlToPdfmake(html);
      const docDefinition = { content };
      const blob = await new Promise<Blob>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("PDF generation timed out")), 5000);
        pdfMake.createPdf(docDefinition).getBlob((pdfBlob: Blob) => {
          clearTimeout(timer);
          resolve(pdfBlob);
        });
      });
      const blobUrl = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `siteblitz-audit-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      downloadTextFallback(generatedAt);
    }
  };

  return (
    <button
      type="button"
      onClick={exportPdf}
      className="rounded-xl border border-white/40 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
    >
      Export PDF Report
    </button>
  );
}
