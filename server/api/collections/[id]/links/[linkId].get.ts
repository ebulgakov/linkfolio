import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "~~/server/db";
import { collectionItems, collections, urls } from "~~/server/db/schema";

// Malformed (non-uuid) route params must not reach the driver as raw
// strings — see `collections/[id].get.ts` for why.
const idSchema = z.uuid();

export default defineEventHandler(async event => {
  const userId = await requireUserId(event);

  const parsedCollectionId = idSchema.safeParse(getRouterParam(event, "id"));
  const parsedLinkId = idSchema.safeParse(getRouterParam(event, "linkId"));
  if (!parsedCollectionId.success || !parsedLinkId.success) {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }
  const collectionId = parsedCollectionId.data;
  const linkId = parsedLinkId.data;

  const [collection] = await db
    .select({ id: collections.id })
    .from(collections)
    .where(and(eq(collections.id, collectionId), eq(collections.userId, userId)));

  if (!collection) {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }

  const [link] = await db
    .select(linkSelection)
    .from(collectionItems)
    .innerJoin(urls, eq(collectionItems.urlId, urls.id))
    .where(and(eq(collectionItems.id, linkId), eq(collectionItems.collectionId, collectionId)));

  if (!link) {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }

  return link;
});
