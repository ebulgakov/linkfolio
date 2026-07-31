import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "../../../../db";
import { collectionItems, collections, urls } from "../../../../db/schema";

// A malformed (non-uuid) `:id` must not reach the driver as a raw string —
// see `collections/[id].get.ts` for why.
const idSchema = z.uuid();

const createLinkSchema = z.object({
  url: z.url({ protocol: /^https?$/ }),
  title: z.string().trim().max(500).optional(),
  description: z.string().trim().max(2000).optional(),
  imageUrl: z.string().trim().max(2000).optional()
});

export default defineEventHandler(async event => {
  const userId = await requireUserId(event);

  const parsedId = idSchema.safeParse(getRouterParam(event, "id"));
  if (!parsedId.success) {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }
  const collectionId = parsedId.data;

  const body = await readBody(event);
  const parsed = createLinkSchema.safeParse(body);
  if (!parsed.success) {
    throwValidationError(parsed.error);
  }

  const [collection] = await db
    .select({ id: collections.id })
    .from(collections)
    .where(and(eq(collections.id, collectionId), eq(collections.userId, userId)));

  if (!collection) {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }

  const normalizedUrl = normalizeUrl(parsed.data.url);

  const [existingUrl] = await db
    .select()
    .from(urls)
    .where(and(eq(urls.userId, userId), eq(urls.normalizedUrl, normalizedUrl)));

  let urlId: string;

  if (existingUrl) {
    // Reuse the existing shared row as-is: don't touch its fetchStatus/
    // fetchedAt/title/description/imageUrl, and don't apply this request's
    // client-provided title/description/imageUrl either — those are ignored
    // entirely on this branch (see the plan's rationale: applying them here
    // would trigger the "editing a shared row" side effect during creation,
    // which is surprising and out of scope — that's reserved for the
    // explicit edit flow).
    urlId = existingUrl.id;
  } else {
    // `fetchStatus` must never come from the client payload — a user whose
    // fetch failed but who hand-typed a title would otherwise get a false
    // "fetched" on the card. So the server does its own fetch here, even
    // though the client likely already hit `/api/links/preview` for UI
    // feedback.
    const preview = await fetchLinkPreview(parsed.data.url);
    const fetchedAt = new Date();

    const [insertedUrl] = await db
      .insert(urls)
      .values({
        userId,
        url: parsed.data.url,
        normalizedUrl,
        title: parsed.data.title || preview.title,
        description: parsed.data.description || preview.description,
        imageUrl: parsed.data.imageUrl || preview.imageUrl,
        fetchStatus: preview.fetchStatus,
        fetchedAt
      })
      // Guards only the race of two parallel submits for the same URL by the
      // same user — must NOT overwrite title/description/imageUrl/
      // fetchStatus on conflict, or the loser of the race would clobber the
      // winner's freshly-fetched metadata with its own.
      .onConflictDoUpdate({
        target: [urls.userId, urls.normalizedUrl],
        set: { updatedAt: sql`now()` }
      })
      .returning();

    if (!insertedUrl) {
      // `insert ... onConflictDoUpdate ... returning()` should always return
      // exactly one row (either the inserted row or the updated conflicting
      // row) — this is unreachable in practice, but keeps the compiler (and
      // any future refactor) honest rather than asserting non-null.
      throw createError({ statusCode: 500, statusMessage: "Failed to save link" });
    }

    urlId = insertedUrl.id;
  }

  let item: typeof collectionItems.$inferSelect | undefined;
  try {
    [item] = await db
      .insert(collectionItems)
      .values({
        collectionId,
        urlId,
        position: sql`(select coalesce(max(position), 0) + 1 from collection_items where collection_id = ${collectionId}::uuid)`
      })
      .returning();
  } catch (error) {
    await throwLinkUniqueViolation(error, { collectionId, urlId });
  }

  const [link] = await db
    .select(linkSelection)
    .from(collectionItems)
    .innerJoin(urls, eq(collectionItems.urlId, urls.id))
    .where(eq(collectionItems.id, item!.id));

  return link;
});
