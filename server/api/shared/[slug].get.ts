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
      name: collections.name,
      description: collections.description,
      slug: collections.slug
    })
    .from(collections)
    .where(and(eq(collections.slug, parsedSlug.data), eq(collections.shared, true)));

  // Same 404 whether the slug doesn't exist or the collection exists but
  // isn't shared - the response must not leak which case it is.
  if (!collection) {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }

  return collection;
});
