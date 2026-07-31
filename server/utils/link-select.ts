import { collectionItems, urls } from "~~/server/db/schema";

// Nitro auto-imports everything under `server/utils/*`, so `linkSelection`
// is available in route handlers with no explicit import.
//
// Shared drizzle column projection for a link joined with its
// collection-item row. Every route under
// `server/api/collections/[id]/links/*` that returns a link (list, create,
// single-get, patch) must return this exact shape — defined once here
// instead of re-typed per file, so the frontend's `LinkItem` type can't
// silently drift between endpoints.
//
// `id` here is the `collectionItems` row id — that's what the frontend
// calls "linkId" (e.g. `/collections/[id]/links/[linkId]/edit`).
export const linkSelection = {
  id: collectionItems.id,
  urlId: urls.id,
  collectionId: collectionItems.collectionId,
  url: urls.url,
  normalizedUrl: urls.normalizedUrl,
  title: urls.title,
  description: urls.description,
  imageUrl: urls.imageUrl,
  fetchStatus: urls.fetchStatus,
  fetchedAt: urls.fetchedAt,
  position: collectionItems.position,
  addedAt: collectionItems.addedAt
};
