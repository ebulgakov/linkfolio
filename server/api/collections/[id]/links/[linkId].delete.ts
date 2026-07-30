import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../../../../db";
import { collectionItems, collections } from "../../../../db/schema";

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

  // Only removes the `collection_items` row — the `urls` row is deliberately
  // never deleted here, since it may be shared by other collections owned by
  // the same user (see `server/db/schema.ts`'s comment on `urls`).
  const deleted = await db
    .delete(collectionItems)
    .where(and(eq(collectionItems.id, linkId), eq(collectionItems.collectionId, collectionId)))
    .returning();

  if (deleted.length === 0) {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }

  setResponseStatus(event, 204);
  return null;
});
