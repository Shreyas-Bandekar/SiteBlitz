"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { TrustBreakdown, TrustLevel, TrustMeta } from "../lib/audit-types";
import { trustBadgeLabel } from "../lib/trust";
import type { jsPDF } from "jspdf";
import type { StageTraceEntry } from "../lib/audit-types";

export type ReportSection =
  | "radar"
  | "diagnostics"
  | "issues"
  | "roadmap"
  | "ai"
  | "trust"
  | "roi"
  | "manualAudit"
  | "friendlySummary";

type Payload = {
  url: string;
  userName?: string;
  clientName?: string;
  companyName?: string;
  screenshot?: string;
  screenshots?: { desktop?: string; mobile?: string };
  scores: Record<string, number>;
  issues: Array<{
    category: string;
    title: string;
    detail: string;
    severity: string;
  }>;
  recommendations: Array<{
    priority: string;
    action: string;
    rationale: string;
  }>;
  summary: string;
  aiInsights?: {
    executiveSummary?: string;
    topFixesFirst?: Array<{
      priority: string;
      fix: string;
      reason?: string;
      expectedImpact: string;
    }>;
    businessImpactNarrative?: string;
    actionPlan30Days?: Array<{ week: string; focus: string; outcome: string }>;
    source?: "model";
    issues?: Array<{ fix: string }>;
  };
  detectedIndustry?: { category: string; confidence: number };
  competitors?: {
    topCompetitors: Array<{ name: string; overall: number }>;
  } | null;
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
  pipelineWarnings?: string[];
  stageTrace?: StageTraceEntry[];
  overallTrustScore?: number;
  trustBreakdown?: TrustBreakdown;
  roiTrustMeta?: TrustMeta | null;
  manualRules?: {
    uxScore?: number;
    leadScore?: number;
    issues: string[];
    roiImpact?: string;
  };
};

const MARGIN = 48;
const LINE = 13;
const MAX_ISSUES = 12;
const MAX_RECS = 10;
const AI_SUMMARY_MAX = 700;

const MANUAL_DEFAULT_SECTIONS: ReportSection[] = [
  "radar",
  "diagnostics",
  "issues",
  "roadmap",
  "ai",
  "trust",
  "roi",
  "manualAudit",
];

const AUTOMATIC_DEFAULT_SECTIONS: ReportSection[] = [
  "friendlySummary",
  "radar",
  "diagnostics",
  "issues",
  "roadmap",
  "ai",
  "trust",
  "roi",
];

/** Same six dimensions as ScoreRadar.tsx */
const RADAR_LABELS = [
  "UI/UX",
  "Performance",
  "Mobile",
  "Accessibility",
  "SEO",
  "Leads",
] as const;

function safeFilenameDomain(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return (
      u.hostname.replace(/^www\./i, "").replace(/[^a-zA-Z0-9.-]/g, "_") ||
      "report"
    );
  } catch {
    return "report";
  }
}

function buildReportFilename(url: string): string {
  const domain = safeFilenameDomain(url);
  const date = new Date().toISOString().slice(0, 10);
  return `SiteBlitz_Report_${domain}_${date}.pdf`;
}

function radarValuesFromScores(s: Record<string, number>): number[] {
  const raw = [
    Number(s.uiux) || 0,
    Number(s.performance) || 0,
    Number(s.mobile) || 0,
    Number(s.accessibility) || 0,
    Number(s.seo) || 0,
    Number(s.leadConversion) || 0,
  ];
  return raw.map((v) => Math.max(0, Math.min(100, Math.round(v))));
}

function strengthLabel(v: number): string {
  if (v >= 80) return "Strong";
  if (v >= 60) return "Solid";
  if (v >= 40) return "Fair";
  return "At risk";
}

function preprocessForPdf(payload: Payload) {
  const issues = payload.issues
    .filter(
      (i) =>
        !/lighthouse scan failed|playwright rendered scan failed|screenshot capture failed/i.test(
          `${i.title} ${i.detail}`,
        ),
    )
    .slice(0, MAX_ISSUES)
    .map((i) => ({
      sev: String(i.severity).toUpperCase(),
      text: `${i.title}: ${i.detail}`.slice(0, 220),
    }));

  const recs = payload.recommendations.slice(0, MAX_RECS).map((r) => ({
    pri: String(r.priority).toUpperCase(),
    text: `${r.action} — ${r.rationale}`.slice(0, 240),
  }));

  const aiShort = (
    payload.aiInsights?.executiveSummary ||
    payload.summary ||
    ""
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, AI_SUMMARY_MAX);

  let trustLine: string | null = null;
  if (payload.overallTrustScore != null) {
    const fixes = payload.manualRules?.issues?.length ?? 0;
    trustLine = `Trust ${payload.overallTrustScore}/100${fixes ? ` + ${fixes} fixes` : ""}`;
    if (payload.trustBreakdown) {
      const b = payload.trustBreakdown;
      trustLine += ` (verified ${b.verified}%, estimated ${b.estimated}%, AI ${b.inferred}%, limited ${b.fallback}%)`;
    }
  }

  const diagnostics = `Issues flagged: ${payload.issues.length} · Recommendations: ${payload.recommendations.length}${
    payload.detectedIndustry
      ? ` · Detected industry: ${payload.detectedIndustry.category} (${payload.detectedIndustry.confidence}%)`
      : ""
  }`;

  const failedStages = (payload.stageTrace || []).filter(
    (s) => s.status === "failed",
  );
  const pipelineHealth =
    failedStages.length === 0 && (payload.pipelineWarnings?.length || 0) === 0
      ? "Pipeline health: all stages completed successfully."
      : `Pipeline health: ${failedStages.length} failed stage(s), ${(payload.pipelineWarnings || []).length} warning(s).`;

  return {
    issues,
    recs,
    aiShort,
    trustLine,
    diagnostics,
    pipelineHealth,
    failedStages,
  };
}

