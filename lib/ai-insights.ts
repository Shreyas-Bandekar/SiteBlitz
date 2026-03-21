import { env } from "./env";
import type { AiInsights, Recommendation } from "./audit-types";

type AiInput = {
  url: string;
  overall: number;
  recommendations: Recommendation[];
  issueCount: number;
};

export async function generateAiInsights(input: AiInput): Promise<AiInsights> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 25000);
  try {
    await ensureModelAvailable(env.OLLAMA_MODEL);
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
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
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`ai stage failed: Ollama request timed out after ${TIMEOUT_MS}ms`);
    }
    const message = error instanceof Error ? error.message : "Unknown AI generation error";
    throw new Error(`ai stage failed: ${message}`);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

let tagsCache: { models: string[]; expiresAt: number } | null = null;
async function ensureModelAvailable(model: string) {
  if (tagsCache && tagsCache.expiresAt > Date.now()) {
    if (!tagsCache.models.includes(model)) throw new Error(`ai stage failed: ai:model not installed (${model})`);
    return;
  }
  const res = await fetch(`${env.OLLAMA_HOST}/api/tags`);
  if (!res.ok) throw new Error(`ai stage failed: unable to read Ollama tags (${res.status})`);
  const json = (await res.json()) as { models?: Array<{ name?: string }> };
  const models = (json.models || []).map((m) => m.name || "").filter(Boolean);
  tagsCache = { models, expiresAt: Date.now() + 60_000 };
  if (!models.includes(model)) throw new Error(`ai stage failed: ai:model not installed (${model})`);
}
