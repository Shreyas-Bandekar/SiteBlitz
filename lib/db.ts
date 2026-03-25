import postgres from "postgres";

let cachedClient: postgres.Sql | null = null;

function getClient() {
  if (cachedClient) return cachedClient;

  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL or POSTGRES_URL must be set for online database storage",
    );
  }

  cachedClient = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 15,
    prepare: false,
  });

  return cachedClient;
}

export async function sql(strings: TemplateStringsArray, ...values: unknown[]) {
  const rows = await (getClient() as any)(strings, ...values);
  return { rows: rows as Array<Record<string, unknown>> };
}
