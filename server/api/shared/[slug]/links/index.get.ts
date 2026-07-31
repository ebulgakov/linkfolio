import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "~~/server/db";
import { collectionItems, collections, urls } from "~~/server/db/schema";

// No requireUserId here - this route is deliberately public, mirroring
// server/api/shared/[slug].get.ts.
const slugSchema = z.string().min(1);

export default defineEventHandler(async event => {
  const parsedSlug = slugSchema.safeParse(getRouterParam(event, "slug"));
  if (!parsedSlug.success) {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }

  const [collection] = await db
    .select({ id: collections.id })
    .from(collections)
    .where(and(eq(collections.slug, parsedSlug.data), eq(collections.shared, true)));

  if (!collection) {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }

  return db
    .select(sharedLinkSelection)
    .from(collectionItems)
    .innerJoin(urls, eq(collectionItems.urlId, urls.id))
    .where(eq(collectionItems.collectionId, collection.id))
    .orderBy(asc(collectionItems.position));
});
