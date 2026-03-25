import crypto from "crypto";
import { z } from "zod";
import { createAuthUser, getAuthUserByEmail } from "../../../../lib/auth/db";
import { hashPassword } from "../../../../lib/auth/password";
import { createHashedToken } from "../../../../lib/auth/token";

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
    const verification = createHashedToken(24 * 60);

    const user = await createAuthUser({
      id: crypto.randomUUID(),
      email,
      passwordHash,
      emailVerificationTokenHash: verification.tokenHash,
      emailVerificationExpiresAt: verification.expiresAt,
    });

    return Response.json(
      {
        message: "Signup successful. Verify your email before logging in.",
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.email_verified,
        },
        verificationToken: verification.token,
        verificationExpiresAt: verification.expiresAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signup failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
