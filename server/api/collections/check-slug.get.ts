import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";

import { db } from "../../db";
import { collections } from "../../db/schema";

// Same format/length/reserved-word rule as the create/update schema — this
// endpoint is polled while the user is mid-typing, so a not-yet-valid slug
// just reports unavailable (HTTP 200) rather than throwing a 400. Don't
// trust the client-side regex; re-validate here.
const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  .min(3)
  .max(64)
  .refine(s => !["new", "edit"].includes(s));

export default defineEventHandler(async event => {
  // Still session-guarded — don't leak slug availability to anonymous callers.
  await requireUserId(event);

  const query = getQuery(event);
  const rawSlug = typeof query.slug === "string" ? query.slug : "";

  const parsed = slugSchema.safeParse(rawSlug);
  if (!parsed.success) {
    return { available: false };
  }

  // Malformed `excludeId` must not reach the driver as a raw string (would
  // surface as an unhandled 500 from a `22P02 invalid input syntax for type
  // uuid` error). Treat it as "no exclusion" rather than throwing — this
  // endpoint is advisory and always responds 200.
  const rawExcludeId = typeof query.excludeId === "string" ? query.excludeId : undefined;
  const excludeId =
    rawExcludeId && z.uuid().safeParse(rawExcludeId).success ? rawExcludeId : undefined;

  // Slug is globally unique (plain `unique()` on the column, not per-user),
  // so this existence check is intentionally NOT scoped by userId.
  const where = excludeId
    ? and(eq(collections.slug, parsed.data), ne(collections.id, excludeId))
    : eq(collections.slug, parsed.data);

  const [conflict] = await db.select({ id: collections.id }).from(collections).where(where);

  return { available: !conflict };
});
