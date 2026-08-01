import type { PublishedCollection } from "./shared-collections";

export async function usePublishedCollections() {
  // useRequestFetch() must be called before any await in this composable -
  // see the identical note in use-collection.ts / use-shared-collection.ts /
  // use-auth-buttons.ts.
  const requestFetch = useRequestFetch();

  // `default` keeps `data` typed as `Ref<PublishedCollection[]>` (never
  // `undefined`) so downstream composables that take a
  // `Ref<PublishedCollection[]>` - useRandomPublishedCollections,
  // usePublishedCollectionsSearch - can consume it directly without the
  // caller unwrapping/defaulting it first. `error` is still returned
  // separately for the error-state UI.
  const { data, error, refresh } = await useAsyncData(
    "published-collections",
    () => requestFetch<PublishedCollection[]>("/api/shared"),
    { default: (): PublishedCollection[] => [] }
  );

  return { data, error, refresh };
}
