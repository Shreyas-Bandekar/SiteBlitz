import { getRecentLiveAudits } from "../../../../lib/live-database";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limitValue = Number(searchParams.get("limit") || "20");
    const limit = Number.isFinite(limitValue)
      ? Math.max(1, Math.min(100, Math.floor(limitValue)))
      : 20;

    const records = await getRecentLiveAudits(limit);
    return Response.json({ records });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load audit history";
    return Response.json({ error: message }, { status: 500 });
  }
}
