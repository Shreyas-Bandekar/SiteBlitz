import crypto from "crypto";
import { z } from "zod";
import { createAuthUser, getAuthUserByEmail } from "../../../../lib/auth/db";
import { hashPassword } from "../../../../lib/auth/password";
import {
  setAuthSessionCookie,
  signSessionToken,
} from "../../../../lib/auth/session";

const signupSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
});

export const runtime = "nodejs";

export async function POST() {
  return Response.json(
    { error: "Registration is currently disabled." },
    { status: 403 },
  );
}
