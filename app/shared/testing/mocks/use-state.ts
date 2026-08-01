import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { vi } from "vitest";
import { ref } from "vue";

// A simplified stand-in for Nuxt's real useState(key, init): real useState
// caches its value per key for the lifetime of the app instance, running
// `init` only on the FIRST call for a given key - every subsequent call with
// that key returns the same cached ref, ignoring `init` entirely. This mock
// reproduces just that per-key caching behavior (via a plain Map, not
// Nuxt's actual SSR-payload/app-instance machinery) so composables built on
// useState - like useRandomPublishedCollections - can be unit tested for
// "stable value across repeat calls with the same key" without needing a
// real Nuxt app instance.
//
// Must be reset between tests (see resetUseStateMock) - the Map lives at
// module (hoisted) scope, so a value cached by one test would otherwise
// leak into the next test that requests the same key.
const useStateCache = vi.hoisted(() => new Map<string, unknown>());

export { useStateCache };

mockNuxtImport("useState", () => {
  return <T>(key: string, init?: () => T) => {
    if (!useStateCache.has(key)) {
      useStateCache.set(key, ref(init ? init() : undefined));
    }
    return useStateCache.get(key);
  };
});

export function resetUseStateMock() {
  useStateCache.clear();
}
