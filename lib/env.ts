import { z } from "zod";

const envSchema = z.object({
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default("llama-3.1-8b-instant"),
  GROQ_TIMEOUT_MS: z.coerce.number().int().positive().default(12000),
  OLLAMA_HOST: z.string().url().default("http://127.0.0.1:11434"),
  OLLAMA_MODEL: z.string().default("llama3.1:8b"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

const getEnv = (key: string) => {
  const val = process.env[key];
  return val === "" ? undefined : val;
};

export const env = envSchema.parse({
  GROQ_API_KEY: getEnv("GROQ_API_KEY"),
  GROQ_MODEL: getEnv("GROQ_MODEL"),
  GROQ_TIMEOUT_MS: getEnv("GROQ_TIMEOUT_MS"),
  OLLAMA_HOST: getEnv("OLLAMA_HOST"),
  OLLAMA_MODEL: getEnv("OLLAMA_MODEL"),
  LOG_LEVEL: getEnv("LOG_LEVEL"),
});
