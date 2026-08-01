import { describe, expect, it } from "vitest";
import { ref } from "vue";

import { usePublishedCollectionsSearch } from "../use-published-collections-search";

import type { PublishedCollection } from "~/shared/api";

// No Nuxt auto-imports involved here (just vue's ref/computed inside the
// composable, plus the real fuse.js library) - unlike
// use-random-published-collections.test.ts, this needs no mockNuxtImport
// setup and runs against the real Fuse implementation.

const cookingCollection: PublishedCollection = {
  id: "1",
  name: "Cooking Recipes",
  description: "A curated list of favorite pasta and dessert recipes.",
  slug: "cooking-recipes",
  imageUrl: null
};

const travelCollection: PublishedCollection = {
  id: "2",
  name: "Travel Guides",
  description: "Tips for backpacking across South America.",
  slug: "travel-guides",
  imageUrl: null
};

const devToolsCollection: PublishedCollection = {
  id: "3",
  name: "Dev Tools",
  description: "Editor themes, CLIs, and productivity extensions.",
  slug: "dev-tools",
  imageUrl: null
};

const source = ref<PublishedCollection[]>([
  cookingCollection,
  travelCollection,
  devToolsCollection
]);

describe("usePublishedCollectionsSearch", () => {
  it("returns the full source list, in original order/reference, for the default empty query", () => {
    const { query, results } = usePublishedCollectionsSearch(source);

    expect(query.value).toBe("");
    expect(results.value).toBe(source.value);
  });

  it("returns the full source list for a whitespace-only query", () => {
    const { query, results } = usePublishedCollectionsSearch(source);

    query.value = "   ";
    expect(results.value).toBe(source.value);
  });

  it("matches on part of an item's name, and not unrelated items", () => {
    const { query, results } = usePublishedCollectionsSearch(source);

    query.value = "cooking";
    expect(results.value).toEqual([cookingCollection]);
  });

  it("matches on part of an item's description, and not unrelated items", () => {
    const { query, results } = usePublishedCollectionsSearch(source);

    query.value = "backpacking";
    expect(results.value).toEqual([travelCollection]);
  });

  it("returns an empty array for a query matching nothing", () => {
    const { query, results } = usePublishedCollectionsSearch(source);

    query.value = "xyzzy-no-such-collection";
    expect(results.value).toEqual([]);
  });

  it("restores the full list when the query is cleared back to empty after a search", () => {
    const { query, results } = usePublishedCollectionsSearch(source);

    query.value = "cooking";
    expect(results.value).toEqual([cookingCollection]);

    query.value = "";
    expect(results.value).toBe(source.value);
  });
});
