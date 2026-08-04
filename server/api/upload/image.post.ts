// Transport contract (fixed — matches the client widget's `$fetch` call):
// the client sends the raw `File` object as the request body (NOT
// multipart/form-data, NOT base64, NOT JSON-wrapped). ofetch passes a
// File/Blob body straight through to the underlying `fetch`, which derives
// the `Content-Type` header from `file.type` and streams the raw bytes. So
// the body here is just the image's bytes with no framing to parse — read it
// with `readRawBody(event, false)`, which returns `Promise<Buffer|undefined>`
// in this h3 version (confirmed against `node_modules/h3`'s
// `readRawBody` — the `false` encoding argument is what selects the
// `Buffer`-returning overload instead of the string-returning default).
//
// No upstream (h3/nitropack) body-size cap exists ahead of this handler:
// `readRawBody` just accumulates the whole stream via `Buffer.concat` with no
// limit of its own, so a >2MB body reaches this handler intact and gets
// rejected by the explicit MAX_IMAGE_BYTES check below with a clear 400 —
// there's no opaque Nitro-level error to work around here.
export default defineEventHandler(async event => {
  const userId = await requireUserId(event);

  // Cheap rejection ahead of the authoritative check below: a normal HTTP
  // request always sends `Content-Length`, so this catches an oversized body
  // before `readRawBody` buffers the whole thing into memory. Not a
  // replacement for the post-read check - the header is client-supplied (not
  // trustworthy on its own) and a chunked-transfer-encoded request has no
  // `Content-Length` at all.
  const declaredLength = Number(getRequestHeader(event, "content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_IMAGE_BYTES) {
    throw createError({
      statusCode: 413,
      statusMessage: `Image must be ${MAX_IMAGE_BYTES / (1024 * 1024)}MB or smaller`
    });
  }

  const bytes = await readRawBody(event, false);

  // `readRawBody` resolves `undefined` when the request has neither a
  // `content-length` header nor `transfer-encoding: chunked` — i.e. an
  // empty/missing body. Must be handled explicitly before `.byteLength`
  // below (`undefined.byteLength` would throw and surface as an opaque 500).
  if (!bytes) {
    throw createError({ statusCode: 400, statusMessage: "No image data received" });
  }

  // Authoritative against the actual bytes received, not the client-supplied
  // `Content-Length` header (which is attacker-controlled and could lie in
  // either direction).
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    throw createError({
      statusCode: 400,
      statusMessage: `Image must be ${MAX_IMAGE_BYTES / (1024 * 1024)}MB or smaller`
    });
  }

  // Never trust the client-declared `Content-Type` or filename extension —
  // sniff the real format from magic bytes. Anything that doesn't positively
  // match PNG/JPEG/GIF/WebP is rejected outright (see `image-validate.ts` for
  // why, notably mislabeled-SVG stored-XSS).
  const sniffedType = sniffImageType(bytes);
  if (!sniffedType) {
    throw createError({
      statusCode: 400,
      statusMessage: "Unsupported image type: only PNG, JPEG, GIF, and WebP are allowed"
    });
  }

  try {
    const { url } = await uploadImage(bytes, sniffedType, userId);
    return { url };
  } catch (error) {
    // Covers every `put()` failure - missing `BLOB_READ_WRITE_TOKEN`, a
    // transient network/outage error, rate-limiting, etc. - not just
    // misconfiguration, so the message doesn't name one specific cause.
    // Real error stays server-side via console.error; never leak it to the
    // client.
    console.error("[upload/image.post] uploadImage failed", error);
    throw createError({ statusCode: 500, statusMessage: "Image storage is unavailable" });
  }
});
