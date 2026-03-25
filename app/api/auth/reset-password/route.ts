import { z } from "zod";
import { resetPasswordByTokenHash } from "../../../../lib/auth/db";
import { hashPassword } from "../../../../lib/auth/password";
import { hashToken } from "../../../../lib/auth/token";

const resetPasswordSchema = z.object({
  token: z.string().min(32).max(256),
  newPassword: z.string().min(8).max(128),
});

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const parsed = resetPasswordSchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid reset payload" }, { status: 400 });
    }

    const tokenHash = hashToken(parsed.data.token);
    const newPasswordHash = await hashPassword(parsed.data.newPassword);

    const user = await resetPasswordByTokenHash({
      tokenHash,
      newPasswordHash,
    });

    if (!user) {
      return Response.json(
        { error: "Invalid or expired reset token" },
        { status: 400 },
      );
    }

    return Response.json({ message: "Password updated successfully" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Reset password failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
