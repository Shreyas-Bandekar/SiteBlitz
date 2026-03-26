import crypto from "crypto";
import { z } from "zod";
import { createAuthUser, getAuthUserByEmail } from "../../../../lib/auth/db";
import { hashPassword } from "../../../../lib/auth/password";
import {
  setAuthSessionCookie,
  signSessionToken,
} from "../../../../lib/auth/session";

const signupSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
});

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const parsed = signupSchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid email or password" },
        { status: 400 },
      );
    }

    const email = parsed.data.email.trim().toLowerCase();
    const existing = await getAuthUserByEmail(email);
    if (existing) {
      return Response.json({ error: "User already exists" }, { status: 409 });
    }

    const passwordHash = await hashPassword(parsed.data.password);

    const user = await createAuthUser({
      id: crypto.randomUUID(),
      email,
      passwordHash,
    });

    const sessionToken = await signSessionToken({
      sub: user.id,
      email: user.email,
    });
    await setAuthSessionCookie(sessionToken);

    return Response.json(
      {
        message: "Signup successful. You are now logged in.",
        user: {
          id: user.id,
          email: user.email,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signup failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
