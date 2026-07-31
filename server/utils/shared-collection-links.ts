import { and, asc, eq } from "drizzle-orm";

import { db } from "~~/server/db";
import { collectionItems, collections, urls } from "~~/server/db/schema";

// Nitro auto-imports everything under `server/utils/*`, so
// `getSharedCollectionLinks` is available in route handlers with no
// explicit import.

export interface SharedCollectionLink {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
}

export interface SharedCollectionLinksResult {
  collectionId: string;
  password: string | null;
  links: SharedCollectionLink[];
}

/**
 * A single query rooted at `collections`, left-joined out to links: the
 * `shared` check, the password read, and the link read must be atomic, or an
 * owner unsharing (or password-protecting) the collection between two
 * separate queries could let an anonymous caller still read its links.
 * Shared by both `server/api/shared/[slug]/links/index.get.ts` (read-only
 * gate check) and `server/api/shared/[slug]/unlock.post.ts` (verify +
 * return links in one round trip) so this atomicity property lives in one
 * place.
 */
export async function getSharedCollectionLinks(
  slug: string
): Promise<SharedCollectionLinksResult | null> {
  const rows = await db
    .select({
      collectionId: collections.id,
      password: collections.password,
      link: sharedLinkSelection
    })
    .from(collections)
    .leftJoin(collectionItems, eq(collectionItems.collectionId, collections.id))
    .leftJoin(urls, eq(collectionItems.urlId, urls.id))
    .where(and(eq(collections.slug, slug), eq(collections.shared, true)))
    .orderBy(asc(collectionItems.position));

  if (rows.length === 0) {
    return null;
  }

  // A shared collection with no links still produces one row (via the left
  // joins) with every `link.*` field null - drop it rather than returning a
  // phantom link.
  return {
    collectionId: rows[0]!.collectionId,
    password: rows[0]!.password,
    // The left join types every `link.*` column as nullable, but a non-null
    // `id` means this row is a real match (not the phantom all-null row a
    // linkless collection produces), so the rest of `link` is safe to treat
    // as the non-nullable SharedCollectionLink shape.
    links: rows.filter(row => row.link.id !== null).map(row => row.link as SharedCollectionLink)
  };
}
