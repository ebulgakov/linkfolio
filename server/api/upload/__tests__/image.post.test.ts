import { beforeEach, describe, expect, it, vi } from "vitest";

// server/api/upload/image.post.ts relies entirely on Nitro's server-side
// auto-imports (defineEventHandler, createError, requireUserId, readRawBody,
// sniffImageType, uploadImage, MAX_IMAGE_BYTES) — none of them are explicit
// imports in that file, per Nitro's own auto-import convention (see that
// file's and server/utils/session.ts's top-of-file comments).
//
// Vitest's "nuxt" test environment (@nuxt/test-utils/config) only wires up
// the *client-side app* auto-imports — it does not run the Nitro server
// bundler, so none of the server-side auto-imports exist when this route
// module is imported directly. Confirmed empirically: a bare `import` of
// this file throws `ReferenceError: defineEventHandler is not defined`
// before any test code runs. There's also no existing
// `server/api/**/__tests__` example in this repo to mirror (only
// `server/utils/__tests__/link-fetch-guard.test.ts` exists, and that module
// happens to need zero Nitro auto-imports, so it never hit this problem).
//
// The fix: stub every one of those bare identifiers onto `globalThis` before
// the route module is ever loaded, exactly as Nitro's real unimport bundler
// would inject them at build time. `defineEventHandler`/`createError` get
// small, faithful reimplementations of h3's actual runtime behavior for the
// only shapes this route exercises (a plain-function handler; a plain
// `{ statusCode, statusMessage }` error input) — real `h3` is a transitive
// dependency (via nitropack), not a direct one in package.json, so it isn't
// reliably resolvable by name from a project-root test file.
//
// `requireUserId` and `uploadImage` are genuine network/auth boundaries and
// stay mocked. `sniffImageType`/`MAX_IMAGE_BYTES` are deliberately NOT
// mocked, even though they're auto-imports too: `image-validate.ts` is pure,
// synchronous, no-I/O logic, and it's the actual security boundary this
// route's SVG/mislabeled-file rejection tests are meant to exercise (see
// that module's own comment on stored-XSS via a mislabeled SVG). Stubbing it
// out would turn those tests into "the route calls whatever
// sniffImageType-shaped mock we hand it" — true by construction, and
// unable to catch a real regression in either file. Instead the real
// implementations are imported and wrapped in `vi.fn(...)` spies (still
// globals, since the route references them as such), so both the plumbing
// (was it called, with what) and the actual security decision are covered
// together.
import { MAX_IMAGE_BYTES, sniffImageType } from "../../../utils/image-validate";

function stubDefineEventHandler<T extends (...args: never[]) => unknown>(handler: T): T {
  return handler;
}

interface StubErrorInput {
  statusCode: number;
  statusMessage: string;
}

function stubCreateError(input: StubErrorInput): Error & StubErrorInput {
  return Object.assign(new Error(input.statusMessage), input);
}

const requireUserIdMock = vi.hoisted(() => vi.fn());
const readRawBodyMock = vi.hoisted(() => vi.fn());
const uploadImageMock = vi.hoisted(() => vi.fn());
// Real implementation underneath a spy - see the module comment above for
// why this isn't a plain `vi.fn()` replacement like the others.
const sniffImageTypeSpy = vi.fn(sniffImageType);

vi.stubGlobal("defineEventHandler", stubDefineEventHandler);
vi.stubGlobal("createError", stubCreateError);
vi.stubGlobal("requireUserId", requireUserIdMock);
vi.stubGlobal("readRawBody", readRawBodyMock);
vi.stubGlobal("sniffImageType", sniffImageTypeSpy);
vi.stubGlobal("uploadImage", uploadImageMock);
vi.stubGlobal("MAX_IMAGE_BYTES", MAX_IMAGE_BYTES);

// Dynamic + top-level await: the globals above must be in place *before* the
// route module's top-level `defineEventHandler(...)` call runs, which a
// static `import` (hoisted above all other code by the ES module spec) would
// violate.
const handler = (await import("../image.post")).default;

// h3's real event object is large; every code path this route exercises
// only ever passes `event` through to the mocked `requireUserId`/
// `readRawBody`, so an opaque stand-in is enough.
function makeEvent() {
  return {} as Parameters<typeof handler>[0];
}

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

beforeEach(() => {
  requireUserIdMock.mockReset().mockResolvedValue("user-1");
  readRawBodyMock.mockReset();
  // .mockClear(), not .mockReset() - the latter would also discard the real
  // sniffImageType implementation this spy wraps.
  sniffImageTypeSpy.mockClear();
  uploadImageMock.mockReset();
});

