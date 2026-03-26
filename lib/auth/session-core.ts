import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export const SESSION_COOKIE_NAME = "siteblitz_session";
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export interface SessionPayload extends JWTPayload {
  sub: string;
  email: string;
}

function getSessionSecret(): Uint8Array {
  const secret =
    process.env.AUTH_JWT_SECRET ||
    process.env.JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.DATABASE_URL;

  if (!secret) {
    throw new Error(
      "Missing session secret. Set AUTH_JWT_SECRET, JWT_SECRET, NEXTAUTH_SECRET, SUPABASE_SERVICE_ROLE_KEY, or DATABASE_URL.",
    );
  }

  return new TextEncoder().encode(secret);
}

export async function signSessionToken(payload: {
  sub: string;
  email: string;
}): Promise<string> {
  return new SignJWT({
    email: payload.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSessionSecret());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret(), {
      algorithms: ["HS256"],
    });

    if (
      !payload.sub ||
      typeof payload.email !== "string"
    ) {
      return null;
    }

    return payload as SessionPayload;
  } catch {
    return null;
  }
}
