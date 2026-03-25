import { getAuthUserById } from "../../../../lib/auth/db";
import {
  getRequestSessionToken,
  verifySessionToken,
} from "../../../../lib/auth/session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const token = await getRequestSessionToken();
    if (!token) {
      return Response.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const payload = await verifySessionToken(token);
    if (!payload?.sub) {
      return Response.json({ error: "Invalid session" }, { status: 401 });
    }

    const user = await getAuthUserById(payload.sub);
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json({
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.email_verified,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to fetch session";
    return Response.json({ error: message }, { status: 500 });
  }
}
