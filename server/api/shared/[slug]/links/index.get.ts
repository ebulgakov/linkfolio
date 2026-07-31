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

  // A single query rooted at `collections`, left-joined out to links: the
  // `shared` check and the link read must be atomic, or an owner unsharing
  // the collection between two separate queries could let an anonymous
  // caller still read its links.
  const rows = await db
    .select({ collectionId: collections.id, link: sharedLinkSelection })
    .from(collections)
    .leftJoin(collectionItems, eq(collectionItems.collectionId, collections.id))
    .leftJoin(urls, eq(collectionItems.urlId, urls.id))
    .where(and(eq(collections.slug, parsedSlug.data), eq(collections.shared, true)))
    .orderBy(asc(collectionItems.position));

  if (rows.length === 0) {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }

  // A shared collection with no links still produces one row (via the left
  // joins) with every `link.*` field null - drop it rather than returning a
  // phantom link.
  return rows.filter(row => row.link.id !== null).map(row => row.link);
});
