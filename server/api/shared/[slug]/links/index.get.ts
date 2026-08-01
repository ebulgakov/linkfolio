import { z } from "zod";

// No requireUserId here - this route is deliberately public, mirroring
// server/api/shared/[slug].get.ts.
const slugSchema = z.string().min(1);

export default defineEventHandler(async event => {
  const parsedSlug = slugSchema.safeParse(getRouterParam(event, "slug"));
  if (!parsedSlug.success) {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }

  const result = await getSharedCollectionLinks(parsedSlug.data);

  if (!result) {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }

  // Deliberately 403, not 401 - 401 already means "no authenticated owner
  // session" elsewhere in this codebase (requireUserId). This is a
  // different failure mode: the resource exists and is shared, it just
  // needs a password. See server/api/shared/[slug]/unlock.post.ts.
  if (
    result.password &&
    !result.published &&
    !isUnlocked(event, result.collectionId, result.password)
  ) {
    throw createError({ statusCode: 403, statusMessage: "Password Required" });
  }

  return result.links;
});
