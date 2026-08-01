import { z } from "zod";

// No requireUserId here - this route is deliberately public, mirroring
// server/api/shared/[slug].get.ts and links/index.get.ts.
const slugSchema = z.string().min(1);
const bodySchema = z.object({ password: z.string().min(1) });

export default defineEventHandler(async event => {
  const parsedSlug = slugSchema.safeParse(getRouterParam(event, "slug"));
  if (!parsedSlug.success) {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }

  const parsedBody = bodySchema.safeParse(await readBody(event));
  if (!parsedBody.success) {
    throwValidationError(parsedBody.error);
  }

  const result = await getSharedCollectionLinks(parsedSlug.data);

  if (!result) {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }

  // No attempt limiting, by design - a guest can retry with no cap. The
  // comparison itself must still be constant-time (passwordsMatch, also
  // used by isUnlocked's cookie check) - otherwise a timing side channel
  // would let an attacker recover the password character-by-character.
  if (
    result.password &&
    !result.published &&
    !passwordsMatch(result.password, parsedBody.data.password)
  ) {
    throw createError({ statusCode: 403, statusMessage: "Incorrect Password" });
  }

  if (result.password && !result.published) {
    setUnlockCookie(event, result.collectionId, result.password);
  }

  // Return the links directly rather than making the caller re-fetch
  // GET .../links - one round trip, not two.
  return result.links;
});
