import { del, put } from "@vercel/blob";
import { nanoid } from "nanoid";

// Nitro auto-imports everything under `server/utils/*`, so `uploadImage` and
// `deleteImageIfOwned` are available in route handlers with no explicit
// import (same convention as `requireUserId` in `session.ts`).
//
// This module's surface is deliberately just "put bytes, get a URL" / "delete
// by owned URL" — no MIME/size validation here (see `image-validate.ts`).
// Keeping that boundary means swapping Vercel Blob for another storage
// backend later only touches this one file.

const BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp"
};

function extensionFor(contentType: string): string {
  return EXTENSION_BY_CONTENT_TYPE[contentType] ?? "bin";
}

/**
 * Uploads image bytes to Vercel Blob under a per-user namespaced pathname and
 * returns the resulting public URL. `access: "public"` is required — every
 * `imageUrl` in this app (collections + links) is a plain, directly
 * embeddable URL rendered with no auth, including on published/shared
 * collections.
 *
 * Namespacing the pathname by `userId` (`uploads/${userId}/...`) is what
 * makes `deleteImageIfOwned` below cheap and correct: ownership reduces to a
 * pathname prefix check instead of a DB lookup.
 */
export async function uploadImage(
  bytes: Buffer,
  contentType: string,
  userId: string
): Promise<{ url: string }> {
  const pathname = `uploads/${userId}/${nanoid()}.${extensionFor(contentType)}`;

  const blob = await put(pathname, bytes, {
    access: "public",
    contentType,
    addRandomSuffix: false
  });

  return { url: blob.url };
}

/**
 * Best-effort delete of a blob, gated by ownership derived purely from the
 * URL's shape — never throws. Callers (route handlers wiring delete-on-
 * replace/delete-on-remove) can call this unconditionally, including against
 * URLs that were never uploads (e.g. an OG-scraped external image URL) or
 * against another user's blob; both cases silently no-op rather than being
 * the caller's problem to filter out first.
 *
 * Ownership check, in order:
 *   1. URL must parse.
 *   2. Hostname must be exactly Vercel Blob's public host, or end with the
 *      dot-prefixed suffix (`endsWith`, never `includes` — `includes` is
 *      spoofable: `evil.com/x.public.blob.vercel-storage.com.attacker.com`
 *      would match the `includes` check but is not the Blob host at all).
 *   3. Pathname must start with `/uploads/${userId}/` — the same namespacing
 *      `uploadImage` writes under.
 * Any failure at any step is a silent no-op, by design.
 */
export async function deleteImageIfOwned(url: string, userId: string): Promise<void> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return;
  }

  const hostname = parsedUrl.hostname;
  const isBlobHost =
    hostname === "public.blob.vercel-storage.com" || hostname.endsWith(BLOB_HOST_SUFFIX);
  if (!isBlobHost) {
    return;
  }

  if (!parsedUrl.pathname.startsWith(`/uploads/${userId}/`)) {
    return;
  }

  try {
    // Delete the parsed/normalized URL, not the raw input string — `new
    // URL()` collapses things like `..` path segments, so the string that
    // passed the pathname check above and the string handed to `del()` must
    // be the exact same value.
    await del(parsedUrl.href);
  } catch (error) {
    console.error("[image-storage] deleteImageIfOwned: del() failed", error);
  }
}
