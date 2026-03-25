import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "./lib/auth/session-core";

function redirectToLogin(req: NextRequest): NextResponse {
  const loginUrl = new URL("/login", req.url);
  const redirectTarget = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  loginUrl.searchParams.set("redirect", redirectTarget);
  return NextResponse.redirect(loginUrl);
}

function unauthorizedApiResponse(
  status: number,
  message: string,
): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function middleware(req: NextRequest) {
  const isApiRequest = req.nextUrl.pathname.startsWith("/api/");
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    if (isApiRequest) {
      return unauthorizedApiResponse(401, "Unauthenticated");
    }
    return redirectToLogin(req);
  }

  const payload = await verifySessionToken(token);
  if (!payload?.sub) {
    if (isApiRequest) {
      return unauthorizedApiResponse(401, "Invalid session");
    }
    return redirectToLogin(req);
  }

  if (!payload.emailVerified) {
    if (isApiRequest) {
      return unauthorizedApiResponse(403, "Email not verified");
    }
    const verifyUrl = new URL("/verify-email", req.url);
    verifyUrl.searchParams.set("required", "1");
    return NextResponse.redirect(verifyUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/account/:path*",
    "/audit/:path*",
    "/api/audit/:path*",
  ],
};
