// lib/ai.ts - BULLETPROOF AUDIT SCORING WITH GEMINI
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { analyzeLeadGen } from './leadgen';

export interface AuditInsights {
  ui_ux_score: number;
  lead_gen_score: number;
  issues: Array<{ type: string; severity: 'low' | 'medium' | 'high'; fix: string; roi: string }>;
  quick_wins: Array<{ action: string; effort: '5min' | '30min' | '2hr'; impact: string; priority: number }>;
}

export async function generatePerfectAuditInsights(rawData: any): Promise<AuditInsights> {
  const leadData = analyzeLeadGen({ html: rawData.html, lighthouse: rawData.lighthouse });
  
  const { text } = await generateText({
    model: google('gemini-1.5-flash'),
    temperature: 0.1,
    system: `You are a Senior CRO (Conversion Rate Optimization) consultant for SMBs. 
    Analyze this website audit data and return ONLY VALID JSON.
    
    CRITICAL REALITY CHECK: If you see lead elements in the HTML (forms/CTAs), acknowledge them.
    Lead Gen elements detected: ${leadData.score}/100.
    
    Return JSON with:
    1. ui_ux_score (0-100)
    2. lead_gen_score (use exactly: ${leadData.score})
    3. issues (max 5, each with type, severity, fix, roi narrative)
    4. quick_wins (exactly 3, each with action, effort, impact, priority)
    
    Make the ROI narrative very specific (e.g., "+25% organic uplift" or "+18% conversion bump") based on common SMB benchmarks.`,
    prompt: `Analyze ${rawData.url} based on: ${JSON.stringify({ lighthouse: rawData.lighthouse, leadGen: leadData })} and suggest 3 high-ROI fixes.`
  });

  try {
    const raw = text.trim();
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("No JSON object found");
    return JSON.parse(raw.slice(start, end + 1));
  } catch (err) {
    console.error('AI scoring failed, using fallback:', err);
    return {
      ui_ux_score: 75,
      lead_gen_score: leadData.score,
      issues: [{ type: 'generic', severity: 'medium', fix: 'Retry audit', roi: 'N/A' }],
      quick_wins: [{ action: 'Add hero CTA', effort: '5min', impact: '+15% conversions', priority: 1 }]
    };
  }
}
