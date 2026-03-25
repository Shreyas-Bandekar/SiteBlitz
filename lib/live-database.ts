import { sql } from "./db";
import type { LiveAuditHistory } from "./audit-types";

export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  emailVerified: boolean;
  createdAt: string;
};

export type AccountAuditRow = {
  id: string;
  url: string;
  industry: string;
  overall: number;
  status: string;
  timestamp: string;
};

export async function initLiveSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS siteblitz_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      email_verification_token_hash TEXT,
      email_verification_expires_at TIMESTAMPTZ,
      password_reset_token_hash TEXT,
      password_reset_expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS siteblitz_audits (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      url TEXT NOT NULL,
      industry TEXT NOT NULL,
      scores JSONB NOT NULL,
      issues JSONB NOT NULL,
      recommendations JSONB NOT NULL,
      competitors JSONB,
      analytics JSONB,
      roi JSONB,
      pipeline JSONB NOT NULL,
      status TEXT NOT NULL,
      timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE siteblitz_audits ADD COLUMN IF NOT EXISTS user_id TEXT`;
  await sql`ALTER TABLE siteblitz_users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE`;
  await sql`ALTER TABLE siteblitz_users ADD COLUMN IF NOT EXISTS email_verification_token_hash TEXT`;
  await sql`ALTER TABLE siteblitz_users ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMPTZ`;
  await sql`ALTER TABLE siteblitz_users ADD COLUMN IF NOT EXISTS password_reset_token_hash TEXT`;
  await sql`ALTER TABLE siteblitz_users ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMPTZ`;
  await sql`CREATE INDEX IF NOT EXISTS idx_siteblitz_users_email ON siteblitz_users (email)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_siteblitz_audits_user_url_time ON siteblitz_audits (user_id, url, timestamp DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_siteblitz_users_verify_token ON siteblitz_users (email_verification_token_hash)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_siteblitz_users_reset_token ON siteblitz_users (password_reset_token_hash)`;
}

export async function createUser(input: {
  id: string;
  email: string;
  passwordHash: string;
}): Promise<UserRecord> {
  await initLiveSchema();
  const result = await sql`
    INSERT INTO siteblitz_users (id, email, password_hash, email_verified, created_at)
    VALUES (${input.id}, ${input.email.toLowerCase()}, ${input.passwordHash}, FALSE, NOW())
    RETURNING id, email, password_hash, email_verified, created_at
  `;

  const row = result.rows[0];
  return {
    id: String(row.id),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    emailVerified: Boolean(row.email_verified),
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}

export async function getUserByEmail(
  email: string,
): Promise<UserRecord | null> {
  await initLiveSchema();
  const result = await sql`
    SELECT id, email, password_hash, email_verified, created_at
    FROM siteblitz_users
    WHERE email = ${email.toLowerCase()}
    LIMIT 1
  `;

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: String(row.id),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    emailVerified: Boolean(row.email_verified),
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}

export async function getUserById(id: string): Promise<UserRecord | null> {
  await initLiveSchema();
  const result = await sql`
    SELECT id, email, password_hash, email_verified, created_at
    FROM siteblitz_users
    WHERE id = ${id}
    LIMIT 1
  `;

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: String(row.id),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    emailVerified: Boolean(row.email_verified),
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}

export async function setEmailVerificationToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
) {
  await initLiveSchema();
  await sql`
    UPDATE siteblitz_users
    SET email_verification_token_hash = ${tokenHash},
        email_verification_expires_at = ${expiresAt.toISOString()}
    WHERE id = ${userId}
  `;
}

export async function verifyEmailByToken(
  tokenHash: string,
): Promise<UserRecord | null> {
  await initLiveSchema();
  const result = await sql`
    UPDATE siteblitz_users
    SET email_verified = TRUE,
        email_verification_token_hash = NULL,
        email_verification_expires_at = NULL
    WHERE email_verification_token_hash = ${tokenHash}
      AND email_verification_expires_at > NOW()
    RETURNING id, email, password_hash, email_verified, created_at
  `;

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: String(row.id),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    emailVerified: Boolean(row.email_verified),
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}

export async function setPasswordResetToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
) {
  await initLiveSchema();
  await sql`
    UPDATE siteblitz_users
    SET password_reset_token_hash = ${tokenHash},
        password_reset_expires_at = ${expiresAt.toISOString()}
    WHERE id = ${userId}
  `;
}

export async function resetPasswordByToken(
  tokenHash: string,
  passwordHash: string,
): Promise<UserRecord | null> {
  await initLiveSchema();
  const result = await sql`
    UPDATE siteblitz_users
    SET password_hash = ${passwordHash},
        password_reset_token_hash = NULL,
        password_reset_expires_at = NULL
    WHERE password_reset_token_hash = ${tokenHash}
      AND password_reset_expires_at > NOW()
    RETURNING id, email, password_hash, email_verified, created_at
  `;

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: String(row.id),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    emailVerified: Boolean(row.email_verified),
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}

export async function saveLiveAudit(report: {
  id: string;
  userId: string;
  url: string;
  industry: string;
  scores: unknown;
  issues: unknown;
  recommendations: unknown;
  competitors: unknown;
  analytics: unknown;
  roi: unknown;
  pipeline: unknown;
  status: string;
}) {
  await initLiveSchema();
  await sql`
    INSERT INTO siteblitz_audits (id, user_id, url, industry, scores, issues, recommendations, competitors, analytics, roi, pipeline, status, timestamp)
    VALUES (
      ${report.id},
      ${report.userId},
      ${report.url},
      ${report.industry},
      ${JSON.stringify(report.scores)}::jsonb,
      ${JSON.stringify(report.issues)}::jsonb,
      ${JSON.stringify(report.recommendations)}::jsonb,
      ${JSON.stringify(report.competitors)}::jsonb,
      ${JSON.stringify(report.analytics)}::jsonb,
      ${JSON.stringify(report.roi)}::jsonb,
      ${JSON.stringify(report.pipeline)}::jsonb,
      ${report.status},
      NOW()
    )
  `;
}

export async function getLiveAuditHistory(
  userId: string,
  url: string,
  limit = 10,
): Promise<LiveAuditHistory[]> {
  await initLiveSchema();
  const result = await sql`
    SELECT id, url, scores, timestamp
    FROM siteblitz_audits
    WHERE user_id = ${userId}
      AND url = ${url}
    ORDER BY timestamp DESC
    LIMIT ${limit}
  `;

  return result.rows.map((row) => ({
    id: String(row.id),
    url: String(row.url),
    scores: row.scores as LiveAuditHistory["scores"],
    timestamp: new Date(row.timestamp as string).toISOString(),
  }));
}

export async function getUserAuditHistory(
  userId: string,
  limit = 100,
): Promise<AccountAuditRow[]> {
  await initLiveSchema();
  const result = await sql`
    SELECT id, url, industry, scores, status, timestamp
    FROM siteblitz_audits
    WHERE user_id = ${userId}
    ORDER BY timestamp DESC
    LIMIT ${limit}
  `;

  return result.rows.map((row) => {
    const scores = row.scores as { overall?: number } | null;
    return {
      id: String(row.id),
      url: String(row.url),
      industry: String(row.industry),
      overall: Number(scores?.overall ?? 0),
      status: String(row.status),
      timestamp: new Date(row.timestamp as string).toISOString(),
    };
  });
}
