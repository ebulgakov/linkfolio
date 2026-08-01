import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "~~/server/db";
import { collections } from "~~/server/db/schema";

const collectionSchema = z.object({
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().max(2000).optional().nullable(),
  shared: z.boolean(),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    .min(3)
    .max(64)
    .refine(s => !["new", "edit"].includes(s), { message: "This slug is reserved." }),
  password: z.string().trim().max(255).optional().nullable(),
  published: z.boolean(),
  imageUrl: z
    .url({ protocol: /^https?$/ })
    .max(2048)
    .optional()
    .nullable()
});

// A malformed (non-uuid) `:id` must not reach the driver as a raw string —
// Postgres raises `22P02 invalid input syntax for type uuid` for that, which
// would otherwise surface as an unhandled 500 instead of a clean 404.
const idSchema = z.uuid();

export default defineEventHandler(async event => {
  const userId = await requireUserId(event);

  const body = await readBody(event);
  const parsed = collectionSchema.safeParse(body);

  if (!parsed.success) {
    throwValidationError(parsed.error);
  }

  const parsedId = idSchema.safeParse(getRouterParam(event, "id"));
  if (!parsedId.success) {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }
  const id = parsedId.data;

  const [existing] = await db
    .select({ id: collections.id })
    .from(collections)
    .where(and(eq(collections.id, id), eq(collections.userId, userId)));

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }

  let collection: typeof collections.$inferSelect | undefined;

  try {
    [collection] = await db
      .update(collections)
      .set({
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        shared: parsed.data.shared,
        slug: parsed.data.slug,
        // `password` is optional in the schema (unlike the fields above), so
        // a caller that omits it entirely must leave the existing value
        // untouched rather than clearing it - only fold "" to null when the
        // field was actually sent. See index.post.ts for the insert-path
        // equivalent (there's no existing value to preserve on insert, so it
        // always collapses "" to null).
        ...(parsed.data.password === undefined ? {} : { password: parsed.data.password || null }),
        published: parsed.data.published,
        imageUrl: parsed.data.imageUrl ?? null,
        updatedAt: new Date()
      })
      .where(and(eq(collections.id, id), eq(collections.userId, userId)))
      .returning();
  } catch (error) {
    await throwCollectionUniqueViolation(error, {
      userId,
      name: parsed.data.name,
      slug: parsed.data.slug,
      excludeId: id
    });
  }

  // Row existed at the ownership check above but is gone by the time the
  // UPDATE ran (e.g. a concurrent delete raced us) — don't silently return a
  // 200 with an empty body.
  if (!collection) {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }

  return collection;
});
