import { collectionItems, urls } from "~~/server/db/schema";

// Nitro auto-imports everything under `server/utils/*`, so `sharedLinkSelection`
// is available in route handlers with no explicit import.
//
// Narrower than `linkSelection` (link-select.ts): deliberately omits `urlId`,
// `collectionId`, `normalizedUrl`, `fetchStatus`, `fetchedAt`, and `position` -
// internal/owner-facing fields that must not be exposed to anonymous callers
// of `server/api/shared/**`.
export const sharedLinkSelection = {
  id: collectionItems.id,
  url: urls.url,
  title: urls.title,
  description: urls.description,
  imageUrl: urls.imageUrl
};
