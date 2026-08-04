// Nitro auto-imports everything under `server/utils/*` — no explicit import
// needed at call sites (`sniffImageType`, `MAX_IMAGE_BYTES`).
//
// Magic-byte sniffing for the image upload route. This is a security
// boundary, not a convenience check: client-declared `Content-Type` and
// filename extension are both attacker-controlled and MUST NOT be trusted to
// decide what gets stored and later served back as an `<img>` src on a
// published/shared collection. In particular, an SVG (or XML/HTML) file
// mislabeled with an image content-type is a stored-XSS vector once served
// from a public blob URL — so a file is only ever accepted if its bytes
// positively match one of the four allowed raster formats below. Anything
// else — including a well-formed SVG — returns `null` and the route rejects
// it, regardless of what the client claimed.

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export type SniffedImageType = "image/png" | "image/jpeg" | "image/gif" | "image/webp";

function isPng(bytes: Buffer): boolean {
  // 89 50 4E 47 0D 0A 1A 0A
  return (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  );
}

function isJpeg(bytes: Buffer): boolean {
  // FF D8 FF
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function isGif(bytes: Buffer): boolean {
  // "GIF87a" or "GIF89a"
  return (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  );
}

function isWebp(bytes: Buffer): boolean {
  // "RIFF" .... "WEBP" — need bytes 0-3 and 8-11, so at least 12 bytes.
  return (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}

/**
 * Positively identifies one of the four allowed raster image formats from
 * magic bytes, or returns `null` if the bytes don't match any of them (which
 * the upload route treats as a hard rejection — see the module comment).
 */
export function sniffImageType(bytes: Buffer): SniffedImageType | null {
  if (isPng(bytes)) return "image/png";
  if (isJpeg(bytes)) return "image/jpeg";
  if (isGif(bytes)) return "image/gif";
  if (isWebp(bytes)) return "image/webp";
  return null;
}