describe("POST /api/upload/image", () => {
  it("propagates a 401 from requireUserId and never reads the body or uploads", async () => {
    requireUserIdMock.mockRejectedValue(
      stubCreateError({ statusCode: 401, statusMessage: "Unauthorized" })
    );

    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 401 });

    expect(readRawBodyMock).not.toHaveBeenCalled();
    expect(uploadImageMock).not.toHaveBeenCalled();
  });

  it("rejects a missing/empty body with a 400, without crashing on undefined.byteLength", async () => {
    readRawBodyMock.mockResolvedValue(undefined);

    await expect(handler(makeEvent())).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "No image data received"
    });

    expect(sniffImageTypeSpy).not.toHaveBeenCalled();
    expect(uploadImageMock).not.toHaveBeenCalled();
  });

  it("rejects a body over MAX_IMAGE_BYTES with a 400 before ever sniffing or uploading", async () => {
    readRawBodyMock.mockResolvedValue(Buffer.alloc(MAX_IMAGE_BYTES + 1));

    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 400 });

    expect(sniffImageTypeSpy).not.toHaveBeenCalled();
    expect(uploadImageMock).not.toHaveBeenCalled();
  });

  it("rejects real SVG bytes with a 400, never uploading (the actual stored-XSS guard, not a mocked branch)", async () => {
    const svgBytes = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
      "utf-8"
    );
    readRawBodyMock.mockResolvedValue(svgBytes);

    await expect(handler(makeEvent())).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: expect.stringContaining("Unsupported image type")
    });

    expect(sniffImageTypeSpy).toHaveBeenCalledWith(svgBytes);
    expect(sniffImageTypeSpy).toHaveReturnedWith(null);
    expect(uploadImageMock).not.toHaveBeenCalled();
  });

  it("rejects HTML bytes mislabeled as an image, with a 400, never uploading", async () => {
    const htmlBytes = Buffer.from("<!doctype html><html><body>not an image</body></html>", "utf-8");
    readRawBodyMock.mockResolvedValue(htmlBytes);

    await expect(handler(makeEvent())).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: expect.stringContaining("Unsupported image type")
    });

    expect(sniffImageTypeSpy).toHaveReturnedWith(null);
    expect(uploadImageMock).not.toHaveBeenCalled();
  });

  it("uploads valid PNG-header bytes with the real sniffed type and returns { url }", async () => {
    readRawBodyMock.mockResolvedValue(PNG_HEADER);
    uploadImageMock.mockResolvedValue({
      url: "https://abc.public.blob.vercel-storage.com/uploads/user-1/x.png"
    });

    const result = await handler(makeEvent());

    expect(sniffImageTypeSpy).toHaveReturnedWith("image/png");
    expect(uploadImageMock).toHaveBeenCalledWith(PNG_HEADER, "image/png", "user-1");
    expect(result).toEqual({
      url: "https://abc.public.blob.vercel-storage.com/uploads/user-1/x.png"
    });
  });

  it.each([
    ["JPEG", Buffer.from([0xff, 0xd8, 0xff, 0xe0]), "image/jpeg"],
    ["GIF", Buffer.from("GIF89a", "ascii"), "image/gif"],
    [
      "WebP",
      Buffer.concat([Buffer.from("RIFF"), Buffer.from([0, 0, 0, 0]), Buffer.from("WEBP")]),
      "image/webp"
    ]
  ] as const)(
    "uploads valid %s-header bytes with the real sniffed type",
    async (_label, bytes, expectedType) => {
      readRawBodyMock.mockResolvedValue(bytes);
      uploadImageMock.mockResolvedValue({
        url: "https://abc.public.blob.vercel-storage.com/uploads/user-1/x"
      });

      const result = await handler(makeEvent());

      expect(sniffImageTypeSpy).toHaveReturnedWith(expectedType);
      expect(uploadImageMock).toHaveBeenCalledWith(bytes, expectedType, "user-1");
      expect(result).toEqual({
        url: "https://abc.public.blob.vercel-storage.com/uploads/user-1/x"
      });
    }
  );

  it("surfaces a clear 500 (not the raw uploadImage error) when uploadImage throws", async () => {
    readRawBodyMock.mockResolvedValue(PNG_HEADER);
    uploadImageMock.mockRejectedValue(new Error("BLOB_READ_WRITE_TOKEN is not set"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(handler(makeEvent())).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: "Image storage is not configured"
    });

    consoleErrorSpy.mockRestore();
  });
});
