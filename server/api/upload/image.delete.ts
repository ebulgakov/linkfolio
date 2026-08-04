// `?url=<blob url>` — deletes an uploaded image if (and only if) it's both a
// real Vercel Blob URL and namespaced under this user's own uploads path; see
// `deleteImageIfOwned` in `server/utils/image-storage.ts` for the ownership
// check. That guard never throws and silently no-ops on anything it doesn't
// own, so there's no elaborate error handling needed here.
export default defineEventHandler(async event => {
  const userId = await requireUserId(event);

  const query = getQuery(event);
  const url = query.url;

  // `getQuery` types this as `string | string[] | undefined` — a repeated
  // `?url=a&url=b` yields an array, which isn't a valid input here.
  if (typeof url !== "string" || url.length === 0) {
    throw createError({ statusCode: 400, statusMessage: "Missing url query parameter" });
  }

  await deleteImageIfOwned(url, userId);

  setResponseStatus(event, 204);
  return null;
});