type YContext = {
  y: number;
  pageW: number;
  pageH: number;
  doc: jsPDF;
};

function makeEnsure(ctx: YContext, margin: number) {
  return (needed: number) => {
    if (ctx.y + needed > ctx.pageH - margin) {
      ctx.doc.addPage();
      ctx.y = margin;
    }
  };
}

/** Professional radar grid + polygon + axis labels (matches ScoreRadar axes). */
function drawRadarChartPdf(
  ctx: YContext,
  values: number[],
  labels: readonly string[],
  margin: number,
) {
  const { doc } = ctx;
  const R = 76;
  const cx = ctx.pageW / 2;
  const blockTop = ctx.y;
  const cy = blockTop + R + 36;
  const n = values.length;

  doc.setDrawColor(220, 224, 232);
  doc.setLineWidth(0.45);
  for (const pct of [25, 50, 75, 100]) {
    const rr = (R * pct) / 100;
    doc.circle(cx, cy, rr, "S");
  }

  for (let k = 0; k < n; k++) {
    const ang = Math.PI / 2 - (k * 2 * Math.PI) / n;
    const x2 = cx + R * Math.cos(ang);
    const y2 = cy - R * Math.sin(ang);
    doc.line(cx, cy, x2, y2);
  }

  const pts: { x: number; y: number }[] = [];
  for (let k = 0; k < n; k++) {
    const ang = Math.PI / 2 - (k * 2 * Math.PI) / n;
    const vr = (R * values[k]) / 100;
    pts.push({ x: cx + vr * Math.cos(ang), y: cy - vr * Math.sin(ang) });
  }

  doc.setDrawColor(0, 82, 204);
  doc.setLineWidth(1.35);
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    doc.line(a.x, a.y, b.x, b.y);
  }

  doc.setFillColor(0, 82, 204);
  for (const p of pts) {
    doc.circle(p.x, p.y, 2.2, "F");
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(55, 55, 62);
  for (let k = 0; k < n; k++) {
    const ang = Math.PI / 2 - (k * 2 * Math.PI) / n;
    const lx = cx + (R + 22) * Math.cos(ang);
    const ly = cy - (R + 22) * Math.sin(ang);
    const text = labels[k];
    const w = doc.getTextWidth(text);
    doc.text(text, lx - w / 2, ly + 3);
  }

  ctx.y = cy + R + 28;
}

/** Table: Dimension | Score | Bar (ASCII) | Band */
function drawRadarTablePdf(
  ctx: YContext,
  values: number[],
  labels: readonly string[],
  margin: number,
  textW: number,
) {
  const ensure = makeEnsure(ctx, margin);
  const { doc } = ctx;
  const rowH = 22;
  const colW = [textW * 0.38, 42, textW * 0.34, textW * 0.2];
  const x0 = margin;

  ensure(30);
  doc.setFillColor(241, 244, 250);
  doc.rect(x0, ctx.y - 4, textW, 22, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 30, 36);
  let x = x0 + 6;
  doc.text("Dimension", x, ctx.y + 10);
  x += colW[0];
  doc.text("Score", x, ctx.y + 10);
  x += colW[1];
  doc.text("Visual (0–100)", x, ctx.y + 10);
  x += colW[2];
  doc.text("Band", x, ctx.y + 10);
  ctx.y += 26;

  doc.setFont("helvetica", "normal");
  for (let i = 0; i < labels.length; i++) {
    ensure(rowH + 4);
    const v = values[i];
    const band = strengthLabel(v);
    if (i % 2 === 0) {
      doc.setFillColor(252, 253, 255);
      doc.rect(x0, ctx.y - 3, textW, rowH, "F");
    }
    doc.setTextColor(40, 40, 48);
    doc.setFontSize(9);
    x = x0 + 6;
    doc.setFont("helvetica", "bold");
    doc.text(labels[i], x, ctx.y + 10);
    x += colW[0];
    doc.setFont("helvetica", "normal");
    doc.text(String(v), x, ctx.y + 10);
    x += colW[1];
    const barW = colW[2] - 12;
    doc.setDrawColor(210, 214, 222);
    doc.setLineWidth(0.6);
    doc.roundedRect(x, ctx.y + 3, barW, 8, 2, 2, "S");
    doc.setFillColor(0, 82, 204);
    const fillW = (barW - 2) * (v / 100);
    if (fillW > 0.5) {
      doc.roundedRect(x + 1, ctx.y + 4, fillW, 6, 1.5, 1.5, "F");
    }
    x += colW[2];
    doc.setFontSize(8);
    doc.setTextColor(70, 70, 80);
    doc.text(band, x, ctx.y + 10);
    ctx.y += rowH;
  }
  ctx.y += 12;
}

