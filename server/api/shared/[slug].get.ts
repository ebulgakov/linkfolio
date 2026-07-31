import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "~~/server/db";
import { collections } from "~~/server/db/schema";

// No requireUserId here - this route is deliberately public. Anonymous
// visitors reach it via a collection owner's copied share link.
const slugSchema = z.string().min(1);

export default defineEventHandler(async event => {
  const parsedSlug = slugSchema.safeParse(getRouterParam(event, "slug"));
  if (!parsedSlug.success) {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }

  const [collection] = await db
    .select({
      id: collections.id,
      name: collections.name,
      description: collections.description,
      slug: collections.slug,
      password: collections.password
    })
    .from(collections)
    .where(and(eq(collections.slug, parsedSlug.data), eq(collections.shared, true)));

  // Same 404 whether the slug doesn't exist or the collection exists but
  // isn't shared - the response must not leak which case it is.
  if (!collection) {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }

  const hasPassword = collection.password !== null;

  // The raw password never leaves the server - only whether one is set, and
  // whether this caller has already unlocked it (via the cookie set by
  // server/api/shared/[slug]/unlock.post.ts).
  return {
    name: collection.name,
    description: collection.description,
    slug: collection.slug,
    hasPassword,
    unlocked: !hasPassword || isUnlocked(event, collection.id, collection.password!)
  };
});
