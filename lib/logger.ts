import { env } from "./env";

const order = { debug: 10, info: 20, warn: 30, error: 40 } as const;

export function log(level: keyof typeof order, message: string, meta?: Record<string, unknown>) {
  if (order[level] < order[env.LOG_LEVEL]) return;
  const payload = meta ? ` ${JSON.stringify(meta)}` : "";
  // eslint-disable-next-line no-console
  console[level](`[audit:${level}] ${message}${payload}`);
}