function addPageFooters(doc: jsPDF, margin: number) {
  const total = doc.getNumberOfPages();
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 150);
    const foot = `SiteBlitz · Audit summary · Page ${i} of ${total}`;
    doc.text(foot, margin, pageH - 28);
    doc.setDrawColor(230, 232, 238);
    doc.setLineWidth(0.75);
    doc.line(margin, pageH - 36, pageW - margin, pageH - 36);
  }
}

function buildFriendlySummary(
  payload: Payload,
  overall: number,
  issueCount: number,
  recCount: number,
): string[] {
  const worst = [
    { name: "performance", value: Number(payload.scores.performance) || 0 },
    { name: "seo", value: Number(payload.scores.seo) || 0 },
    { name: "mobile", value: Number(payload.scores.mobile) || 0 },
    { name: "accessibility", value: Number(payload.scores.accessibility) || 0 },
    { name: "leads", value: Number(payload.scores.leadConversion) || 0 },
  ].sort((a, b) => a.value - b.value)[0];

  const healthLine =
    overall >= 80
      ? "Your website is in good shape and already performs better than most sites."
      : overall >= 60
        ? "Your website is functional, but a few weak areas are limiting growth."
        : "Your website needs focused fixes to improve trust, speed, and conversions.";

  const issueLine =
    issueCount === 0
      ? "No major technical issues were detected in this scan."
      : `${issueCount} issue(s) were detected, and ${recCount} practical fix(es) were generated.`;

  const focusLine = `Top focus area right now: ${worst.name.toUpperCase()} (${worst.value}/100).`;

  const outcomeLine = payload.roi
    ? `Estimated revenue upside after fixes: INR ${Math.round(payload.roi.monthlyUplift).toLocaleString("en-IN")} per month.`
    : "Revenue estimate is not available for this run, but fixes are still prioritized by impact.";

  const industryLine = payload.detectedIndustry
    ? `Detected business type: ${payload.detectedIndustry.category} (${payload.detectedIndustry.confidence}% confidence).`
    : "Industry classification confidence was limited in this run.";

  const trustLine =
    payload.overallTrustScore != null
      ? `Data trust score: ${payload.overallTrustScore}/100, indicating how reliable this audit evidence is.`
      : "Trust score unavailable for this run.";

  return [
    healthLine,
    issueLine,
    focusLine,
    outcomeLine,
    industryLine,
    trustLine,
  ];
}

function overallBand(
  overall: number,
): "Excellent" | "Good" | "Fair" | "Critical" {
  if (overall >= 85) return "Excellent";
  if (overall >= 70) return "Good";
  if (overall >= 50) return "Fair";
  return "Critical";
}

