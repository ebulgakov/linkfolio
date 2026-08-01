import { useRandomPublishedCollections } from "./use-random-published-collections";

import type { Ref } from "vue";
import type { PublishedCollection } from "~/shared/api";

import { usePublishedCollections } from "~/shared/api";

/**
 * Fetches published collections and picks 5 at random, for the guest
 * homepage section. Only meaningful for unauthenticated visitors - see
 * useRandomPublishedCollections's caveat about its useState key being
 * claimed on first call, so this must not run for a logged-in session.
 */
export async function useHomepagePublishedCollections(): Promise<Ref<PublishedCollection[]>> {
  const { data: publishedCollections } = await usePublishedCollections();
  return useRandomPublishedCollections(publishedCollections);
}
