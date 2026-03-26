import { z } from "zod";
import { getAuthUserByEmail } from "../../../../lib/auth/db";
import { verifyPassword } from "../../../../lib/auth/password";
import {
  setAuthSessionCookie,
  signSessionToken,
} from "../../../../lib/auth/session";

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
});

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const parsed = loginSchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid email or password" },
        { status: 400 },
      );
    }

    const email = parsed.data.email.trim().toLowerCase();
    const user = await getAuthUserByEmail(email);
    if (!user) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const validPassword = await verifyPassword(
      parsed.data.password,
      user.password_hash,
    );
    if (!validPassword) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const sessionToken = await signSessionToken({
      sub: user.id,
      email: user.email,
    });
    await setAuthSessionCookie(sessionToken);

    return Response.json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
