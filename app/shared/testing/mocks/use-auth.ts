import { vi } from "vitest";

// useAuth() (unlike the authClient singleton) is a plain named export from
// ~/shared/api/use-auth, not a Nuxt auto-import - so this mocks the module
// directly with vi.mock, the same way ~/shared/testing/mocks/auth-client.ts
// mocks ~/shared/api/auth-client, rather than via mockNuxtImport.
//
// getSession is exported as `useAuthGetSessionMock` (not `getSessionMock`) to
// stay unambiguous alongside auth-client.ts's own `getSessionMock` - a test
// exercising a composable that calls both authClient.getSession() and
// useAuth().getSession() needs to tell them apart at the import site.
const getSessionMock = vi.hoisted(() => vi.fn());
const signOutMock = vi.hoisted(() => vi.fn());
const useAuthMock = vi.hoisted(() =>
  vi.fn(() => ({ getSession: getSessionMock, signOut: signOutMock }))
);

export { getSessionMock as useAuthGetSessionMock, signOutMock as useAuthSignOutMock, useAuthMock };

vi.mock("~/shared/api/use-auth", () => ({
  useAuth: useAuthMock
}));

export function resetUseAuthMocks() {
  getSessionMock.mockReset();
  signOutMock.mockReset();
  useAuthMock.mockClear();
}
