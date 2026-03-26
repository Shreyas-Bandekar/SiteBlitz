import { clearAuthSessionCookie } from "../../../../lib/auth/session";

export const runtime = "nodejs";

export async function POST() {
  try {
    await clearAuthSessionCookie();
    return Response.json({ message: "Logged out" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Logout failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
