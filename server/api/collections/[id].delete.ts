import { and, eq, inArray, notExists } from "drizzle-orm";
import { z } from "zod";

import { db } from "~~/server/db";
import { collectionItems, collections, urls } from "~~/server/db/schema";

// A malformed (non-uuid) `:id` must not reach the driver as a raw string —
// see collections/[id].get.ts for why.
const idSchema = z.uuid();

export default defineEventHandler(async event => {
  const userId = await requireUserId(event);

  const parsedId = idSchema.safeParse(getRouterParam(event, "id"));
  if (!parsedId.success) {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }
  const id = parsedId.data;

  const [existing] = await db
    .select({ id: collections.id, imageUrl: collections.imageUrl })
    .from(collections)
    .where(and(eq(collections.id, id), eq(collections.userId, userId)));

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }

  // Capture affected url ids before the FK cascade removes collection_items
  // rows for this collection - they're unrecoverable after the delete below.
  const items = await db
    .select({ urlId: collectionItems.urlId })
    .from(collectionItems)
    .where(eq(collectionItems.collectionId, id));

  const deleted = await db
    .delete(collections)
    .where(and(eq(collections.id, id), eq(collections.userId, userId)))
    .returning({ id: collections.id });

  if (deleted.length === 0) {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }

  // Best-effort cleanup of the collection's own image now that the row is
  // actually gone. Only the collection's `imageUrl` — `urls` rows' own
  // `imageUrl`s are deliberately left alone, same reasoning as the "DO NOT
  // touch the links DELETE handler" note on links/[linkId].delete.ts: a
  // `urls` row can be shared across multiple collections, so its image isn't
  // this collection's to delete just because this collection is gone.
  if (existing.imageUrl) {
    await deleteImageIfOwned(existing.imageUrl, userId);
  }

  // Same orphan-cleanup rationale as links/[linkId].delete.ts: `urls` is
  // shared per-user, only hard-deleted once nothing references it anymore.
  // Scoped by userId too (unlike that route) since schema.ts documents that
  // urls<->collections ownership isn't structurally enforced.
  const urlIds = items.map(item => item.urlId);
  if (urlIds.length > 0) {
    await db
      .delete(urls)
      .where(
        and(
          inArray(urls.id, urlIds),
          eq(urls.userId, userId),
          notExists(db.select().from(collectionItems).where(eq(collectionItems.urlId, urls.id)))
        )
      );
  }

  setResponseStatus(event, 204);
  return null;
});
