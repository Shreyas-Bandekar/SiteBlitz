import { z } from "zod";
import { verifyAuthUserEmailByTokenHash } from "../../../../lib/auth/db";
import { hashToken } from "../../../../lib/auth/token";

const verifyEmailSchema = z.object({
  token: z.string().min(32).max(256),
});

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const parsed = verifyEmailSchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid verification token" },
        { status: 400 },
      );
    }

    const tokenHash = hashToken(parsed.data.token);
    const user = await verifyAuthUserEmailByTokenHash(tokenHash);
    if (!user) {
      return Response.json(
        { error: "Invalid or expired verification token" },
        { status: 400 },
      );
    }

    return Response.json({
      message: "Email verified successfully",
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.email_verified,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Email verification failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
