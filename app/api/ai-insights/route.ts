import type { TrustData } from "../../../lib/audit-types";
import { getGroqInsights } from "../../../lib/groq-insights";

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
  const insights = await getGroqInsights(auditData, "api:/ai-insights", fallbackTrust);
  return Response.json(insights);
}
