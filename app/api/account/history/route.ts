import { getRecentLiveAudits } from "../../../../lib/live-database";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const requestUrl = new URL(req.url);
    const limitRaw = Number(requestUrl.searchParams.get("limit") ?? "100");
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(limitRaw, 1), 500)
      : 100;

    const history = await getRecentLiveAudits(limit);
    return Response.json({ history });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load history";
    return Response.json({ error: message }, { status: 500 });
  }
}
