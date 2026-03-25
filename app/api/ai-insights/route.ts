import type { TrustData } from "../../../lib/audit-types";
import { getGeminiInsights } from "../../../lib/gemini-insights";

type AiInsightsRequest = {
  auditData: { issues?: string[]; [key: string]: unknown };
  trust: TrustData;
};

export async function POST(req: Request) {
  const { auditData, trust } = (await req.json()) as AiInsightsRequest
  const fallbackTrust: TrustData = trust ?? {
    trustScore: 0,
    grade: "C",
    badgeText: "0% TRUST",
    factors: [],
  };
  const insights = await getGeminiInsights(auditData, "api:/ai-insights", fallbackTrust);
  return Response.json(insights);
}
