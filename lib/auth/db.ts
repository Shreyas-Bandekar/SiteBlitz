import { pgPool } from "../postgres";
import type { AuthUserRecord } from "./types";

export async function initAuthSchema(): Promise<void> {
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      email_verification_token_hash TEXT,
      email_verification_expires_at TIMESTAMPTZ,
      password_reset_token_hash TEXT,
      password_reset_expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

function mapRow(row: Record<string, unknown>): AuthUserRecord {
  return {
    id: String(row.id),
    email: String(row.email),
    password_hash: String(row.password_hash),
    email_verified: Boolean(row.email_verified),
    email_verification_token_hash: row.email_verification_token_hash
      ? String(row.email_verification_token_hash)
      : null,
    email_verification_expires_at: row.email_verification_expires_at
      ? new Date(String(row.email_verification_expires_at)).toISOString()
      : null,
    password_reset_token_hash: row.password_reset_token_hash
      ? String(row.password_reset_token_hash)
      : null,
    password_reset_expires_at: row.password_reset_expires_at
      ? new Date(String(row.password_reset_expires_at)).toISOString()
      : null,
    created_at: new Date(String(row.created_at)).toISOString(),
  };
}

export async function getAuthUserByEmail(
  email: string,
): Promise<AuthUserRecord | null> {
  await initAuthSchema();
  const result = await pgPool.query(
    `
    SELECT *
    FROM users
    WHERE lower(email) = lower($1)
    LIMIT 1
  `,
    [email],
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapRow(result.rows[0]);
}

export async function getAuthUserById(
  id: string,
): Promise<AuthUserRecord | null> {
  await initAuthSchema();
  const result = await pgPool.query(
    `
    SELECT *
    FROM users
    WHERE id = $1
    LIMIT 1
  `,
    [id],
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapRow(result.rows[0]);
}

export async function createAuthUser(input: {
  id: string;
  email: string;
  passwordHash: string;
  emailVerificationTokenHash: string;
  emailVerificationExpiresAt: Date;
}): Promise<AuthUserRecord> {
  await initAuthSchema();

  const result = await pgPool.query(
    `
    INSERT INTO users (
      id,
      email,
      password_hash,
      email_verified,
      email_verification_token_hash,
      email_verification_expires_at,
      password_reset_token_hash,
      password_reset_expires_at,
      created_at
    ) VALUES (
      $1,
      lower($2),
      $3,
      FALSE,
      $4,
      $5::timestamptz,
      NULL,
      NULL,
      NOW()
    )
    RETURNING *
  `,
    [
      input.id,
      input.email,
      input.passwordHash,
      input.emailVerificationTokenHash,
      input.emailVerificationExpiresAt.toISOString(),
    ],
  );

  return mapRow(result.rows[0]);
}

export async function verifyAuthUserEmailByTokenHash(
  tokenHash: string,
): Promise<AuthUserRecord | null> {
  await initAuthSchema();

  const result = await pgPool.query(
    `
    UPDATE users
    SET
      email_verified = TRUE,
      email_verification_token_hash = NULL,
      email_verification_expires_at = NULL
    WHERE
      email_verification_token_hash = $1
      AND email_verification_expires_at IS NOT NULL
      AND email_verification_expires_at > NOW()
    RETURNING *
  `,
    [tokenHash],
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapRow(result.rows[0]);
}

export async function setPasswordResetTokenForEmail(input: {
  email: string;
  tokenHash: string;
  expiresAt: Date;
}): Promise<AuthUserRecord | null> {
  await initAuthSchema();

  const result = await pgPool.query(
    `
    UPDATE users
    SET
      password_reset_token_hash = $1,
      password_reset_expires_at = $2::timestamptz
    WHERE lower(email) = lower($3)
    RETURNING *
  `,
    [input.tokenHash, input.expiresAt.toISOString(), input.email],
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapRow(result.rows[0]);
}

export async function resetPasswordByTokenHash(input: {
  tokenHash: string;
  newPasswordHash: string;
}): Promise<AuthUserRecord | null> {
  await initAuthSchema();

  const result = await pgPool.query(
    `
    UPDATE users
    SET
      password_hash = $1,
      password_reset_token_hash = NULL,
      password_reset_expires_at = NULL
    WHERE
      password_reset_token_hash = $2
      AND password_reset_expires_at IS NOT NULL
      AND password_reset_expires_at > NOW()
    RETURNING *
  `,
    [input.newPasswordHash, input.tokenHash],
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapRow(result.rows[0]);
}