function drawExecutiveDashboard(
  ctx: YContext,
  margin: number,
  textW: number,
  payload: Payload,
  overall: number,
  issueCount: number,
  recCount: number,
) {
  const { doc } = ctx;
  const ensure = makeEnsure(ctx, margin);
  const cardGap = 10;
  const cardW = (textW - cardGap) / 2;
  const cardH = 62;

  const trustLabel =
    payload.overallTrustScore != null
      ? `${payload.overallTrustScore}/100`
      : "N/A";
  const industryLabel = payload.detectedIndustry
    ? `${payload.detectedIndustry.category} (${payload.detectedIndustry.confidence}%)`
    : "Unknown";

  const cards = [
    {
      title: "Overall Status",
      value: `${overall}/100 (${overallBand(overall)})`,
      tint: [232, 244, 255] as const,
    },
    {
      title: "Risk Signals",
      value: `${issueCount} issue(s)`,
      tint: [255, 241, 236] as const,
    },
    {
      title: "Action Plan",
      value: `${recCount} recommendation(s)`,
      tint: [237, 250, 241] as const,
    },
    {
      title: "Trust & Industry",
      value: `Trust ${trustLabel} · ${industryLabel}`,
      tint: [242, 242, 251] as const,
    },
  ];

  ensure(cardH * 2 + 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(22, 22, 30);
  doc.text("Executive dashboard", margin, ctx.y);
  ctx.y += 14;

  for (let i = 0; i < cards.length; i++) {
    const row = Math.floor(i / 2);
    const col = i % 2;
    const x = margin + col * (cardW + cardGap);
    const y = ctx.y + row * (cardH + 8);
    const c = cards[i];

    doc.setFillColor(c.tint[0], c.tint[1], c.tint[2]);
    doc.setDrawColor(222, 226, 236);
    doc.roundedRect(x, y, cardW, cardH, 5, 5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(58, 63, 75);
    doc.text(c.title, x + 10, y + 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(22, 26, 36);
    const wrapped = doc.splitTextToSize(c.value, cardW - 20);
    doc.text(wrapped.slice(0, 2), x + 10, y + 36);
  }

  ctx.y += cardH * 2 + 18;
}

function drawScoreHighlights(
  ctx: YContext,
  margin: number,
  textW: number,
  values: number[],
  labels: readonly string[],
) {
  const { doc } = ctx;
  const ensure = makeEnsure(ctx, margin);
  const pairs = labels.map((label, idx) => ({ label, value: values[idx] }));
  const top = [...pairs].sort((a, b) => b.value - a.value).slice(0, 2);
  const bottom = [...pairs].sort((a, b) => a.value - b.value).slice(0, 2);

  ensure(96);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 28);
  doc.text("Score highlights", margin, ctx.y);
  ctx.y += 14;

  const summary = `Strongest: ${top.map((x) => `${x.label} (${x.value})`).join(", ")} · Focus next: ${bottom
    .map((x) => `${x.label} (${x.value})`)
    .join(", ")}`;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(52, 52, 62);
  const lines = doc.splitTextToSize(summary, textW);
  for (const line of lines) {
    ensure(LINE);
    doc.text(line, margin, ctx.y);
    ctx.y += LINE;
  }
  ctx.y += 4;
}

function imageFormatFromDataUrl(dataUrl: string): "PNG" | "JPEG" | "WEBP" {
  const m = dataUrl
    .match(/^data:image\/(png|jpeg|jpg|webp);/i)?.[1]
    ?.toLowerCase();
  if (m === "jpeg" || m === "jpg") return "JPEG";
  if (m === "webp") return "WEBP";
  return "PNG";
}

async function optimizeImageForPdf(dataUrl: string): Promise<string> {
  // Keep small images untouched to avoid any quality loss.
  if (dataUrl.length < 2_200_000) return dataUrl;

  return await new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const maxWidth = 1600;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const targetW = Math.max(1, Math.round(img.width * scale));
        const targetH = Math.max(1, Math.round(img.height * scale));

        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, targetW, targetH);
        // JPEG dramatically reduces huge full-page screenshots while keeping readability.
        const compressed = canvas.toDataURL("image/jpeg", 0.75);
        resolve(compressed || dataUrl);
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function downloadTextReport(payload: Payload) {
  const overall = Math.round(Number(payload.scores.overall) || 0);
  const lines: string[] = [];
  lines.push("SITEBLITZ WEBSITE AUDIT REPORT");
  lines.push("");
  lines.push(`Target: ${payload.url}`);
  if (payload.userName) lines.push(`Prepared for: ${payload.userName}`);
  if (payload.companyName) lines.push(`Company: ${payload.companyName}`);
  lines.push(
    `Generated: ${new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`,
  );
  lines.push("");
  lines.push(`Overall Score: ${overall}/100`);
  lines.push("");
  lines.push("Scores:");
  lines.push(`- UI/UX: ${Math.round(Number(payload.scores.uiux) || 0)}`);
  lines.push(
    `- Performance: ${Math.round(Number(payload.scores.performance) || 0)}`,
  );
  lines.push(`- Mobile: ${Math.round(Number(payload.scores.mobile) || 0)}`);
  lines.push(
    `- Accessibility: ${Math.round(Number(payload.scores.accessibility) || 0)}`,
  );
  lines.push(`- SEO: ${Math.round(Number(payload.scores.seo) || 0)}`);
  lines.push(
    `- Lead Conversion: ${Math.round(Number(payload.scores.leadConversion) || 0)}`,
  );
  lines.push("");

  lines.push("Top Issues:");
  if (payload.issues.length === 0) {
    lines.push("- No issues detected in this run.");
  } else {
    for (const issue of payload.issues.slice(0, 15)) {
      lines.push(
        `- [${String(issue.severity).toUpperCase()}] ${issue.title}: ${issue.detail}`,
      );
    }
  }
  lines.push("");

  lines.push("Action Plan:");
  if (payload.recommendations.length === 0) {
    lines.push("- No recommendations available.");
  } else {
    for (const rec of payload.recommendations.slice(0, 12)) {
      lines.push(
        `- [${String(rec.priority).toUpperCase()}] ${rec.action} - ${rec.rationale}`,
      );
    }
  }
  lines.push("");

  if (payload.aiInsights?.executiveSummary) {
    lines.push("AI Summary:");
    lines.push(payload.aiInsights.executiveSummary);
    lines.push("");
  }

  if (payload.roi) {
    lines.push("Estimated ROI:");
    lines.push(
      `- Current Monthly Revenue: INR ${Math.round(payload.roi.currentRevenue).toLocaleString("en-IN")}`,
    );
    lines.push(
      `- Projected Monthly Revenue: INR ${Math.round(payload.roi.projectedRevenue).toLocaleString("en-IN")}`,
    );
    lines.push(
      `- Monthly Uplift: INR ${Math.round(payload.roi.monthlyUplift).toLocaleString("en-IN")}`,
    );
    lines.push("");
  }

  const blob = new Blob([lines.join("\n")], {
    type: "text/plain;charset=utf-8",
  });
  const name = buildReportFilename(payload.url).replace(/\.pdf$/i, ".txt");
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}

export default function PDFReport({
  payload,
  mode = "manual",
  selectedSections,
  buttonLabel,
  className,
}: {
  payload: Payload;
  mode?: "manual" | "automatic";
  selectedSections?: ReportSection[];
  buttonLabel?: string;
  className?: string;
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [toast, setToast] = useState<{
    kind: "error" | "success";
    message: string;
  } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (kind: "error" | "success", message: string) => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      setToast({ kind, message });
      toastTimer.current = setTimeout(
        () => setToast(null),
        kind === "error" ? 6000 : 3200,
      );
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const exportPdf = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const { jsPDF } = await import("jspdf");
      const pre = preprocessForPdf(payload);
      const sectionSet = new Set(
        selectedSections && selectedSections.length > 0
          ? selectedSections
          : mode === "automatic"
            ? AUTOMATIC_DEFAULT_SECTIONS
            : MANUAL_DEFAULT_SECTIONS,
      );
      const radarVals = radarValuesFromScores(payload.scores);
      const overall = Math.round(Number(payload.scores.overall) || 0);
      const friendlySummaryLines = buildFriendlySummary(
        payload,
        overall,
        payload.issues.length,
        payload.recommendations.length,
      );

      const doc = new jsPDF({
        unit: "pt",
        format: "a4",
        compress: true,
      });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const textW = pageW - 2 * MARGIN;

      const ctx: YContext = { y: MARGIN, pageW, pageH, doc };
      const ensure = makeEnsure(ctx, MARGIN);

      const setHeading = () => {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(18, 18, 24);
      };
      const setBody = () => {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(48, 48, 58);
      };

      // --- Header ---
      setHeading();
      doc.setFontSize(24);
      ensure(40);
      const reportBrand = (payload.companyName || "").trim() || "SiteBlitz";
      doc.text(reportBrand, MARGIN, ctx.y);
      ctx.y += 26;
      doc.setFontSize(11);
      doc.setTextColor(90, 94, 102);
      doc.text("Professional website audit", MARGIN, ctx.y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 82, 204);
      doc.text(
        "Data-backed growth report",
        pageW - MARGIN - doc.getTextWidth("Data-backed growth report"),
        ctx.y,
      );
      ctx.y += 8;
      doc.setDrawColor(0, 82, 204);
      doc.setLineWidth(2);
      doc.line(MARGIN, ctx.y + 6, pageW - MARGIN, ctx.y + 6);
      ctx.y += 22;

      doc.setFontSize(15);
      doc.setTextColor(22, 22, 30);
      doc.text("Professional Website Audit Report", MARGIN, ctx.y);
      ctx.y += 22;
      setBody();
      doc.setFontSize(10);
      const scanDate = new Date().toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
      ensure(LINE * 6);
      doc.text(`Target: ${payload.url}`, MARGIN, ctx.y);
      ctx.y += LINE;
      const preparedFor = payload.userName || payload.clientName;
      if (preparedFor) {
        doc.text(`Prepared for: ${preparedFor}`, MARGIN, ctx.y);
        ctx.y += LINE;
      }
      if (payload.companyName) {
        doc.text(`Company: ${payload.companyName}`, MARGIN, ctx.y);
        ctx.y += LINE;
      }
      doc.text(`Generated: ${scanDate}`, MARGIN, ctx.y);
      ctx.y += LINE + 10;

      // --- Overall callout ---
      ensure(52);
      doc.setFillColor(244, 247, 252);
      doc.roundedRect(MARGIN, ctx.y, textW, 64, 4, 4, "F");
      doc.setDrawColor(220, 226, 236);
      doc.roundedRect(MARGIN, ctx.y, textW, 64, 4, 4, "S");
      setHeading();
      doc.setFontSize(13);
      doc.setTextColor(18, 18, 24);
      doc.text(`Overall score: ${overall} / 100`, MARGIN + 14, ctx.y + 26);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(58, 63, 75);
      doc.text(
        `Performance band: ${overallBand(overall)} · Prioritized by business impact and technical urgency`,
        MARGIN + 14,
        ctx.y + 44,
      );
      ctx.y += 78;

      drawExecutiveDashboard(
        ctx,
        MARGIN,
        textW,
        payload,
        overall,
        payload.issues.length,
        payload.recommendations.length,
      );

      if (sectionSet.has("friendlySummary")) {
        setHeading();
        doc.setFontSize(12);
        ensure(22);
        doc.text("Simple business summary", MARGIN, ctx.y);
        ctx.y += 16;
        setBody();
        doc.setFontSize(10);
        for (const line of friendlySummaryLines) {
          for (const wrapped of doc.splitTextToSize(`• ${line}`, textW)) {
            ensure(LINE);
            doc.text(wrapped, MARGIN, ctx.y);
            ctx.y += LINE;
          }
          ctx.y += 2;
        }
        ctx.y += 8;
      }

      if (sectionSet.has("radar")) {
        // --- Radar breakdown (dedicated page for reliable rendering) ---
        doc.addPage();
        ctx.y = MARGIN;

        setHeading();
        doc.setFontSize(13);
        ensure(28);
        doc.text("Radar breakdown", MARGIN, ctx.y);
        ctx.y += 8;
        setBody();
        doc.setFontSize(9);
        doc.setTextColor(95, 99, 110);
        const sub = doc.splitTextToSize(
          "Six-pillar score profile (UI/UX, Performance, Mobile, Accessibility, SEO, Lead conversion) with practical strengths and weak spots.",
          textW,
        );
        for (const line of sub) {
          ensure(LINE);
          doc.text(line, MARGIN, ctx.y);
          ctx.y += LINE - 1;
        }
        ctx.y += 6;

        // Always print numeric score summary first so data is never missing.
        setHeading();
        doc.setFontSize(11);
        doc.setTextColor(25, 25, 33);
        ensure(20);
        doc.text("Score snapshot", MARGIN, ctx.y);
        ctx.y += 12;

        setBody();
        doc.setFontSize(9);
        doc.setTextColor(55, 55, 65);
        for (let i = 0; i < RADAR_LABELS.length; i++) {
          ensure(LINE);
          doc.text(
            `${i + 1}. ${RADAR_LABELS[i]}: ${radarVals[i]}/100 (${strengthLabel(radarVals[i])})`,
            MARGIN,
            ctx.y,
          );
          ctx.y += LINE - 1;
        }
        ctx.y += 8;

        drawRadarTablePdf(ctx, radarVals, RADAR_LABELS, MARGIN, textW);

        // Chart is visual enhancement; if anything goes wrong, keep report data-rich.
        try {
          ensure(280);
          drawRadarChartPdf(ctx, radarVals, RADAR_LABELS, MARGIN);
          drawScoreHighlights(ctx, MARGIN, textW, radarVals, RADAR_LABELS);
        } catch {
          ensure(LINE);
          setBody();
          doc.setFontSize(9);
          doc.setTextColor(95, 99, 110);
          doc.text(
            "Radar chart visualization unavailable in this export. Numeric breakdown above remains accurate.",
            MARGIN,
            ctx.y,
          );
          ctx.y += LINE;
        }
      }

      if (sectionSet.has("diagnostics")) {
        // --- Core diagnostics summary ---
        setHeading();
        doc.setFontSize(12);
        ensure(22);
        doc.text("Core diagnostics summary", MARGIN, ctx.y);
        ctx.y += 16;
        setBody();
        doc.setFontSize(10);
        doc.setTextColor(48, 48, 58);
        for (const line of doc.splitTextToSize(pre.diagnostics, textW)) {
          ensure(LINE);
          doc.text(line, MARGIN, ctx.y);
          ctx.y += LINE;
        }
        for (const line of doc.splitTextToSize(pre.pipelineHealth, textW)) {
          ensure(LINE);
          doc.text(line, MARGIN, ctx.y);
          ctx.y += LINE;
        }
        const diagLines = [
          `Overall: ${overall}/100`,
          `UI/UX: ${Math.round(Number(payload.scores.uiux) || 0)} · Performance: ${Math.round(Number(payload.scores.performance) || 0)} · Mobile: ${Math.round(Number(payload.scores.mobile) || 0)}`,
          `Accessibility: ${Math.round(Number(payload.scores.accessibility) || 0)} · SEO: ${Math.round(Number(payload.scores.seo) || 0)} · Lead Conversion: ${Math.round(Number(payload.scores.leadConversion) || 0)}`,
          payload.pipeline?.length
            ? `Pipeline evidence: ${payload.pipeline.join(" -> ")}`
            : "Pipeline evidence: not available",
        ];
        doc.setFontSize(9);
        doc.setTextColor(62, 62, 72);
        for (const item of diagLines) {
          for (const line of doc.splitTextToSize(`- ${item}`, textW)) {
            ensure(LINE);
            doc.text(line, MARGIN, ctx.y);
            ctx.y += LINE;
          }
        }
        if ((payload.pipelineWarnings || []).length > 0) {
          for (const warning of payload.pipelineWarnings || []) {
            for (const line of doc.splitTextToSize(
              `- Pipeline warning: ${warning}`,
              textW,
            )) {
              ensure(LINE);
              doc.text(line, MARGIN, ctx.y);
              ctx.y += LINE;
            }
          }
        }
        if (pre.failedStages.length > 0) {
          for (const s of pre.failedStages.slice(0, 8)) {
            for (const line of doc.splitTextToSize(
              `- Failed stage: ${s.stage} (${s.error || "unknown"})`,
              textW,
            )) {
              ensure(LINE);
              doc.text(line, MARGIN, ctx.y);
              ctx.y += LINE;
            }
          }
        }
        ctx.y += 8;
      }

      if (sectionSet.has("issues")) {
        // --- Key issues ---
        setHeading();
        doc.setFontSize(12);
        ensure(22);
        doc.text("Key issues detected", MARGIN, ctx.y);
        ctx.y += 16;
        setBody();
        doc.setFontSize(9);
        if (!pre.issues.length) {
          ensure(LINE);
          doc.text("No issues recorded for this export.", MARGIN, ctx.y);
          ctx.y += LINE;
        } else {
          let idx = 1;
          for (const it of pre.issues) {
            const bullet = `${idx}. [${it.sev}] ${it.text}`;
            for (const line of doc.splitTextToSize(bullet, textW)) {
              ensure(LINE);
              doc.text(line, MARGIN, ctx.y);
              ctx.y += LINE - 1;
            }
            ctx.y += 2;
            idx += 1;
          }
        }
        ctx.y += 6;
      }

      if (sectionSet.has("roadmap")) {
        // --- Recommendations ---
        setHeading();
        doc.setFontSize(12);
        ensure(22);
        doc.text("Actionable roadmap", MARGIN, ctx.y);
        ctx.y += 16;
        setBody();
        doc.setFontSize(9);
        if (!pre.recs.length) {
          ensure(LINE);
          doc.text("No recommendations in this export.", MARGIN, ctx.y);
          ctx.y += LINE;
        } else {
          let idx = 1;
          for (const r of pre.recs) {
            const bullet = `${idx}. [${r.pri}] ${r.text}`;
            for (const line of doc.splitTextToSize(bullet, textW)) {
              ensure(LINE);
              doc.text(line, MARGIN, ctx.y);
              ctx.y += LINE - 1;
            }
            ctx.y += 2;
            idx += 1;
          }
        }
        ctx.y += 6;
      }

      if (sectionSet.has("ai")) {
        // --- AI insights ---
        setHeading();
        doc.setFontSize(12);
        ensure(22);
        doc.text("AI insights (summary)", MARGIN, ctx.y);
        ctx.y += 16;
        setBody();
        doc.setFontSize(10);
        if (pre.aiShort) {
          for (const line of doc.splitTextToSize(pre.aiShort, textW)) {
            ensure(LINE);
            doc.text(line, MARGIN, ctx.y);
            ctx.y += LINE;
          }
        } else {
          ensure(LINE);
          doc.text("No AI summary available for this run.", MARGIN, ctx.y);
          ctx.y += LINE;
        }
        ctx.y += 8;
      }

      // --- Trust ---
      if (sectionSet.has("trust") && pre.trustLine) {
        setHeading();
        doc.setFontSize(12);
        ensure(22);
        doc.text("Trust & data quality", MARGIN, ctx.y);
        ctx.y += 16;
        setBody();
        doc.setFontSize(10);
        for (const line of doc.splitTextToSize(pre.trustLine, textW)) {
          ensure(LINE);
          doc.text(line, MARGIN, ctx.y);
          ctx.y += LINE;
        }
        ctx.y += 8;
      }

      // --- ROI ---
      if (sectionSet.has("roi") && payload.roi) {
        setHeading();
        doc.setFontSize(12);
        ensure(22);
        doc.text("ROI snapshot (illustrative)", MARGIN, ctx.y);
        ctx.y += 16;
        setBody();
        doc.setFontSize(9);
        const roiNote = payload.roiTrustMeta
          ? `${trustBadgeLabel(payload.roiTrustMeta.trustLevel as TrustLevel)} · ~${Math.round(payload.roiTrustMeta.confidence * 100)}% conf`
          : "Estimated";
        const inr = new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        }).format;
        const roiText = `(${roiNote}) Current ${inr(payload.roi.currentRevenue)} · Projected ${inr(payload.roi.projectedRevenue)} · Uplift ${inr(payload.roi.monthlyUplift)}`;
        for (const line of doc.splitTextToSize(roiText, textW)) {
          ensure(LINE);
          doc.text(line, MARGIN, ctx.y);
          ctx.y += LINE;
        }
      }

      // --- Manual Audit Report section ---
      if (
        sectionSet.has("manualAudit") &&
        payload.manualRules &&
        payload.manualRules.issues.length > 0
      ) {
        doc.addPage();
        ctx.y = MARGIN;

        // Bold header banner
        doc.setFillColor(30, 27, 75); // deep indigo
        doc.rect(MARGIN, ctx.y, textW, 42, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(200, 195, 255);
        doc.text("MANUAL AUDIT REPORT", MARGIN + 14, ctx.y + 28);
        ctx.y += 56;

        // Scores row
        setBody();
        doc.setFontSize(10);
        doc.setTextColor(48, 48, 58);
        const scoreRow = [
          payload.manualRules.uxScore != null
            ? `UX Score: ${payload.manualRules.uxScore}/100`
            : null,
          payload.manualRules.leadScore != null
            ? `Lead Gen Score: ${payload.manualRules.leadScore}/100`
            : null,
          `Issues detected: ${payload.manualRules.issues.length}`,
          payload.manualRules.roiImpact
            ? `Potential ROI gain: ${payload.manualRules.roiImpact}/mo`
            : null,
        ]
          .filter(Boolean)
          .join("  ·  ");
        for (const line of doc.splitTextToSize(scoreRow, textW)) {
          ensure(LINE);
          doc.text(line, MARGIN, ctx.y);
          ctx.y += LINE;
        }
        ctx.y += 8;

        // Rule breakdown table
        setHeading();
        doc.setFontSize(11);
        ensure(22);
        doc.text("Manual Rule Violations", MARGIN, ctx.y);
        ctx.y += 14;

        const colSource = 90;
        const colDetail = textW - colSource;

        // Header row
        doc.setFillColor(241, 244, 250);
        doc.rect(MARGIN, ctx.y - 4, textW, 20, "F");
        doc.setFontSize(9);
        doc.setTextColor(30, 30, 36);
        doc.text("Source", MARGIN + 6, ctx.y + 10);
        doc.text("Issue", MARGIN + colSource + 6, ctx.y + 10);
        ctx.y += 22;

        doc.setFont("helvetica", "normal");
        const manualIssues = payload.manualRules.issues.slice(0, 20);
        const uxCount = payload.manualRules.uxScore != null ? 3 : 0;
        manualIssues.forEach((issue, idx) => {
          const source = idx < uxCount ? "UX Rules" : "Lead Gen";
          const lines = doc.splitTextToSize(issue, colDetail - 12);
          const rowH = Math.max(20, lines.length * 12);
          ensure(rowH + 4);
          if (idx % 2 === 0) {
            doc.setFillColor(250, 250, 255);
            doc.rect(MARGIN, ctx.y - 3, textW, rowH, "F");
          }
          doc.setTextColor(80, 80, 160);
          doc.setFontSize(8);
          doc.text(source, MARGIN + 6, ctx.y + 10);
          doc.setTextColor(40, 40, 48);
          doc.setFontSize(9);
          lines.forEach((line: string, li: number) => {
            doc.text(line, MARGIN + colSource + 6, ctx.y + 10 + li * 11);
          });
          ctx.y += rowH;
        });
        ctx.y += 8;
      }

      addPageFooters(doc, MARGIN);

      const out = doc.output("arraybuffer");
      const blob = new Blob([out], { type: "application/pdf" });
      const name = buildReportFilename(payload.url);
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);

      showToast("success", "PDF downloaded.");
    } catch (error) {
      console.error("[pdf-export]", error);
      try {
        downloadTextReport(payload);
        showToast("error", "PDF failed. Downloaded clear text report instead.");
      } catch {
        showToast("error", "Failed to generate report. Try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="relative flex flex-col gap-1">
      <button
        type="button"
        onClick={() => void exportPdf()}
        disabled={isGenerating}
        className={
          className ||
          "whitespace-nowrap shrink-0 rounded-xl border border-white/40 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:pointer-events-none disabled:opacity-50"
        }
      >
        {isGenerating ? "Generating PDF…" : buttonLabel || "Export PDF Report"}
      </button>

      {toast ? (
        <div
          role="status"
          className={`fixed bottom-6 left-1/2 z-[100] max-w-md -translate-x-1/2 rounded-lg border px-4 py-3 text-sm shadow-lg ${
            toast.kind === "error"
              ? "border-destructive/40 bg-destructive/95 text-destructive-foreground"
              : "border-emerald-500/40 bg-emerald-950/95 text-emerald-50"
          }`}
        >
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}
