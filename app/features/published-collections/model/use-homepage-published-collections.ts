import { useRandomPublishedCollections } from "./use-random-published-collections";

import type { Ref } from "vue";
import type { PublishedCollection } from "~/shared/api";

import { usePublishedCollections } from "~/shared/api";

/**
 * Fetches published collections and picks 5 at random, for the guest
 * homepage section. Only meaningful for unauthenticated visitors - see
 * useRandomPublishedCollections's caveat about its useState key being
 * claimed on first call, so this must not run for a logged-in session.
 *
 * `nuxtApp` is captured before the `await` below and used to re-enter the
 * Nuxt context via `runWithContext` afterward - Vue's <script setup>
 * compiler auto-restores the instance context around a *top-level* await
 * via withAsyncContext, but that transform doesn't reach into a plain
 * exported async function like this one. Without runWithContext,
 * useRandomPublishedCollections' internal useState() call throws
 * NUXT_E1001 ("nuxt instance unavailable") once this logic is extracted out
 * of the .vue file - confirmed in production (see CLAUDE.md's identical
 * note for use-auth-buttons.ts, and Sentry issue LINKFOLIO-F).
 */
export async function useHomepagePublishedCollections(): Promise<Ref<PublishedCollection[]>> {
  const nuxtApp = useNuxtApp();
  const { data: publishedCollections } = await usePublishedCollections();
  return nuxtApp.runWithContext(() => useRandomPublishedCollections(publishedCollections));
}
