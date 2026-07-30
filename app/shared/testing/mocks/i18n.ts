import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { vi } from "vitest";

// Read en.json as plain JSON via `fs`, not `import` - `@nuxtjs/i18n` applies
// its own Vite transform to files under its configured locales directory
// (precompiling them to a vue-i18n message AST), so a normal ES import here
// would yield that compiled AST instead of the raw string messages.
//
// This must stay a plain (non-`vi.hoisted`) statement: `vi.hoisted` callbacks
// run *before* this file's own `import` statements are linked, so a
// `readFileSync` call made inside one throws "Cannot access
// '__vi_import_0__' before initialization". Declaring `en` here is safe
// because `tMock` below only reads it lazily, the first time `t()` is
// actually called - by then this line has long since run. `resolve` is
// anchored on `process.cwd()` (Vitest runs from the repo root) rather than
// `import.meta.url`, since that URL isn't a `file:` scheme in this
// transformed environment.
const en = JSON.parse(
  readFileSync(resolve(process.cwd(), "i18n/locales/en.json"), "utf-8")
) as Record<string, unknown>;

// `useI18n` is a Nuxt auto-import too (no i18n Vue plugin exists in this test
// environment for it to inject from). Resolve `t(key)` against the real
// en.json messages rather than returning the key itself, so tests keep
// documenting the actual user-facing copy - and so a typo'd translation key
// in a composable fails the test instead of silently passing.
const tMock = vi.hoisted(() =>
  vi.fn((key: string) => {
    const value = key.split(".").reduce<unknown>((node, segment) => {
      return node && typeof node === "object" && segment in node
        ? (node as Record<string, unknown>)[segment]
        : undefined;
    }, en);
    if (typeof value !== "string") {
      throw new Error(`Missing test translation for key "${key}"`);
    }
    return value;
  })
);

export { tMock };

mockNuxtImport("useI18n", () => () => ({ t: tMock }));
