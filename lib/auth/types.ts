export interface AuthUserRecord {
  id: string;
  email: string;
  password_hash: string;
  email_verified: boolean;
  email_verification_token_hash: string | null;
  email_verification_expires_at: string | null;
  password_reset_token_hash: string | null;
  password_reset_expires_at: string | null;
  created_at: string;
}

export interface SessionUser {
  id: string;
  email: string;
  emailVerified: boolean;
}
