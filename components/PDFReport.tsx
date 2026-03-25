"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { TrustBreakdown, TrustLevel, TrustMeta } from "../lib/audit-types";
import { trustBadgeLabel } from "../lib/trust";
import type { jsPDF } from "jspdf";

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
  issues: Array<{ category: string; title: string; detail: string; severity: string }>;
  recommendations: Array<{ priority: string; action: string; rationale: string }>;
  summary: string;
  aiInsights?: {
    executiveSummary?: string;
    topFixesFirst?: Array<{ priority: string; fix: string; reason?: string; expectedImpact: string }>;
    businessImpactNarrative?: string;
    actionPlan30Days?: Array<{ week: string; focus: string; outcome: string }>;
    source?: "model";
    issues?: Array<{ fix: string }>;
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

const AUTOMATIC_DEFAULT_SECTIONS: ReportSection[] = ["friendlySummary", "issues", "roadmap", "trust", "roi"];

/** Same six dimensions as ScoreRadar.tsx */
const RADAR_LABELS = ["UI/UX", "Performance", "Mobile", "Accessibility", "SEO", "Leads"] as const;

function safeFilenameDomain(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./i, "").replace(/[^a-zA-Z0-9.-]/g, "_") || "report";
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
  const issues = payload.issues.slice(0, MAX_ISSUES).map((i) => ({
    sev: String(i.severity).toUpperCase(),
    text: `${i.title}: ${i.detail}`.slice(0, 220),
  }));

  const recs = payload.recommendations.slice(0, MAX_RECS).map((r) => ({
    pri: String(r.priority).toUpperCase(),
    text: `${r.action} — ${r.rationale}`.slice(0, 240),
  }));

  const aiShort = (payload.aiInsights?.executiveSummary || payload.summary || "")
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

  return { issues, recs, aiShort, trustLine, diagnostics };
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
function drawRadarChartPdf(ctx: YContext, values: number[], labels: readonly string[], margin: number) {
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
function drawRadarTablePdf(ctx: YContext, values: number[], labels: readonly string[], margin: number, textW: number) {
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

function buildFriendlySummary(payload: Payload, overall: number, issueCount: number, recCount: number): string[] {
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

  return [healthLine, issueLine, focusLine, outcomeLine];
}

function imageFormatFromDataUrl(dataUrl: string): "PNG" | "JPEG" | "WEBP" {
  const m = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);/i)?.[1]?.toLowerCase();
  if (m === "jpeg" || m === "jpg") return "JPEG";
  if (m === "webp") return "WEBP";
  return "PNG";
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
  const [toast, setToast] = useState<{ kind: "error" | "success"; message: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((kind: "error" | "success", message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ kind, message });
    toastTimer.current = setTimeout(() => setToast(null), kind === "error" ? 6000 : 3200);
  }, []);

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
        (selectedSections && selectedSections.length > 0)
          ? selectedSections
          : mode === "automatic"
          ? AUTOMATIC_DEFAULT_SECTIONS
          : MANUAL_DEFAULT_SECTIONS
      );
      const radarVals = radarValuesFromScores(payload.scores);
      const overall = Math.round(Number(payload.scores.overall) || 0);
      const friendlySummaryLines = buildFriendlySummary(payload, overall, payload.issues.length, payload.recommendations.length);

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
      const scanDate = new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
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
      doc.roundedRect(MARGIN, ctx.y, textW, 44, 4, 4, "F");
      doc.setDrawColor(220, 226, 236);
      doc.roundedRect(MARGIN, ctx.y, textW, 44, 4, 4, "S");
      setHeading();
      doc.setFontSize(13);
      doc.setTextColor(18, 18, 24);
      doc.text(`Overall score: ${overall} / 100`, MARGIN + 14, ctx.y + 28);
      ctx.y += 56;

      // --- Website screenshot ---
      const screenshotData = payload.screenshots?.desktop || payload.screenshot || payload.screenshots?.mobile;
      if (screenshotData) {
        setHeading();
        doc.setFontSize(12);
        ensure(22);
        doc.text("Website screenshot", MARGIN, ctx.y);
        ctx.y += 12;

        const imgW = textW;
        const imgH = Math.round((imgW * 9) / 16);
        ensure(imgH + 20);
        try {
          doc.setDrawColor(220, 226, 236);
          doc.roundedRect(MARGIN, ctx.y, imgW, imgH, 4, 4, "S");
          doc.addImage(screenshotData, imageFormatFromDataUrl(screenshotData), MARGIN + 2, ctx.y + 2, imgW - 4, imgH - 4);
          ctx.y += imgH + 14;
        } catch {
          setBody();
          doc.setFontSize(9);
          doc.text("Screenshot was captured but could not be embedded in this PDF format.", MARGIN, ctx.y + 12);
          ctx.y += 24;
        }
      }

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
        // --- Radar breakdown ---
        setHeading();
        doc.setFontSize(13);
        ensure(28);
        doc.text("Radar breakdown", MARGIN, ctx.y);
        ctx.y += 8;
        setBody();
        doc.setFontSize(9);
        doc.setTextColor(95, 99, 110);
        const sub = doc.splitTextToSize(
          "Six-pillar score profile (UI/UX, Performance, Mobile, Accessibility, SEO, Lead conversion) — aligned with the dashboard radar.",
          textW
        );
        for (const line of sub) {
          ensure(LINE);
          doc.text(line, MARGIN, ctx.y);
          ctx.y += LINE - 1;
        }
        ctx.y += 10;

        ensure(340);
        drawRadarChartPdf(ctx, radarVals, RADAR_LABELS, MARGIN);
        drawRadarTablePdf(ctx, radarVals, RADAR_LABELS, MARGIN, textW);
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
          for (const it of pre.issues) {
            const bullet = `• [${it.sev}] ${it.text}`;
            for (const line of doc.splitTextToSize(bullet, textW)) {
              ensure(LINE);
              doc.text(line, MARGIN, ctx.y);
              ctx.y += LINE - 1;
            }
            ctx.y += 2;
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
          for (const r of pre.recs) {
            const bullet = `• [${r.pri}] ${r.text}`;
            for (const line of doc.splitTextToSize(bullet, textW)) {
              ensure(LINE);
              doc.text(line, MARGIN, ctx.y);
              ctx.y += LINE - 1;
            }
            ctx.y += 2;
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
      if (sectionSet.has("manualAudit") && payload.manualRules && payload.manualRules.issues.length > 0) {
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
          payload.manualRules.uxScore != null ? `UX Score: ${payload.manualRules.uxScore}/100` : null,
          payload.manualRules.leadScore != null ? `Lead Gen Score: ${payload.manualRules.leadScore}/100` : null,
          `Issues detected: ${payload.manualRules.issues.length}`,
          payload.manualRules.roiImpact ? `Potential ROI gain: ${payload.manualRules.roiImpact}/mo` : null,
        ].filter(Boolean).join("  ·  ");
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
      showToast("error", "Failed to generate report. Try again.");
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
        className={className || "whitespace-nowrap shrink-0 rounded-xl border border-white/40 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:pointer-events-none disabled:opacity-50"}
      >
        {isGenerating ? "Generating PDF…" : (buttonLabel || "Export PDF Report")}
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
