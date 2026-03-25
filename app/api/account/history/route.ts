import { getAuthenticatedUser } from "../../../../lib/auth-server";
import { getUserAuditHistory } from "../../../../lib/live-database";

export async function GET(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestUrl = new URL(req.url);
  const limitRaw = Number(requestUrl.searchParams.get("limit") ?? "100");
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), 500)
    : 100;

  const history = await getUserAuditHistory(user.id, limit);
  return Response.json({ history });
}
