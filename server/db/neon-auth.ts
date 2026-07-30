import { pgSchema, uuid } from "drizzle-orm/pg-core";

/**
 * Neon Auth (managed Better Auth) owns its tables in a separate `neon_auth`
 * Postgres schema in the same database. This is a reference-only declaration
 * for FK typing against `neon_auth.user` — imported into `schema.ts` for
 * `.references()` calls only, and deliberately NOT re-exported from
 * `schema.ts`. Drizzle Kit collects the tables it manages from `schema.ts`'s
 * exports, so keeping this out of that file's exports keeps Drizzle Kit from
 * ever generating/managing this table (see `drizzle.config.ts`'s `schema`
 * path, which points at `schema.ts`, not this file).
 */
const neonAuthSchema = pgSchema("neon_auth");

export const neonAuthUsers = neonAuthSchema.table("user", {
  id: uuid("id").primaryKey()
});
