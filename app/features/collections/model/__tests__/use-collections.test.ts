import { beforeEach, describe, expect, it } from "vitest";

import type { Collection } from "~/shared/api";

import { requestFetchMock, resetRequestFetchMock } from "~/shared/testing/mocks/request-fetch";

// This import must stay last: ~/shared/testing/mocks/request-fetch registers
// its mockNuxtImport side effect as it's evaluated. Importing the composable
// under test first would resolve its useRequestFetch() auto-import against
// the real implementation before the mock is registered.
// eslint-disable-next-line import/order
import { useCollections } from "../use-collections";

function makeCollection(overrides: Partial<Collection> = {}): Collection {
  return {
    id: "collection-1",
    userId: "user-1",
    name: "My Collection",
    description: null,
    shared: false,
    slug: "my-collection",
    password: null,
    published: false,
    imageUrl: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

beforeEach(() => {
  resetRequestFetchMock();
});

describe("useCollections", () => {
  // useAsyncData is intentionally left real (not mocked) - mocking it would
  // only assert this composable called it with a given key/closure, which
  // restates the implementation rather than testing behavior. Each case uses
  // a distinct userId because real useAsyncData caches by key
  // (`collections-${userId}`), so reusing one id across tests would leak the
  // first test's cached payload into the second.
  it("resolves data.value with the collections returned by /api/collections", async () => {
    const collections = [makeCollection({ id: "collection-1" })];
    requestFetchMock.mockResolvedValue(collections);

    const { data, error } = await useCollections("user-resolve");

    expect(requestFetchMock).toHaveBeenCalledWith("/api/collections");
    expect(data.value).toEqual(collections);
    // useAsyncData's error ref defaults to (and resets to) undefined on
    // success, not null - see node_modules/nuxt/dist/app/composables/asyncData.js.
    expect(error.value).toBeUndefined();
  });

  it("populates error.value when the request rejects", async () => {
    requestFetchMock.mockRejectedValue(new Error("network down"));

    const { data, error } = await useCollections("user-reject");

    expect(error.value?.message).toBe("network down");
    // data.value is left at its default (undefined) on failure - useAsyncData
    // never assigns it, it only sets error.
    expect(data.value).toBeUndefined();
  });
});
