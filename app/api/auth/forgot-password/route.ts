import { z } from "zod";
import { setPasswordResetTokenForEmail } from "../../../../lib/auth/db";
import { createHashedToken } from "../../../../lib/auth/token";

const forgotPasswordSchema = z.object({
  email: z.string().email().max(254),
});

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const parsed = forgotPasswordSchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid email" }, { status: 400 });
    }

    const reset = createHashedToken(60);
    const user = await setPasswordResetTokenForEmail({
      email: parsed.data.email.trim().toLowerCase(),
      tokenHash: reset.tokenHash,
      expiresAt: reset.expiresAt,
    });

    return Response.json({
      message: "If the email exists, a reset token was generated.",
      resetToken: user ? reset.token : null,
      resetExpiresAt: user ? reset.expiresAt.toISOString() : null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Forgot password failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
