import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { sanitizeRedirect, useLoginForm } from "../useLoginForm";

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

// Mutable state shared with the mocked `useRoute`/`navigateTo` auto-imports.
// `mockNuxtImport` compiles to a hoisted `vi.mock`, so the factory can only be
// registered once per file - tests vary behavior by mutating these boxes
// rather than calling `mockNuxtImport` again.
const routeState = vi.hoisted(() => ({ query: {} as Record<string, unknown> }));
const navigateToMock = vi.hoisted(() => vi.fn());

mockNuxtImport("useRoute", () => () => routeState);
mockNuxtImport("navigateTo", () => navigateToMock);

// `useI18n` is a Nuxt auto-import too (no i18n Vue plugin exists in this test
// environment for it to inject from). Resolve `t(key)` against the real
// en.json messages rather than returning the key itself, so these tests keep
// documenting the actual user-facing copy - and so a typo'd translation key
// in the composable fails the test instead of silently passing.
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

mockNuxtImport("useI18n", () => () => ({ t: tMock }));

const signInEmailMock = vi.hoisted(() => vi.fn());

vi.mock("~/shared/api/auth-client", () => ({
  authClient: {
    signIn: {
      email: signInEmailMock
    }
  }
}));

beforeEach(() => {
  routeState.query = {};
  navigateToMock.mockReset();
  signInEmailMock.mockReset();
  tMock.mockClear();
});

describe("sanitizeRedirect", () => {
  const origin = window.location.origin;

  it("keeps a same-origin relative path, query, and hash", () => {
    expect(sanitizeRedirect("/dashboard?a=1#b")).toBe("/dashboard?a=1#b");
  });

  it("keeps a same-origin absolute URL, reduced to path+search+hash", () => {
    expect(sanitizeRedirect(`${origin}/settings`)).toBe("/settings");
  });

  it("rejects a protocol-relative URL pointing off-origin", () => {
    expect(sanitizeRedirect("//evil.com/phish")).toBe("/");
  });

  it("rejects a cross-origin absolute URL", () => {
    expect(sanitizeRedirect("https://evil.com/phish")).toBe("/");
  });

  it("rejects a javascript: scheme without throwing", () => {
    expect(sanitizeRedirect("javascript:alert(1)")).toBe("/");
  });

  it("falls back to / for a malformed URL that throws during parsing", () => {
    expect(sanitizeRedirect("http://")).toBe("/");
  });

  it("falls back to / for an empty string", () => {
    expect(sanitizeRedirect("")).toBe("/");
  });

  it.each([null, undefined, 123, {}, []])("falls back to / for non-string input %j", value => {
    expect(sanitizeRedirect(value)).toBe("/");
  });
});

describe("useLoginForm().submit", () => {
  it("on success, navigates to the sanitized redirect and clears pending/error", async () => {
    routeState.query = { redirect: "/collections/42" };
    signInEmailMock.mockImplementation(async (_credentials, handlers) => {
      await handlers.onSuccess();
    });

    const { form, submit, pending, errorMessage } = useLoginForm();
    form.email = "user@example.com";
    form.password = "hunter2";

    await submit();

    expect(signInEmailMock).toHaveBeenCalledWith(
      { email: "user@example.com", password: "hunter2" },
      expect.anything()
    );
    expect(navigateToMock).toHaveBeenCalledWith("/collections/42");
    expect(pending.value).toBe(false);
    expect(errorMessage.value).toBeNull();
  });

  it("on success, sanitizes an unsafe redirect before navigating", async () => {
    routeState.query = { redirect: "//evil.com/phish" };
    signInEmailMock.mockImplementation(async (_credentials, handlers) => {
      await handlers.onSuccess();
    });

    const { submit } = useLoginForm();
    await submit();

    expect(navigateToMock).toHaveBeenCalledWith("/");
  });

  it("sets a specific message on a 401 error", async () => {
    signInEmailMock.mockImplementation(async (_credentials, handlers) => {
      handlers.onError({ error: { status: 401 } });
    });

    const { submit, errorMessage, pending } = useLoginForm();
    await submit();

    expect(errorMessage.value).toBe("Invalid email or password.");
    expect(pending.value).toBe(false);
  });

  it("sets a specific message on a 403 error", async () => {
    signInEmailMock.mockImplementation(async (_credentials, handlers) => {
      handlers.onError({ error: { status: 403 } });
    });

    const { submit, errorMessage } = useLoginForm();
    await submit();

    expect(errorMessage.value).toBe("Please verify your email before signing in.");
  });

  it("falls back to a generic message on an unrecognized error status", async () => {
    signInEmailMock.mockImplementation(async (_credentials, handlers) => {
      handlers.onError({ error: { status: 500 } });
    });

    const { submit, errorMessage } = useLoginForm();
    await submit();

    expect(errorMessage.value).toBe("Something went wrong. Please try again.");
  });

  it("falls back to a generic message when the call throws/rejects", async () => {
    signInEmailMock.mockImplementation(async () => {
      throw new Error("network down");
    });

    const { submit, errorMessage, pending } = useLoginForm();
    await submit();

    expect(errorMessage.value).toBe("Something went wrong. Please try again.");
    expect(pending.value).toBe(false);
  });

  it("sets pending true while the request is in flight and false once it settles", async () => {
    let resolveSignIn!: () => void;
    signInEmailMock.mockImplementation(
      () =>
        new Promise<void>(resolve => {
          resolveSignIn = resolve;
        })
    );

    const { submit, pending } = useLoginForm();
    expect(pending.value).toBe(false);

    const submitPromise = submit();
    expect(pending.value).toBe(true);

    resolveSignIn();
    await submitPromise;

    expect(pending.value).toBe(false);
  });
});
