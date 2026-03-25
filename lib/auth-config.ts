export const AUTH_COOKIE_NAME = "siteblitz_session";

export function getAuthSecret() {
  const value = process.env.AUTH_SECRET;
  if (value && value.trim().length >= 32) {
    return value;
  }

  if (process.env.NODE_ENV !== "production") {
    return "dev-only-siteblitz-auth-secret-change-me-123456";
  }

  throw new Error(
    "AUTH_SECRET must be set to a strong value (>=32 chars) in production",
  );
}

export function getSecretBytes() {
  return new TextEncoder().encode(getAuthSecret());
}
