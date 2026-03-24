import { GoogleGenerativeAI } from '@google/generative-ai'
import type { GeminiInsights, TrustData } from "./audit-types";

type GeminiAuditData = {
  issues?: string[];
  recommendations?: Array<{ action?: string }>;
  [key: string]: unknown;
};

function resolveGeminiApiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
}

export function extractQuickWins(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/^[-*•\d\).\s]+/, "").trim())
    .filter((l) => l.length > 18)
    .slice(0, 3);
}

function reconcileWithLeadEvidence(wins: string[], summary: string, auditData: GeminiAuditData) {
  const lead = (auditData.leadGenAnalysis as { hasContactForm?: boolean; contactFormConfidence?: number; contactFormEvidence?: string[] } | undefined);
  const hasForm = Boolean(lead?.hasContactForm);
  const conf = Number(lead?.contactFormConfidence ?? 0);
  const re = /(add|create|install).*(contact form)|no contact form/i;
  if (hasForm && conf >= 60) {
    return {
      summary: summary.replace(/no contact form detected/gi, "contact form is present"),
      wins: wins.map((w) => (re.test(w) ? "Optimize existing contact form UX and reduce friction" : w)),
    };
  }
  if (hasForm && conf >= 40) {
    return {
      summary: summary.replace(/no contact form detected/gi, "contact form likely present (validate flow)"),
      wins: wins.map((w) => (re.test(w) ? "Validate contact form submit flow across devices" : w)),
    };
  }
  return { summary, wins };
}

export async function getGeminiInsights(auditData: GeminiAuditData, url: string, trust: TrustData): Promise<GeminiInsights> {
  const fallbackQuickWins =
    (auditData.recommendations || [])
      .map((r) => r?.action?.trim())
      .filter((v): v is string => Boolean(v))
      .slice(0, 3);
  const safeFallbackWins = fallbackQuickWins.length ? fallbackQuickWins : ["Improve above-fold CTA clarity", "Reduce friction on lead capture", "Strengthen trust signals near CTA"];
  const fallbackSummary = `Trust ${trust.trustScore}/100. Manual rules detected ${(auditData?.issues?.length ?? 0)} fixes.`;
  const timeoutMs = Number(process.env.GEMINI_TIMEOUT_MS || 12000);
  const apiKey = resolveGeminiApiKey();
  const evidenceSnippet = ((auditData.leadGenAnalysis as { contactFormEvidence?: string[] } | undefined)?.contactFormEvidence ?? []).slice(0, 3);
  if (!apiKey) {
    console.warn("[gemini:report:failed]", JSON.stringify({ reason: "missing_key", url }));
    return {
      summary: fallbackSummary,
      quickWins: safeFallbackWins,
      trustScore: trust.trustScore,
      fallback: "Manual Mode Active (GEMINI_API_KEY missing)",
      fallbackReason: "missing_key",
      sourceMode: "fallback",
      evidenceSnippet,
      working: true
    };
  }

  // BULLETPROOF Gemini
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }) // Faster
  
  const prompt = `Deterministic audit findings: ${JSON.stringify(auditData)}
Trust Score: ${trust.trustScore}/100.

Generate PROFESSIONAL insights:
-  Executive Summary (1 sentence, evidence-based)
-  3 Quick Fixes (actionable, site-specific)
-  Expected ROI lift
-  Tone: CEO consultant
- Never invent missing issues not present in deterministic findings.
- If contact form exists with confidence >= 60, do NOT suggest adding one.

KEEP SHORT. No fluff.`

  try {
    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`timeout:${timeoutMs}`)), timeoutMs)),
    ]);
    const insights = result.response.text().trim()
    if (!insights) throw new Error("invalid_response:empty_text");
    console.log("[gemini:report:ok]", JSON.stringify({ url, chars: insights.length, trust: trust.trustScore }));
    
    const rawSummary = insights.slice(0, 220);
    const parsedWins = extractQuickWins(insights);
    const reconciled = reconcileWithLeadEvidence(parsedWins, rawSummary, auditData);
    return {
      summary: reconciled.summary || fallbackSummary,
      quickWins: reconciled.wins.length ? reconciled.wins : safeFallbackWins,
      trustScore: trust.trustScore,
      sourceMode: "real",
      evidenceSnippet,
      working: true
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const reason =
      message.startsWith("timeout:")
        ? "timeout"
        : /quota|429|rate/i.test(message)
          ? "quota"
          : /api key|permission|unauth|forbidden|401|403/i.test(message)
            ? "auth"
            : /invalid_response/i.test(message)
              ? "invalid_response"
              : "runtime_error";
    console.warn("[gemini:report:failed]", JSON.stringify({ reason, url, error: message }));
    // FAILSAFE MANUAL INSIGHTS
    return {
      summary: fallbackSummary,
      quickWins: safeFallbackWins,
      trustScore: trust.trustScore,
      fallback: `Manual Mode Active (${reason})`,
      fallbackReason: reason,
      sourceMode: "fallback",
      evidenceSnippet,
      working: true
    }
  }
}
