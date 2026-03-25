import type { GeminiInsights, TrustData } from "./audit-types";

type GeminiAuditData = {
  issues?: string[];
  recommendations?: Array<{ action?: string }>;
  [key: string]: unknown;
};

type GroqChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "from", "that", "this", "your", "you", "are", "was", "were", "have", "has", "had",
  "into", "onto", "about", "after", "before", "across", "only", "must", "should", "could", "would", "more", "less",
  "than", "over", "under", "into", "when", "then", "also", "very", "some", "many", "into", "site", "website",
]);

function resolveGroqApiKey() {
  return process.env.GROQ_API_KEY || "";
}

function resolveGroqModel() {
  return process.env.GROQ_MODEL || "llama-3.1-8b-instant";
}

function resolveTimeoutMs() {
  return Number(process.env.GROQ_TIMEOUT_MS || process.env.GEMINI_TIMEOUT_MS || 12000);
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

function tokenize(text: string): string[] {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 4 && !STOP_WORDS.has(t));
}

function isGenericWin(win: string): boolean {
  const w = win.toLowerCase();
  return (
    /improve (seo|performance|ux|ui)\b/.test(w) ||
    /optimi[sz]e (your |the )?website\b/.test(w) ||
    /enhance user experience\b/.test(w) ||
    /add more content\b/.test(w) ||
    /improve conversion rates?\b/.test(w)
  );
}

function dedupeWins(wins: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const w of wins) {
    const normalized = w.toLowerCase().replace(/\s+/g, " ").trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(w.trim());
  }
  return out;
}

function sanitizeActionText(text: string): string {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/^[-*•\d\).\s]+/, "")
    .replace(/\s*[.;,:]+\s*$/, "")
    .trim();
}

function hasUnsupportedClaim(text: string): boolean {
  const t = String(text || "").toLowerCase();
  return /(\$\d|\d+\s?%|\d+\s?(ms|kb|mb|gb|sec|seconds))/i.test(t);
}

function hasEvidenceOverlap(text: string, contextKeywords: Set<string>): boolean {
  const tokens = tokenize(text);
  if (!tokens.length) return false;
  const overlaps = tokens.filter((t) => contextKeywords.has(t));
  return overlaps.length >= 2;
}

function looksActionable(text: string): boolean {
  const t = String(text || "").toLowerCase();
  return /^(add|fix|reduce|improve|move|update|remove|compress|simplify|optimi[sz]e|place|validate)\b/.test(t);
}

function issueToAction(issue: string): string {
  const clean = sanitizeActionText(issue);
  if (!clean) return "";
  if (/^no\s+/i.test(clean)) return `Add ${clean.replace(/^no\s+/i, "").toLowerCase()}`;
  if (/^missing\s+/i.test(clean)) return `Add ${clean.replace(/^missing\s+/i, "").toLowerCase()}`;
  if (/^too\s+/i.test(clean)) return `Reduce ${clean.replace(/^too\s+/i, "").toLowerCase()}`;
  return `Fix: ${clean}`;
}

function buildDeterministicWins(auditData: GeminiAuditData): string[] {
  const fromRecommendations = (auditData.recommendations || [])
    .map((r) => sanitizeActionText(r?.action || ""))
    .filter((x) => x.length >= 10);

  const fromIssues = (auditData.issues || [])
    .map((i) => issueToAction(String(i || "")))
    .filter((x) => x.length >= 10);

  return dedupeWins([...fromRecommendations, ...fromIssues]).slice(0, 3);
}

function buildDeterministicSummary(auditData: GeminiAuditData, trust: TrustData): string {
  const topIssue = (auditData.issues || []).map((x) => sanitizeActionText(String(x || ""))).find(Boolean);
  const recCount = (auditData.recommendations || []).filter((r) => sanitizeActionText(r?.action || "").length > 0).length;
  if (topIssue) {
    return `Trust ${trust.trustScore}/100. Focus first on: ${topIssue.slice(0, 130)}.`;
  }
  return `Trust ${trust.trustScore}/100. ${recCount} evidence-backed actions identified from this audit.`;
}

