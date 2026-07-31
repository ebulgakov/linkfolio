import type { Collection } from "~/shared/api";

export function useCollections(userId: string | undefined) {
  const requestFetch = useRequestFetch();
  return useAsyncData(`collections-${userId}`, () =>
    requestFetch<Collection[]>("/api/collections")
  );
}
