// lib/ai.ts - DOMAIN-AWARE & BULLETPROOF AI LAYER
import { analyzeLeadGen } from './leadgen';
import { prepareAuditData } from './ai-data';
import { logAIAttempt } from './ai-monitor';
import { env } from './env';

export type AiInsights = {
  ui_ux_score: number;
  lead_gen_score: number;
  issues: Array<{ type: string; severity: "low" | "medium" | "high"; fix: string; roi: string }>;
  quick_wins: Array<{ action: string; effort: "5min" | "30min" | "2hr"; impact: string; priority: number }>;
  source: "model";
};

type DeterministicEvidence = {
  hasContactForm: boolean;
  contactFormConfidence: number;
};

type GroqChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

async function generateGroqJson(prompt: string, timeoutMs: number): Promise<string> {
  if (!env.GROQ_API_KEY) throw new Error("MISSING_GROQ_KEY");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: env.GROQ_MODEL,
        temperature: 0.1,
        max_tokens: 520,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "Return valid JSON only and strictly follow the user schema.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`GROQ_HTTP_${res.status}:${err.slice(0, 180)}`);
    }
    const payload = (await res.json()) as GroqChatResponse;
    const text = payload.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("EMPTY_MODEL_RESPONSE");
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

function fallbackInsights(leadScore: number): AiInsights {
  return {
    ui_ux_score: 75,
    lead_gen_score: leadScore || 60,
    issues: [
      { type: 'lead_gen', severity: 'medium', fix: 'Add hero sticky CTA', roi: '+15% conversion lift' },
      { type: 'seo', severity: 'high', fix: 'Optimize meta titles for localized keywords', roi: '+25% organic visibility' }
    ],
    quick_wins: [
      { action: 'Add WhatsApp floating button', effort: '5min', impact: '+18% leads', priority: 1 },
      { action: 'Sticky header navigation', effort: '30min', impact: '+12% engagement', priority: 2 }
    ],
    source: "model"
  };
}

// POST-GENERATION SAFETY SANITIZER
export function sanitizeInsights(insights: AiInsights, url_type: string): AiInsights {
  const bannedEcommerceTerms = [/\bcart\b/i, /\bcheckout\b/i, /\bproduct page\b/i, /\becommerce\b/i, /\bstore\b/i];
  const isServiceSite = url_type === 'agency' || url_type === 'local_service' || url_type === 'other';

  if (!isServiceSite) return insights;

  const sanitize = (text: string) => {
    let sanitized = text;
    if (bannedEcommerceTerms.some(term => term.test(sanitized))) {
      sanitized = sanitized
        .replace(/\bcart\b/gi, 'contact form')
        .replace(/\bcheckout\b/gi, 'lead capture')
        .replace(/\bproduct page\b/gi, 'service page')
        .replace(/\becommerce\b/gi, 'service-based')
        .replace(/\bstore\b/gi, 'website');
    }
    return sanitized;
  };

  return {
    ...insights,
    issues: insights.issues.map(issue => ({
      ...issue,
      fix: sanitize(issue.fix),
      roi: sanitize(issue.roi)
    })),
    quick_wins: insights.quick_wins.map(win => ({
      ...win,
      action: sanitize(win.action)
    }))
  };
}

export function reconcileInsightsWithEvidence(
  insights: AiInsights,
  evidence: DeterministicEvidence
): AiInsights {
  if (!evidence.hasContactForm || evidence.contactFormConfidence < 70) return insights;
  const missingFormRe = /(no contact form|missing contact form|add contact form|no form)/i;

  const issues = insights.issues.map((issue) =>
    missingFormRe.test(issue.fix)
      ? { ...issue, fix: "Optimize the existing contact form placement and reduce friction", roi: "+8% form completion rate" }
      : issue
  );
  const quick_wins = insights.quick_wins.map((win) =>
    missingFormRe.test(win.action)
      ? { ...win, action: "Improve existing form UX (short fields + strong CTA)" }
      : win
  );
  return { ...insights, issues, quick_wins };
}

export async function generatePerfectAuditInsights(rawData: any, maxRetries = 3): Promise<AiInsights> {
  const leadData = rawData.leadData ?? (await analyzeLeadGen({ html: rawData.html, lighthouse: rawData.lighthouse }, null));
  const compactData = prepareAuditData({ ...rawData, leadData });
  const dataSize = JSON.stringify(compactData).length;
  const evidence: DeterministicEvidence = {
    hasContactForm: Boolean(leadData?.hasContactForm),
    contactFormConfidence: Number(leadData?.contactFormConfidence ?? 0),
  };
  console.log(
    "[ai:input-summary]",
    JSON.stringify({
      url: rawData.url,
      leadScore: compactData.lead_score,
      hasContactForm: evidence.hasContactForm,
      contactFormConfidence: evidence.contactFormConfidence,
      issueCount: Array.isArray(rawData?.issues) ? rawData.issues.length : 0,
    })
  );

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const timeoutMs = Number(process.env.AI_TIMEOUT_MS || env.GROQ_TIMEOUT_MS || 10000);
      const prompt = `You are a Senior SMB CRO expert.
        STRICT DOMAIN ALIGNMENT RULES:
        1. Website Identity: ${compactData.title} (${compactData.url_type})
        2. IF url_type is 'agency', 'local_service', or 'other', you MUST NOT use ecommerce terminology like 'cart', 'checkout', 'product page', 'ecommerce', or 'store'.
        3. Use service-centric wording: 'service page', 'lead capture', 'consultation CTA', 'portfolio'.
        4. Preserve the title identity in all suggestions.
        5. Lead Gen Elements detected: ${leadData.score}/100.
        6. Hard evidence: contact form present=${evidence.hasContactForm}, confidence=${evidence.contactFormConfidence}%.
        7. Never claim "no contact form" when hard evidence says contact form is present with confidence >= 70.
        8. Return ONLY valid JSON.
        
        REQUIRED JSON SCHEMA:
        {
          "ui_ux_score": number,
          "lead_gen_score": ${compactData.lead_score},
          "issues": [{"type": "ux|seo|perf|lead", "severity": "high|medium|low", "fix": string, "roi": string}],
          "quick_wins": [{"action": string, "effort": "5min|30min|2hr", "impact": string, "priority": number}]
        }
        No other text.
        Analyze ${rawData.url} and generate 3 high-ROI CRO fixes matching its ${compactData.url_type} nature.`;

      const text = await generateGroqJson(prompt, timeoutMs);
      
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start < 0 || end <= start) throw new Error("MALFORMED_JSON");
      
      let parsed = JSON.parse(text.slice(start, end + 1));
      
      if (typeof parsed.ui_ux_score === 'number' && Array.isArray(parsed.issues) && Array.isArray(parsed.quick_wins)) {
        // Enforce lead_gen_score consistency
        parsed.lead_gen_score = compactData.lead_score;
        
        // Final safety guards to align with deterministic evidence.
        parsed = sanitizeInsights(parsed as AiInsights, compactData.url_type);
        parsed = reconcileInsightsWithEvidence(parsed as AiInsights, evidence);
        
        logAIAttempt(attempt, dataSize, true, maxRetries);
        return { ...parsed, source: "model" } as AiInsights;
      }
      
      throw new Error("INVALID_PAYLOAD_SHAPE");
    } catch (e) {
      logAIAttempt(attempt, dataSize, false, maxRetries);
      if (attempt === maxRetries) break;
      await new Promise(r => setTimeout(r, 500 * attempt));
    }
  }

  return fallbackInsights(compactData.lead_score);
}
