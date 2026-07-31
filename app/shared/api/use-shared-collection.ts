import type { SharedCollection } from "./shared-collections";

export async function useSharedCollection(slug: string) {
  // useRequestFetch() must be called before any await in this composable -
  // see the identical note in use-collection.ts / use-auth-buttons.ts.
  const requestFetch = useRequestFetch();

  const {
    data: collection,
    error,
    refresh
  } = await useAsyncData(`shared-collection-${slug}`, () =>
    requestFetch<SharedCollection>(`/api/shared/${slug}`)
  );

  const isNotFound = computed(() => error.value?.statusCode === 404);

  return { collection, error, refresh, isNotFound };
}
