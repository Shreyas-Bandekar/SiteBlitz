import { hashOneTimeToken, hashPassword } from "../../../../lib/auth-server";
import { resetPasswordByToken } from "../../../../lib/live-database";

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();
    const safeToken = typeof token === "string" ? token.trim() : "";
    const safePassword = typeof password === "string" ? password : "";

    if (!safeToken) {
      return Response.json(
        { error: "Reset token is required" },
        { status: 400 },
      );
    }
    if (safePassword.length < 8) {
      return Response.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const updatedUser = await resetPasswordByToken(
      hashOneTimeToken(safeToken),
      await hashPassword(safePassword),
    );

    if (!updatedUser) {
      return Response.json(
        { error: "Token is invalid or expired" },
        { status: 400 },
      );
    }

    return Response.json({ ok: true, message: "Password reset successful" });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to reset password",
      },
      { status: 500 },
    );
  }
}
