import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "~~/server/db";
import { collectionItems, collections, urls } from "~~/server/db/schema";

// A malformed (non-uuid) `:id` must not reach the driver as a raw string —
// Postgres raises `22P02 invalid input syntax for type uuid` for that, which
// would otherwise surface as an unhandled 500 instead of a clean 404.
const idSchema = z.uuid();

export default defineEventHandler(async event => {
  const userId = await requireUserId(event);

  const parsedId = idSchema.safeParse(getRouterParam(event, "id"));
  if (!parsedId.success) {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }
  const collectionId = parsedId.data;

  const [collection] = await db
    .select({ id: collections.id })
    .from(collections)
    .where(and(eq(collections.id, collectionId), eq(collections.userId, userId)));

  if (!collection) {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }

  return db
    .select(linkSelection)
    .from(collectionItems)
    .innerJoin(urls, eq(collectionItems.urlId, urls.id))
    .where(eq(collectionItems.collectionId, collectionId))
    .orderBy(asc(collectionItems.position));
});
