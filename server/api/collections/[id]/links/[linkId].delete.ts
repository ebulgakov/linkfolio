import { and, eq, notExists } from "drizzle-orm";
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

  const deleted = await db
    .delete(collectionItems)
    .where(and(eq(collectionItems.id, linkId), eq(collectionItems.collectionId, collectionId)))
    .returning({ urlId: collectionItems.urlId });

  if (deleted.length === 0) {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }

  // The `urls` row (title/description/imageUrl cache) is shared across a
  // user's collections — see `server/db/schema.ts`'s comment on `urls` — so
  // it's only hard-deleted here once it's orphaned (no other collection_items
  // row references it anymore). This is what makes a deleted link's data not
  // resurface via the `existingUrl` reuse branch in `index.post.ts` if the
  // same URL is re-added later, while leaving it untouched if it's still in
  // use elsewhere. Expressed as a single self-atomic statement (not an app
  // transaction) since the neon-http driver doesn't support `db.transaction`.
  const { urlId } = deleted[0]!;
  await db
    .delete(urls)
    .where(
      and(
        eq(urls.id, urlId),
        notExists(db.select().from(collectionItems).where(eq(collectionItems.urlId, urlId)))
      )
    );

  setResponseStatus(event, 204);
  return null;
});
