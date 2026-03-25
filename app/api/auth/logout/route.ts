import { clearSessionCookie } from "../../../../lib/auth-server";

export async function POST() {
  await clearSessionCookie();
  return Response.json({ ok: true });
}
