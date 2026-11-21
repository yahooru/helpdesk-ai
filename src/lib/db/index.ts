import "server-only";
import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Retries the HTTP request to Neon when the connection itself fails (DNS / reset / timeout before a
 * response). A failed connection means the query never reached the database, so retrying is safe.
 */
const retryingFetch: typeof fetch = async (input, init) => {
  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await fetch(input, init);
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, 250 * Math.pow(2, attempt)));
    }
  }
  throw lastError;
};
neonConfig.fetchFunction = retryingFetch;

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return drizzle(neon(url), { schema });
}

type Db = ReturnType<typeof createDb>;
let instance: Db | null = null;

export function db(): Db {
  if (!instance) instance = createDb();
  return instance;
}

export { schema };
