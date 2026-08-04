import { beforeEach, describe, expect, it, vi } from "vitest";

// Same harness as `image.post.test.ts` (see that file's top comment for the
// full rationale): this route's Nitro auto-imports (`defineEventHandler`,
// `createError`, `requireUserId`, `getQuery`, `deleteImageIfOwned`) aren't
// resolvable when the module is imported directly in Vitest's "nuxt" test
// environment, so every one is stubbed onto `globalThis` before the route
// module loads. `defineEventHandler`/`createError` get the same faithful
// minimal reimplementations used there.
//
// `deleteImageIfOwned` stays mocked here - its ownership-guard logic is
// already covered by `server/utils/__tests__/image-storage.test.ts`
// (including the mutation-tested `.includes()` regression guards). This
// file is purely about the route wrapper's own control flow: auth check,
// query-param validation, and the response shape.
//
// NOT stubbed: `setResponseStatus`. Confirmed by temporarily instrumenting
// the route source directly (logging `String(setResponseStatus)` at the
// call site, then reverting) that this repo's Sentry Nuxt/Nitro
// auto-instrumentation (the `@sentry/nuxt` Vite/Rollup plugin, visible in
// every test run's startup log) rewrites server route files at transform
// time and injects its OWN locally-scoped `setResponseStatus` helper
// directly into the module - a real local binding, not a free/global
// identifier - which shadows any `vi.stubGlobal("setResponseStatus", ...)`
// entirely; a `globalThis` property-getter trap installed on it is never
// even touched. So this route's actual `setResponseStatus(event, 204)` call
// is unobservable from a test at this boundary; the response-shape
// assertion below is limited to what the route hands back (`return null`)
// and to `deleteImageIfOwnedMock`/the auth guard, which are all real,
// stubbing-observable boundaries.
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
const getQueryMock = vi.hoisted(() => vi.fn());
const deleteImageIfOwnedMock = vi.hoisted(() => vi.fn());

vi.stubGlobal("defineEventHandler", stubDefineEventHandler);
vi.stubGlobal("createError", stubCreateError);
vi.stubGlobal("requireUserId", requireUserIdMock);
vi.stubGlobal("getQuery", getQueryMock);
vi.stubGlobal("deleteImageIfOwned", deleteImageIfOwnedMock);

// Dynamic + top-level await: the globals above must be in place *before* the
// route module's top-level `defineEventHandler(...)` call runs, which a
// static `import` (hoisted above all other code by the ES module spec) would
// violate.
const handler = (await import("../image.delete")).default;

function makeEvent() {
  return {} as Parameters<typeof handler>[0];
}

beforeEach(() => {
  requireUserIdMock.mockReset().mockResolvedValue("user-1");
  getQueryMock.mockReset().mockReturnValue({});
  deleteImageIfOwnedMock.mockReset().mockResolvedValue(undefined);
});

describe("DELETE /api/upload/image", () => {
  it("propagates a 401 from requireUserId and never calls deleteImageIfOwned", async () => {
    requireUserIdMock.mockRejectedValue(
      stubCreateError({ statusCode: 401, statusMessage: "Unauthorized" })
    );

    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 401 });

    expect(deleteImageIfOwnedMock).not.toHaveBeenCalled();
  });

  it("rejects a missing ?url= query param with a 400, never calling deleteImageIfOwned", async () => {
    getQueryMock.mockReturnValue({});

    await expect(handler(makeEvent())).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "Missing url query parameter"
    });

    expect(deleteImageIfOwnedMock).not.toHaveBeenCalled();
  });

  it("rejects a repeated ?url=a&url=b (array value) with a 400, never calling deleteImageIfOwned", async () => {
    // `getQuery` types a repeated query key as `string[]`, which fails the
    // route's explicit `typeof url !== "string"` guard.
    getQueryMock.mockReturnValue({ url: ["https://a.example/x.png", "https://b.example/y.png"] });

    await expect(handler(makeEvent())).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "Missing url query parameter"
    });

    expect(deleteImageIfOwnedMock).not.toHaveBeenCalled();
  });

  it("rejects an empty-string ?url= with a 400, never calling deleteImageIfOwned", async () => {
    getQueryMock.mockReturnValue({ url: "" });

    await expect(handler(makeEvent())).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "Missing url query parameter"
    });

    expect(deleteImageIfOwnedMock).not.toHaveBeenCalled();
  });

  it("on a valid ?url= from an authenticated user, calls deleteImageIfOwned(url, userId) and completes with a null body", async () => {
    const url = "https://abc123.public.blob.vercel-storage.com/uploads/user-1/foo.png";
    getQueryMock.mockReturnValue({ url });

    const result = await handler(makeEvent());

    expect(deleteImageIfOwnedMock).toHaveBeenCalledWith(url, "user-1");
    expect(result).toBeNull();
  });
});
