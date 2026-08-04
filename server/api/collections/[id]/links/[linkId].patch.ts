import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "~~/server/db";
import { collectionItems, collections, urls } from "~~/server/db/schema";

// Malformed (non-uuid) route params must not reach the driver as raw
// strings — see `collections/[id].get.ts` for why.
const idSchema = z.uuid();

// Only title/description/imageUrl are accepted — no `url` (immutable after
// creation), no `fetchStatus` (server-derived only). A plain `z.object`
// strips any other keys by default, so extra fields in the body are
// silently ignored rather than rejected — same style as `collectionSchema`.
const updateLinkSchema = z.object({
  title: z.string().trim().max(500).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  imageUrl: z.string().trim().max(2000).nullable().optional()
});

export default defineEventHandler(async event => {
  const userId = await requireUserId(event);

  const parsedCollectionId = idSchema.safeParse(getRouterParam(event, "id"));
  const parsedLinkId = idSchema.safeParse(getRouterParam(event, "linkId"));
  if (!parsedCollectionId.success || !parsedLinkId.success) {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }
  const collectionId = parsedCollectionId.data;
  const linkId = parsedLinkId.data;

  const body = await readBody(event);
  const parsed = updateLinkSchema.safeParse(body);
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

  // No transaction available (Neon HTTP driver) — ownership-scoping select
  // first, then a scoped update below. A benign TOCTOU here (item deleted
  // between these two steps) surfaces as 404, not 500.
  const [item] = await db
    .select({ urlId: collectionItems.urlId })
    .from(collectionItems)
    .where(and(eq(collectionItems.id, linkId), eq(collectionItems.collectionId, collectionId)));

  if (!item) {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }

  // Read the old imageUrl before the update — needed below to detect a
  // replacement and clean up the superseded blob. Safe to do unconditionally
  // (single extra scoped select); this handler edits exactly one `urls` row,
  // unlike the shared-row create path in `links/index.post.ts`.
  const [existingUrlRow] = await db
    .select({ imageUrl: urls.imageUrl })
    .from(urls)
    .where(and(eq(urls.id, item.urlId), eq(urls.userId, userId)));

  // Only set the fields actually present in the body — `!== undefined`
  // (rather than truthiness) so an explicit `null` clears a field without a
  // PATCH containing only `title` wiping out `description`/`imageUrl`.
  const updates: Partial<typeof urls.$inferInsert> = { updatedAt: new Date() };
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.imageUrl !== undefined) updates.imageUrl = parsed.data.imageUrl;

  const [updatedUrl] = await db
    .update(urls)
    .set(updates)
    // Extra `userId` check here is defense-in-depth: the schema doesn't
    // enforce structurally that `urls.userId` matches the collection's
    // owner, so this belt-and-suspenders check makes sure we never touch a
    // url row from a different user.
    .where(and(eq(urls.id, item.urlId), eq(urls.userId, userId)))
    .returning();

  if (!updatedUrl) {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }

  // Best-effort cleanup of the replaced image, only once the update actually
  // succeeded and only when `imageUrl` was sent and changed —
  // `deleteImageIfOwned` safely no-ops on external/unowned URLs. Safe here
  // specifically because this handler edits exactly one `urls` row (unlike
  // the create path, where a `urls` row can be shared across collections —
  // see links/index.post.ts's dedup comment).
  if (
    parsed.data.imageUrl !== undefined &&
    parsed.data.imageUrl !== existingUrlRow?.imageUrl &&
    existingUrlRow?.imageUrl
  ) {
    await deleteImageIfOwned(existingUrlRow.imageUrl, userId);
  }

  const [link] = await db
    .select(linkSelection)
    .from(collectionItems)
    .innerJoin(urls, eq(collectionItems.urlId, urls.id))
    .where(eq(collectionItems.id, linkId));

  return link;
});
