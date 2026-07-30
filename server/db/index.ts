import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

// Pooled connection for application queries (Nitro route handlers). Migrations
// and admin tasks use DATABASE_URL_UNPOOLED via drizzle-kit / drizzle.config.ts
// instead, per the neon-postgres skill's pooled-vs-direct guidance.
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set — run `npx neon env pull` to refresh .env");
}

const sql = neon(process.env.DATABASE_URL);

export const db = drizzle({ client: sql, schema });
