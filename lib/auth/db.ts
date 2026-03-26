import { pgPool } from "../postgres";
import type { AuthUserRecord } from "./types";

export async function initAuthSchema(): Promise<void> {
  // Create table if it doesn't exist
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

function mapRow(row: Record<string, unknown>): AuthUserRecord {
  return {
    id: String(row.id),
    email: String(row.email),
    password_hash: String(row.password_hash),
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
}): Promise<AuthUserRecord> {
  await initAuthSchema();

  const result = await pgPool.query(
    `
    INSERT INTO users (
      id,
      email,
      password_hash,
      created_at
    ) VALUES (
      $1,
      lower($2),
      $3,
      NOW()
    )
    RETURNING *
  `,
    [input.id, input.email, input.passwordHash],
  );

  return mapRow(result.rows[0]);
}
