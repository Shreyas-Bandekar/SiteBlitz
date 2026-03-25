import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { AUTH_COOKIE_NAME, getSecretBytes } from "./lib/auth-config";

async function hasValidSession(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return false;

  try {
    await jwtVerify(token, getSecretBytes());
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const authed = await hasValidSession(request);
  if (authed) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  loginUrl.searchParams.set("next", nextPath);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/audit/:path*", "/account/:path*"],
};