function qualityGateWins(
  modelWins: string[],
  deterministicWins: string[],
  contextKeywords: Set<string>
): string[] {
  const filtered = dedupeWins(modelWins)
    .map((w) => sanitizeActionText(w))
    .filter((w) => w.length >= 20)
    .filter((w) => looksActionable(w))
    .filter((w) => !isGenericWin(w))
    .filter((w) => !hasUnsupportedClaim(w))
    .filter((w) => hasEvidenceOverlap(w, contextKeywords));

  if (filtered.length >= 3) return filtered.slice(0, 3);

  // Mix high-confidence model wins with deterministic evidence-backed actions.
  const mixed = dedupeWins([...filtered, ...deterministicWins]);
  return mixed.slice(0, 3);
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
  const deterministicWins = buildDeterministicWins(auditData);
  const safeFallbackWins = deterministicWins.length ? deterministicWins : ["Review flagged issues and apply the top recommendation", "Improve conversion flow using detected friction points", "Re-run audit after implementing the first two fixes"];
  const fallbackSummary = buildDeterministicSummary(auditData, trust);
  const timeoutMs = resolveTimeoutMs();
  const apiKey = resolveGroqApiKey();
  const model = resolveGroqModel();
  const evidenceSnippet = ((auditData.leadGenAnalysis as { contactFormEvidence?: string[] } | undefined)?.contactFormEvidence ?? []).slice(0, 3);
  if (!apiKey) {
    console.warn("[ai:report:failed]", JSON.stringify({ reason: "missing_key", provider: "groq", url }));
    return {
      summary: fallbackSummary,
      quickWins: safeFallbackWins,
      trustScore: trust.trustScore,
      fallback: "Manual Mode Active (GROQ_API_KEY missing)",
      fallbackReason: "missing_key",
      sourceMode: "fallback",
      evidenceSnippet,
      working: true
    };
  }

  const contextKeywords = new Set<string>([
    ...tokenize((auditData.issues || []).join(" ")),
    ...tokenize((auditData.recommendations || []).map((r) => r?.action || "").join(" ")),
  ]);

  const evidence = {
    trustScore: trust.trustScore,
    issues: (auditData.issues || []).map((x) => String(x || "").trim()).filter(Boolean).slice(0, 12),
    recommendations: (auditData.recommendations || [])
      .map((r) => String(r?.action || "").trim())
      .filter(Boolean)
      .slice(0, 12),
    leadGen: auditData.leadGenAnalysis || null,
    scores: auditData.pipelineScores || null,
  };

  const prompt = [
    "You are a strict deterministic CRO assistant.",
    "Return JSON only with exact keys: summary (string), quickWins (string[3]).",
    "Hard rules:",
    "- Use ONLY the evidence provided below. Do not invent issues, numbers, tools, or claims.",
    "- Every quick win must map to at least one evidence issue/recommendation.",
    "- Write concrete actions, not generic advice.",
    "- If contact form exists with confidence >= 60, do NOT suggest adding a contact form.",
    "- summary max 220 chars.",
    "- quickWins must be 3 concise implementation actions.",
    "Evidence JSON:",
    JSON.stringify(evidence),
  ].join("\n");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 320,
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

    clearTimeout(timeout);

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
    const parsedWins = Array.isArray(parsed?.quickWins) ? parsed.quickWins.slice(0, 6) : extractQuickWins(content);
    const gatedWins = qualityGateWins(parsedWins, safeFallbackWins, contextKeywords);
    const reconciled = reconcileWithLeadEvidence(gatedWins, rawSummary, auditData);
    const finalSummary = hasEvidenceOverlap(reconciled.summary, contextKeywords)
      ? reconciled.summary
      : fallbackSummary;
    console.log("[ai:report:ok]", JSON.stringify({ provider: "groq", url, chars: content.length, trust: trust.trustScore }));

    return {
      summary: finalSummary,
      quickWins: reconciled.wins.length ? reconciled.wins : safeFallbackWins,
      trustScore: trust.trustScore,
      sourceMode: "real",
      evidenceSnippet,
      working: true
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const reason =
      /abort|timeout/i.test(message)
        ? "timeout"
        : /quota|429|rate/i.test(message)
          ? "quota"
          : /api key|permission|unauth|forbidden|401|403/i.test(message)
            ? "auth"
            : /invalid_response/i.test(message)
              ? "invalid_response"
              : "runtime_error";
    console.warn("[ai:report:failed]", JSON.stringify({ reason, provider: "groq", url, error: message }));
    return {
      summary: fallbackSummary,
      quickWins: safeFallbackWins,
      trustScore: trust.trustScore,
      fallback: `Manual Mode Active (${reason})`,
      fallbackReason: reason,
      sourceMode: "fallback",
      evidenceSnippet,
      working: true
    };
  }
}
