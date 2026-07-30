import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { vi } from "vitest";

// Mutable state shared with the mocked `useRoute` auto-import. `mockNuxtImport`
// compiles to a hoisted `vi.mock`, so the factory can only be registered once
// per file - tests vary behavior by mutating this box rather than calling
// `mockNuxtImport` again.
const routeState = vi.hoisted(() => ({ query: {} as Record<string, unknown> }));

export { routeState };

mockNuxtImport("useRoute", () => () => routeState);

export function resetRouteState() {
  routeState.query = {};
}
