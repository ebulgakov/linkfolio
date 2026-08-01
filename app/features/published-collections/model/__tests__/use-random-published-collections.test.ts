import { beforeEach, describe, expect, it } from "vitest";
import { ref } from "vue";

import type { PublishedCollection } from "~/shared/api";

import { resetUseStateMock, useStateCache } from "~/shared/testing/mocks/use-state";

// This import must stay last, mirroring the same-shaped comment in
// use-collection-form.test.ts: `~/shared/testing/mocks/use-state` registers
// its `mockNuxtImport("useState", ...)` side effect as it's evaluated, in
// import-statement order. Importing the composable under test first would
// resolve its `useState` auto-import against the real Nuxt implementation
// before the mock is registered.
// eslint-disable-next-line import/order
import { useRandomPublishedCollections } from "../use-random-published-collections";

function makeCollections(count: number): PublishedCollection[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `collection-${index + 1}`,
    name: `Collection ${index + 1}`,
    description: null,
    slug: `collection-${index + 1}`,
    imageUrl: null
  }));
}

beforeEach(() => {
  // The mock's cache Map lives at module scope (see use-state.ts) and is
  // keyed by the same literal string
  // ("published-collections-random-pick") on every call the composable
  // under test makes, so without this reset the first test to run would
  // pin the value for every test after it.
  resetUseStateMock();
});

describe("useRandomPublishedCollections", () => {
  it("picks exactly 5 items out of a longer source list, all drawn from source, no duplicates", () => {
    const source = ref(makeCollections(8));

    const pick = useRandomPublishedCollections(source);

    expect(pick.value).toHaveLength(5);
    const ids = pick.value.map(item => item.id);
    expect(new Set(ids).size).toBe(5); // no duplicates within the pick
    for (const item of pick.value) {
      expect(source.value).toContainEqual(item);
    }
  });

  it("picks all items - min(5, length) - when the source has fewer than 5 items, with no padding and no error", () => {
    const source = ref(makeCollections(3));

    const pick = useRandomPublishedCollections(source);

    expect(pick.value).toHaveLength(3);
    expect([...pick.value].map(item => item.id).sort()).toEqual(
      source.value.map(item => item.id).sort()
    );
  });

  it("returns an empty array for an empty source list", () => {
    const source = ref<PublishedCollection[]>([]);

    const pick = useRandomPublishedCollections(source);

    expect(pick.value).toEqual([]);
  });

  it("returns the same pick across two calls with the same key (stability) - this proves the mock's per-key useState caching holds, not that Math.random() happened to agree twice", () => {
    const source = ref(makeCollections(8));

    const first = useRandomPublishedCollections(source);

    // Discriminator: under `environment: "nuxt"` a real Nuxt app instance
    // exists, and real useState ALSO returns the same ref for a repeat call
    // with the same key - so `second === first` below would pass whether or
    // not our mock is actually the one in effect, making it a vacuous
    // assertion on its own. Only our mock populates this Map (see
    // use-state.ts); asserting on it directly proves the mockNuxtImport
    // registration actually intercepted the call rather than real Nuxt
    // useState silently doing the same thing for a different reason.
    expect(useStateCache.has("published-collections-random-pick")).toBe(true);

    const second = useRandomPublishedCollections(source);

    // Our useState mock (app/shared/testing/mocks/use-state.ts) caches by
    // key in a Map and returns the SAME ref instance on a repeat call for
    // that key, exactly like real Nuxt useState does for the lifetime of an
    // app instance - so this is really an assertion about the mock's
    // caching semantics, exercised through the composable under test.
    expect(second).toBe(first);
    expect(second.value).toEqual(first.value);
  });
});
