import { useAuth } from "./use-auth";

import type { Collection } from "./collections";

export async function useCollection(id: string) {
  // useRequestFetch() must be called before the await below: Nuxt/Vue only
  // restores the instance context across an async setup's await automatically
  // inside <script setup>, not inside a plain composable function - calling it
  // after the await here would throw "called outside of a plugin/setup" on the
  // server (see the identical note in use-auth-buttons.ts).
  const requestFetch = useRequestFetch();

  // The `auth` middleware already guarantees a session exists (it redirects
  // otherwise), but doesn't expose the resolved session to the page. Re-resolve
  // it here via the same useAuth()/getSession() call the middleware uses, so
  // the cache key below can be scoped per-user identically on SSR and client.
  const { data: session } = await useAuth().getSession();

  const {
    data: collection,
    error,
    refresh
  } = await useAsyncData(`collection-${session?.user.id}-${id}`, () =>
    requestFetch<Collection>(`/api/collections/${id}`)
  );

  const isNotFound = computed(() => error.value?.statusCode === 404);

  return { collection, error, refresh, isNotFound, userId: session?.user.id };
}
