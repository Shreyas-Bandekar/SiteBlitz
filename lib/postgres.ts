import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

function sanitizeConnectionString(raw?: string): string {
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    parsed.searchParams.delete("sslmode");
    parsed.searchParams.delete("sslcert");
    parsed.searchParams.delete("sslkey");
    parsed.searchParams.delete("sslrootcert");
    return parsed.toString();
  } catch {
    return raw;
  }
}

const normalizedConnectionString = sanitizeConnectionString(connectionString);

const sslConfig = {
  rejectUnauthorized: false,
};

const globalForPg = globalThis as unknown as {
  siteblitzPgPool?: Pool;
};

export const pgPool =
  globalForPg.siteblitzPgPool ||
  new Pool({
    connectionString: normalizedConnectionString || undefined,
    ssl: normalizedConnectionString ? sslConfig : undefined,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.siteblitzPgPool = pgPool;
}
