import type { Ref } from "vue";
import type { PublishedCollection } from "~/shared/api";

function pickRandom<T>(list: T[], count: number): T[] {
  // Fisher-Yates, not `.sort(() => Math.random() - 0.5)` - a sort-based
  // shuffle is biased (the skew depends on the sort algorithm's comparison
  // pattern), so some items would be systematically more likely to land in
  // the first `count` slots this function returns.
  const shuffled = [...list];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    // Non-null: both indices are within `shuffled`'s bounds by construction
    // (0 <= j <= i < shuffled.length), TS's noUncheckedIndexedAccess just
    // can't see that from the loop bounds alone.
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled.slice(0, count);
}

/**
 * Picks 6 random published collections, once, in an SSR/hydration-safe way.
 *
 * A plain `computed(() => shuffle(...))` would re-shuffle independently on
 * server and client, producing a different order/subset on each and
 * triggering a Vue hydration mismatch. `useState(key, init)` avoids this:
 * `init` runs exactly once - on the server its result is serialized into the
 * payload, and the client reuses that same serialized value on hydration
 * instead of re-running `init`.
 *
 * IMPORTANT caveat for callers: `useState` caches its result per key for the
 * lifetime of the Nuxt app instance, not just the current render - `init`
 * only runs the FIRST time this key is requested. So this only produces a
 * non-empty pick if `source.value` is already populated - i.e. the async
 * data fetch has resolved - at that first call (the SSR pass, or a
 * client-only render if no SSR occurred, e.g. client-side navigation to the
 * page). This file cannot enforce call order - the consuming page/component
 * MUST call `usePublishedCollections()` and await its data BEFORE calling
 * this composable. Get the order wrong and the pick is stuck empty for
 * every subsequent client-side navigation back to this page too, not just
 * the first render - only a full page reload re-triggers `init`.
 */
export function useRandomPublishedCollections(source: Ref<PublishedCollection[]>) {
  return useState("published-collections-random-pick", () => pickRandom(source.value ?? [], 6));
}
