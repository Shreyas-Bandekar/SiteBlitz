import type { TrustData } from "./audit-types";

type InsightsAuditData = {
  issues?: string[];
  recommendations?: Array<{ action?: string }>;
  leadGenAnalysis?: {
    hasContactForm?: boolean;
    contactFormConfidence?: number;
    contactFormEvidence?: string[];
  };
  [key: string]: unknown;
};

export type ShlokGroqInsights = {
  summary: string;
  quickWins: string[];
  trustScore: number;
  working: boolean;
  fallback?: string;
  fallbackReason?: string;
  sourceMode?: "real" | "fallback" | "skipped";
  evidenceSnippet?: string[];
};

type GroqChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

function getGroqConfig() {
  return {
    apiKey: process.env.GROQ_API_KEY || "",
    model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
    timeoutMs: Number(process.env.GROQ_TIMEOUT_MS || 12000),
  };
}

export function extractShlokQuickWins(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/^[-*\d\).\s]+/, "").trim())
    .filter((l) => l.length > 18)
    .slice(0, 3);
}

function reconcileWithLeadEvidence(wins: string[], summary: string, auditData: InsightsAuditData) {
  const lead = auditData.leadGenAnalysis;
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

function tryParseJson<T>(raw: string): T | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

export async function getShlokGroqInsights(
  auditData: InsightsAuditData,
  url: string,
  trust: TrustData
): Promise<ShlokGroqInsights> {
  const fallbackQuickWins = (auditData.recommendations || [])
    .map((r) => r?.action?.trim())
    .filter((v): v is string => Boolean(v))
    .slice(0, 3);
  const safeFallbackWins = fallbackQuickWins.length
    ? fallbackQuickWins
    : [
        "Improve above-fold CTA clarity",
        "Reduce friction on lead capture",
        "Strengthen trust signals near CTA",
      ];
  const fallbackSummary = `Trust ${trust.trustScore}/100. Manual rules detected ${(auditData?.issues?.length ?? 0)} fixes.`;
  const evidenceSnippet = (auditData.leadGenAnalysis?.contactFormEvidence ?? []).slice(0, 3);
  const { apiKey, model, timeoutMs } = getGroqConfig();

  if (!apiKey) {
    console.warn("[shlok:groq:report:failed]", JSON.stringify({ reason: "missing_key", url }));
    return {
      summary: fallbackSummary,
      quickWins: safeFallbackWins,
      trustScore: trust.trustScore,
      fallback: "Manual Mode Active (GROQ_API_KEY missing)",
      fallbackReason: "missing_key",
      sourceMode: "fallback",
      evidenceSnippet,
      working: true,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const prompt = [
      "You are an expert CRO and website audit consultant.",
      "Return strict JSON only with keys: summary (string), quickWins (string[3]).",
      "Constraints:",
      "- summary must be <= 220 chars, evidence-based, and executive tone.",
      "- quickWins must be actionable, site-specific, and non-generic.",
      "- Never invent issues not present in deterministic findings.",
      "- If contact form exists with confidence >= 60, do not suggest adding one.",
      "Deterministic findings:",
      JSON.stringify({ auditData, trustScore: trust.trustScore }),
    ].join("\n");

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: 220,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "Return only compact JSON. No markdown, no prose outside JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`http_${response.status}:${errText.slice(0, 200)}`);
    }

    const payload = (await response.json()) as GroqChatResponse;
    const content = payload.choices?.[0]?.message?.content?.trim() || "";
    if (!content) throw new Error("invalid_response:empty_text");

    const parsed =
      tryParseJson<{ summary?: string; quickWins?: string[] }>(content) ||
      tryParseJson<{ summary?: string; quickWins?: string[] }>(`{${content}}`);

    const rawSummary = (parsed?.summary || content).slice(0, 220);
    const parsedWins = Array.isArray(parsed?.quickWins)
      ? parsed.quickWins.slice(0, 3)
      : extractShlokQuickWins(content);
    const reconciled = reconcileWithLeadEvidence(parsedWins, rawSummary, auditData);

    return {
      summary: reconciled.summary || fallbackSummary,
      quickWins: reconciled.wins.length ? reconciled.wins : safeFallbackWins,
      trustScore: trust.trustScore,
      sourceMode: "real",
      evidenceSnippet,
      working: true,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const reason = /abort|timeout/i.test(message)
      ? "timeout"
      : /quota|429|rate/i.test(message)
        ? "quota"
        : /api key|permission|unauth|forbidden|401|403/i.test(message)
          ? "auth"
          : /invalid_response/i.test(message)
            ? "invalid_response"
            : "runtime_error";
    console.warn("[shlok:groq:report:failed]", JSON.stringify({ reason, url, error: message }));
    return {
      summary: fallbackSummary,
      quickWins: safeFallbackWins,
      trustScore: trust.trustScore,
      fallback: `Manual Mode Active (${reason})`,
      fallbackReason: reason,
      sourceMode: "fallback",
      evidenceSnippet,
      working: true,
    };
  } finally {
    clearTimeout(timeout);
  }
}
