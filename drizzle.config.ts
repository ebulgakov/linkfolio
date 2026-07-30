import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Migrations run against the direct (unpooled) connection, per the
// neon-postgres skill's guidance: pooled connections are for app queries,
// direct connections are for schema migrations/admin tasks.
if (!process.env.DATABASE_URL_UNPOOLED) {
  throw new Error("DATABASE_URL_UNPOOLED is not set — run `npx neon env pull` to refresh .env");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./server/db/schema.ts",
  out: "./server/db/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED
  },
  // Neon Auth owns its own tables in the `neon_auth` schema — restrict
  // Drizzle Kit to `public` so it never tries to manage/migrate them.
  schemaFilter: ["public"]
});
