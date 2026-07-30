import { z } from "zod";

// Not tied to any collection and writes nothing to the DB — used purely for
// synchronous UI feedback while the user is filling out the link-add form
// (see `app/features/link-form`). Always responds 200, even when the
// underlying fetch fails: `fetchStatus: "failed"` is a valid preview result,
// not an HTTP error. The only error responses here are auth (401, via
// `requireUserId`) and validation (400, malformed url).
const previewSchema = z.object({
  url: z.url({ protocol: /^https?$/ })
});

export default defineEventHandler(async event => {
  await requireUserId(event);

  const body = await readBody(event);
  const parsed = previewSchema.safeParse(body);
  if (!parsed.success) {
    throwValidationError(parsed.error);
  }

  return fetchLinkPreview(parsed.data.url);
});
