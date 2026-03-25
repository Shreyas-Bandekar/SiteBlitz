import { hashOneTimeToken } from "../../../../lib/auth-server";
import { verifyEmailByToken } from "../../../../lib/live-database";

export async function GET(req: Request) {
  const requestUrl = new URL(req.url);
  const token = requestUrl.searchParams.get("token")?.trim() || "";
  if (!token) {
    return Response.json({ error: "Token is required" }, { status: 400 });
  }

  const user = await verifyEmailByToken(hashOneTimeToken(token));
  if (!user) {
    return Response.json(
      { error: "Token is invalid or expired" },
      { status: 400 },
    );
  }

  return Response.json({ ok: true, message: "Email verified successfully" });
}
