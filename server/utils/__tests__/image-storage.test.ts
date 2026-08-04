import { beforeEach, describe, expect, it, vi } from "vitest";

// `vi.mock` factories are hoisted above all imports by Vitest's transform
// regardless of where they appear in the source (same rationale as
// link-fetch-guard.test.ts), so importing the module under test here,
// before the mock/reset boilerplate below, is safe and keeps import order
// lint-clean.
import { deleteImageIfOwned, uploadImage } from "../image-storage";

const putMock = vi.hoisted(() => vi.fn());
const delMock = vi.hoisted(() => vi.fn());

vi.mock("@vercel/blob", () => ({
  put: putMock,
  del: delMock
}));

beforeEach(() => {
  putMock.mockReset();
  delMock.mockReset();
});

describe("uploadImage", () => {
  it("calls put() with access: public, the given contentType, and a uploads/{userId}/-prefixed pathname, returning put()'s url", async () => {
    putMock.mockResolvedValue({
      url: "https://abc123.public.blob.vercel-storage.com/uploads/user-1/xyz.png"
    });
    const originalBytes = Buffer.from("bytes");

    const result = await uploadImage(originalBytes, "image/png", "user-1");

    expect(putMock).toHaveBeenCalledTimes(1);
    const [pathname, bytes, options] = putMock.mock.calls[0] as [
      string,
      Buffer,
      Record<string, unknown>
    ];
    expect(pathname).toMatch(/^uploads\/user-1\/[^/]+\.png$/);
    // Identity, not just `toBeInstanceOf(Buffer)` - catches a regression
    // that re-encodes/copies the bytes before handing them to `put()`.
    expect(bytes).toBe(originalBytes);
    expect(options).toMatchObject({
      access: "public",
      contentType: "image/png",
      addRandomSuffix: false
    });
    expect(result).toEqual({
      url: "https://abc123.public.blob.vercel-storage.com/uploads/user-1/xyz.png"
    });
  });

  it("falls back to a .bin extension for a content-type it doesn't recognize", async () => {
    putMock.mockResolvedValue({ url: "https://abc123.public.blob.vercel-storage.com/x.bin" });

    await uploadImage(Buffer.from("bytes"), "application/octet-stream", "user-1");

    const [pathname] = putMock.mock.calls[0] as [string];
    expect(pathname).toMatch(/\.bin$/);
  });
});

describe("deleteImageIfOwned", () => {
  it("calls del() when the hostname is exactly the blob host and the pathname is namespaced under the owning userId", async () => {
    await deleteImageIfOwned(
      "https://public.blob.vercel-storage.com/uploads/user-1/foo.png",
      "user-1"
    );

    expect(delMock).toHaveBeenCalledWith(
      "https://public.blob.vercel-storage.com/uploads/user-1/foo.png"
    );
  });

  it("calls del() when the hostname is a real subdomain ending in the blob host suffix", async () => {
    await deleteImageIfOwned(
      "https://abc123.public.blob.vercel-storage.com/uploads/user-1/foo.png",
      "user-1"
    );

    expect(delMock).toHaveBeenCalledTimes(1);
  });

  it("does not call del() for another user's path prefix on the same blob host", async () => {
    await deleteImageIfOwned(
      "https://abc123.public.blob.vercel-storage.com/uploads/user-2/foo.png",
      "user-1"
    );

    expect(delMock).not.toHaveBeenCalled();
  });

  it("does not call del() for an unrelated external domain entirely", async () => {
    await deleteImageIfOwned("https://example.com/uploads/user-1/foo.png", "user-1");

    expect(delMock).not.toHaveBeenCalled();
  });

  it("does not call del() and does not throw for a malformed URL", async () => {
    await expect(deleteImageIfOwned("not a url", "user-1")).resolves.toBeUndefined();

    expect(delMock).not.toHaveBeenCalled();
  });

  it("does not call del() for a hostname that merely contains the blob suffix as a substring, not as a real suffix (includes-bug regression guard)", async () => {
    // If the real code's `hostname.endsWith(BLOB_HOST_SUFFIX)` were ever
    // weakened to `hostname.includes(BLOB_HOST_SUFFIX)`, this hostname would
    // incorrectly pass: ".public.blob.vercel-storage.com" appears verbatim
    // inside it, but the hostname actually ends with ".attacker.net", not
    // the real Vercel Blob host.
    await deleteImageIfOwned(
      "https://x.public.blob.vercel-storage.com.attacker.net/uploads/user-1/foo.png",
      "user-1"
    );

    expect(delMock).not.toHaveBeenCalled();
  });

  it("does not call del() when the blob-host string appears in the URL but the hostname is unrelated, even though the pathname alone would pass the userId check (full-URL includes-bug regression guard)", async () => {
    // Deliberately gives this URL a pathname that DOES start with
    // `/uploads/user-1/`, so the only thing stopping `del()` is the hostname
    // check - unlike a URL where the pathname check would independently
    // block it regardless of the hostname bug (which would make the test
    // vacuous). If the real check were ever weakened to test the raw
    // href/pathname string for the suffix instead of the parsed hostname,
    // this href contains ".public.blob.vercel-storage.com" verbatim AND has
    // a passing pathname, so that regression would incorrectly call
    // `del()`. The real hostname here is "evil.com", which correctly fails
    // the actual `hostname.endsWith(...)` check.
    await deleteImageIfOwned(
      "https://evil.com/uploads/user-1/x.public.blob.vercel-storage.com.png",
      "user-1"
    );

    expect(delMock).not.toHaveBeenCalled();
  });

  it("swallows a del() rejection instead of propagating it", async () => {
    delMock.mockRejectedValue(new Error("network down"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      deleteImageIfOwned("https://public.blob.vercel-storage.com/uploads/user-1/foo.png", "user-1")
    ).resolves.toBeUndefined();

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
