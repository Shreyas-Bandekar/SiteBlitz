import { getAuthUserById } from "./db";
import { getRequestSessionToken, verifySessionToken } from "./session";

export async function getCurrentUser() {
  const token = await getRequestSessionToken();
  if (!token) {
    return null;
  }

  const payload = await verifySessionToken(token);
  if (!payload?.sub) {
    return null;
  }

  const user = await getAuthUserById(payload.sub);
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    emailVerified: user.email_verified,
    createdAt: user.created_at,
  };
}
