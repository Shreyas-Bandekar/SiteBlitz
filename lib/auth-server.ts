import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { compare, hash } from "bcryptjs";
import crypto from "crypto";
import { getUserById } from "./live-database";
import { AUTH_COOKIE_NAME, getSecretBytes } from "./auth-config";

type SessionPayload = {
  userId: string;
  email: string;
};

export async function hashPassword(plainPassword: string) {
  return hash(plainPassword, 12);
}

export async function verifyPassword(
  plainPassword: string,
  passwordHash: string,
) {
  return compare(plainPassword, passwordHash);
}

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretBytes());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretBytes());
    const userId = typeof payload.userId === "string" ? payload.userId : null;
    const email = typeof payload.email === "string" ? payload.email : null;
    if (!userId || !email) return null;
    return { userId, email };
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: SessionPayload) {
  const token = await createSessionToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function generateOneTimeToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashOneTimeToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getAuthenticatedUser() {
  const session = await getSessionFromCookies();
  if (!session) return null;
  const user = await getUserById(session.userId);
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  };
}
