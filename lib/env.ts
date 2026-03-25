import { z } from "zod";

const envSchema = z.object({
  GROQ_API_KEY: z.string().startsWith("gsk_").optional(),
  GROQ_MODEL: z.string().default("llama-3.1-8b-instant"),
  GROQ_TIMEOUT_MS: z.coerce.number().int().positive().default(12000),
  OLLAMA_HOST: z.string().url().default("http://127.0.0.1:11434"),
  OLLAMA_MODEL: z.string().default("llama3.1:8b"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export const env = envSchema.parse({
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  GROQ_MODEL: process.env.GROQ_MODEL,
  GROQ_TIMEOUT_MS: process.env.GROQ_TIMEOUT_MS,
  OLLAMA_HOST: process.env.OLLAMA_HOST,
  OLLAMA_MODEL: process.env.OLLAMA_MODEL,
  LOG_LEVEL: process.env.LOG_LEVEL,
});
