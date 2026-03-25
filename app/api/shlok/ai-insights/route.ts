import { getShlokGroqInsights } from "../../../../lib/shlok-groq-insights";
import type { TrustData } from "../../../../lib/audit-types";

type ShlokAiInsightsRequest = {
  url?: string;
  auditData: { issues?: string[]; [key: string]: unknown };
  trust?: TrustData;
};

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { url, auditData, trust } = (await req.json()) as ShlokAiInsightsRequest;
    const fallbackTrust: TrustData = trust ?? {
      trustScore: 0,
      grade: "C",
      badgeText: "0% TRUST",
      factors: [],
    };
    const insights = await getShlokGroqInsights(auditData || {}, url || "api:/shlok/ai-insights", fallbackTrust);
    return Response.json(insights);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: "Failed to generate Shlok AI insights", details: message }, { status: 500 });
  }
}
