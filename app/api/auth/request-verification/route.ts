import {
  getAuthenticatedUser,
  generateOneTimeToken,
  hashOneTimeToken,
} from "../../../../lib/auth-server";
import {
  getUserByEmail,
  setEmailVerificationToken,
} from "../../../../lib/live-database";

export async function POST(req: Request) {
  try {
    const sessionUser = await getAuthenticatedUser();
    const body = await req.json().catch(() => ({}));
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    const targetUser = sessionUser
      ? await getUserByEmail(sessionUser.email)
      : email
        ? await getUserByEmail(email)
        : null;

    if (!targetUser) {
      return Response.json({
        ok: true,
        message: "If the account exists, a verification link has been sent.",
      });
    }

    if (targetUser.emailVerified) {
      return Response.json({ ok: true, message: "Email is already verified." });
    }

    const token = generateOneTimeToken();
    const tokenHash = hashOneTimeToken(token);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await setEmailVerificationToken(targetUser.id, tokenHash, expiresAt);

    const origin = new URL(req.url).origin;
    const verificationUrl = `${origin}/verify-email?token=${encodeURIComponent(token)}`;
    console.log(
      "[auth:verify-email-link]",
      JSON.stringify({ email: targetUser.email, verificationUrl }),
    );

    return Response.json({
      ok: true,
      message: "Verification link generated.",
      ...(process.env.NODE_ENV !== "production" ? { verificationUrl } : {}),
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate verification link",
      },
      { status: 500 },
    );
  }
}
