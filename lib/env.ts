import { z } from "zod";

const envSchema = z.object({
  GOOGLE_API_KEY: z.string().startsWith("AIza").optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export const env = envSchema.parse({
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
  LOG_LEVEL: process.env.LOG_LEVEL,
});
