import { z } from "zod";

const envSchema = z.object({
  OLLAMA_HOST: z.string().url().default("http://127.0.0.1:11434"),
  OLLAMA_MODEL: z.string().default("llama3.1:8b"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export const env = envSchema.parse({
  OLLAMA_HOST: process.env.OLLAMA_HOST,
  OLLAMA_MODEL: process.env.OLLAMA_MODEL,
  LOG_LEVEL: process.env.LOG_LEVEL,
});
