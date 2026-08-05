import { vi } from "vitest";

// useAuthSession() is a plain named export from ~/shared/api/use-session (re-exported
// through the ~/shared/api barrel), not a Nuxt auto-import - so this mocks the module
// directly with vi.mock, the same way ~/shared/testing/mocks/use-auth.ts mocks
// ~/shared/api/use-auth, rather than via mockNuxtImport. Mocking the concrete module
// path (not the barrel) still intercepts consumers that import from "~/shared/api",
// since the barrel's `export { useAuthSession } from "./use-session"` resolves to the
// same module specifier.
const useAuthSessionMock = vi.hoisted(() => vi.fn());

export { useAuthSessionMock };

vi.mock("~/shared/api/use-session", () => ({
  useAuthSession: useAuthSessionMock
}));

export function resetUseAuthSessionMocks() {
  useAuthSessionMock.mockReset();
}
