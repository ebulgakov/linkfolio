import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { vi } from "vitest";

// useRouter() has only one consumer app-wide (use-auth-buttons.ts), so this
// isn't a shared boundary mock under ~/shared/testing/mocks - it's a local
// helper colocated with the one test file that needs it, mirroring the
// dedicated-module shape of ~/shared/testing/mocks/route.ts/navigate.ts
// (mockNuxtImport compiles to one hoisted vi.mock per file, so it can't be
// declared inline in the test file itself without an import/first conflict:
// the composable-under-test's import must be placed after this mock
// registers, which requires it to be a separate module import rather than
// code interleaved between imports in the same file).
//
// Nuxt's own test-utils/runtime setup and internal plugins (navigation-repaint)
// also call useRouter() during environment bootstrap and expect a fuller
// router-like surface (afterEach/beforeResolve) - a mock exposing only
// `push` throws during that bootstrap, so the no-op methods below are
// required even though use-auth-buttons.ts itself only calls `push`.
const routerPushMock = vi.hoisted(() => vi.fn());
const routerMock = vi.hoisted(() => ({
  push: routerPushMock,
  replace: vi.fn(),
  beforeEach: vi.fn(() => vi.fn()),
  afterEach: vi.fn(() => vi.fn()),
  beforeResolve: vi.fn(() => vi.fn())
}));

export { routerPushMock };

mockNuxtImport("useRouter", () => () => routerMock);
