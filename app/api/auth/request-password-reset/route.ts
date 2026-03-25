import {
  generateOneTimeToken,
  hashOneTimeToken,
} from "../../../../lib/auth-server";
import {
  getUserByEmail,
  setPasswordResetToken,
} from "../../../../lib/live-database";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return Response.json({
        ok: true,
        message: "If the account exists, a password reset link has been sent.",
      });
    }

    const token = generateOneTimeToken();
    const tokenHash = hashOneTimeToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await setPasswordResetToken(user.id, tokenHash, expiresAt);

    const origin = new URL(req.url).origin;
    const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(token)}`;
    console.log(
      "[auth:password-reset-link]",
      JSON.stringify({ email: user.email, resetUrl }),
    );

    return Response.json({
      ok: true,
      message: "Password reset link generated.",
      ...(process.env.NODE_ENV !== "production" ? { resetUrl } : {}),
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate password reset link",
      },
      { status: 500 },
    );
  }
}
