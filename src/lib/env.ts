import "server-only";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXCONN_APP_KEY: z.string().min(1),
  NEXCONN_APP_SECRET: z.string().min(1),
  NEXCONN_API_BASE: z.string().url().default("https://api.sg-light-api.com"),
  NEXCONN_API_BASE_BACKUP: z.string().url().default("https://api-b.sg-light-api.com"),
  NEXCONN_ID_PREFIX: z
    .string()
    .regex(/^[A-Za-z0-9]{1,12}$/, "NEXCONN_ID_PREFIX must be alphanumeric")
    .default("hdk"),
  SESSION_SECRET: z.string().min(32),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),
  GEMINI_FALLBACK_MODEL: z.string().optional(),
  GEMINI_EMBED_MODEL: z.string().optional(),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
});

let cached: z.infer<typeof schema> | null = null;

export function env() {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
      throw new Error(`Invalid server environment: ${missing}`);
    }
    cached = parsed.data;
  }
  return cached;
}
