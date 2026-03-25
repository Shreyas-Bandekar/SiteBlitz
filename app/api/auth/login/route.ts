import { getUserByEmail } from "../../../../lib/live-database";
import { setSessionCookie, verifyPassword } from "../../../../lib/auth-server";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";
    const plainPassword = typeof password === "string" ? password : "";

    if (!normalizedEmail || !plainPassword) {
      return Response.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    const user = await getUserByEmail(normalizedEmail);
    if (!user) {
      return Response.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const valid = await verifyPassword(plainPassword, user.passwordHash);
    if (!valid) {
      return Response.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    await setSessionCookie({ userId: user.id, email: user.email });
    return Response.json({
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Login failed" },
      { status: 500 },
    );
  }
}
