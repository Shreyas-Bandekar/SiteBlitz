import crypto from "crypto";
import {
  createUser,
  getUserByEmail,
  setEmailVerificationToken,
} from "../../../../lib/live-database";
import {
  generateOneTimeToken,
  hashOneTimeToken,
  hashPassword,
  setSessionCookie,
} from "../../../../lib/auth-server";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";
    const plainPassword = typeof password === "string" ? password : "";

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      return Response.json(
        { error: "Valid email is required" },
        { status: 400 },
      );
    }
    if (plainPassword.length < 8) {
      return Response.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const existing = await getUserByEmail(normalizedEmail);
    if (existing) {
      return Response.json(
        { error: "Email is already registered" },
        { status: 409 },
      );
    }

    const user = await createUser({
      id: crypto.randomUUID(),
      email: normalizedEmail,
      passwordHash: await hashPassword(plainPassword),
    });

    const verificationToken = generateOneTimeToken();
    await setEmailVerificationToken(
      user.id,
      hashOneTimeToken(verificationToken),
      new Date(Date.now() + 24 * 60 * 60 * 1000),
    );

    await setSessionCookie({ userId: user.id, email: user.email });
    const origin = new URL(req.url).origin;
    const verificationUrl = `${origin}/verify-email?token=${encodeURIComponent(verificationToken)}`;
    console.log(
      "[auth:verify-email-link]",
      JSON.stringify({ email: user.email, verificationUrl }),
    );

    return Response.json({
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
      ...(process.env.NODE_ENV !== "production" ? { verificationUrl } : {}),
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create account",
      },
      { status: 500 },
    );
  }
}
