import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error("Missing DATABASE_URL or POSTGRES_URL");
}

function sanitizeConnectionString(raw: string): string {
  const parsed = new URL(raw);
  parsed.searchParams.delete("sslmode");
  parsed.searchParams.delete("sslcert");
  parsed.searchParams.delete("sslkey");
  parsed.searchParams.delete("sslrootcert");
  return parsed.toString();
}

const normalizedConnectionString = sanitizeConnectionString(connectionString);

const sslConfig = {
  // Supabase pooler commonly needs this in local Node environments
  // where TLS chains are re-signed by system/network tooling.
  rejectUnauthorized: false,
};

const globalForPg = globalThis as unknown as {
  siteblitzPgPool?: Pool;
};

export const pgPool =
  globalForPg.siteblitzPgPool ||
  new Pool({
    connectionString: normalizedConnectionString,
    ssl: sslConfig,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.siteblitzPgPool = pgPool;
}
