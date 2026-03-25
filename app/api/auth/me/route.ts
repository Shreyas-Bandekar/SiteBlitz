import { getAuthenticatedUser } from "../../../../lib/auth-server";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return Response.json({ user });
}
