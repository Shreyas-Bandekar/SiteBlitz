import { env } from "./env";
import { log } from "./logger";
import type { AiInsights, Recommendation, Severity } from "./audit-types";

type AiInput = {
  url: string;
  overall: number;
  recommendations: Recommendation[];
  issueCount: number;
};

function impactLabel(priority: Severity) {
  if (priority === "high") return "High conversion and bounce-rate impact";
  if (priority === "medium") return "Moderate engagement and SEO impact";
  return "Incremental trust and UX improvement";
}

export function buildFallbackAiInsights(input: AiInput): AiInsights {
  const topFixes = input.recommendations.slice(0, 3).map((rec) => ({
    priority: rec.priority,
    fix: rec.action,
    reason: rec.rationale,
    expectedImpact: impactLabel(rec.priority),
  }));

  return {
    executiveSummary: `SiteBlitz audited ${input.url} at ${input.overall}/100 with ${input.issueCount} detected issues. Focus the highest-priority fixes first to improve speed, discoverability, and lead capture.`,
    topFixesFirst: topFixes,
    businessImpactNarrative:
      "Improving performance and mobile usability reduces drop-off, while stronger SEO and accessibility improve trust and qualified traffic.",
    actionPlan30Days: [
      { week: "Week 1", focus: "Resolve top high-priority blockers", outcome: "Stabilize critical UX and conversion paths" },
      { week: "Week 2", focus: "Improve metadata and mobile interactions", outcome: "Increase search CTR and mobile engagement" },
      { week: "Week 3", focus: "Address accessibility and content structure", outcome: "Improve compliance and usability confidence" },
      { week: "Week 4", focus: "Polish messaging and monitor trend gains", outcome: "Sustain improvements and identify next opportunities" },
    ],
    source: "fallback",
  };
}

export async function generateAiInsights(input: AiInput): Promise<AiInsights> {
  const fallback = buildFallbackAiInsights(input);
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(`${env.OLLAMA_HOST}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: env.OLLAMA_MODEL,
        stream: false,
        prompt:
          "Generate JSON only with keys: executiveSummary, topFixesFirst (3 items with priority/fix/reason/expectedImpact), businessImpactNarrative, actionPlan30Days (4 items week/focus/outcome).\n" +
          JSON.stringify(input),
      }),
    });
    if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
    const json = (await res.json()) as { response?: string };
    const raw = (json.response || "").trim();
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("No JSON object returned from model");
    const parsed = JSON.parse(raw.slice(start, end + 1)) as Omit<AiInsights, "source">;
    if (!parsed.executiveSummary || !Array.isArray(parsed.topFixesFirst) || !Array.isArray(parsed.actionPlan30Days)) {
      throw new Error("Invalid AI payload shape");
    }
    return { ...parsed, source: "model" };
  } catch (error) {
    log("warn", "AI insights fallback triggered", { message: error instanceof Error ? error.message : "unknown" });
    return fallback;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
