import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useResetPasswordForm } from "../useResetPasswordForm";

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

// Mutable state shared with the mocked `useRoute` auto-import.
// `mockNuxtImport` compiles to a hoisted `vi.mock`, so the factory can only be
// registered once per file - tests vary behavior by mutating this box rather
// than calling `mockNuxtImport` again.
const routeState = vi.hoisted(() => ({ query: {} as Record<string, unknown> }));

mockNuxtImport("useRoute", () => () => routeState);

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

const resetPasswordMock = vi.hoisted(() => vi.fn());

vi.mock("~/shared/api/auth-client", () => ({
  authClient: {
    resetPassword: resetPasswordMock
  }
}));

beforeEach(() => {
  routeState.query = {};
  resetPasswordMock.mockReset();
  tMock.mockClear();
});

describe("useResetPasswordForm().hasValidToken", () => {
  it("is true when route.query.token is a non-empty string", () => {
    routeState.query = { token: "abc123" };

    const { hasValidToken } = useResetPasswordForm();

    expect(hasValidToken.value).toBe(true);
  });

  it("is false when route.query.token is absent", () => {
    routeState.query = {};

    const { hasValidToken } = useResetPasswordForm();

    expect(hasValidToken.value).toBe(false);
  });

  it("is false when route.query.token is undefined", () => {
    routeState.query = { token: undefined };

    const { hasValidToken } = useResetPasswordForm();

    expect(hasValidToken.value).toBe(false);
  });
});

describe("useResetPasswordForm().submit - no token guard", () => {
  it("is a no-op and does not call authClient.resetPassword when there is no token", async () => {
    routeState.query = {};

    const { submit, pending } = useResetPasswordForm();
    await submit();

    expect(resetPasswordMock).not.toHaveBeenCalled();
    expect(pending.value).toBe(false);
  });
});

describe("useResetPasswordForm().submit", () => {
  beforeEach(() => {
    routeState.query = { token: "valid-token" };
  });

  it("calls resetPassword with the new password and token", async () => {
    resetPasswordMock.mockImplementation(async (_payload, handlers) => {
      handlers.onSuccess();
    });

    const { form, submit } = useResetPasswordForm();
    form.password = "new-hunter2";

    await submit();

    expect(resetPasswordMock).toHaveBeenCalledWith(
      { newPassword: "new-hunter2", token: "valid-token" },
      expect.anything()
    );
  });

  it("on success, sets success.value = true", async () => {
    resetPasswordMock.mockImplementation(async (_payload, handlers) => {
      handlers.onSuccess();
    });

    const { submit, success, errorMessage, pending } = useResetPasswordForm();
    await submit();

    expect(success.value).toBe(true);
    expect(errorMessage.value).toBeNull();
    expect(pending.value).toBe(false);
  });

  it("sets the invalid-token message when ctx.error.code is INVALID_TOKEN", async () => {
    resetPasswordMock.mockImplementation(async (_payload, handlers) => {
      handlers.onError({ error: { code: "INVALID_TOKEN" } });
    });

    const { submit, errorMessage, success } = useResetPasswordForm();
    await submit();

    expect(errorMessage.value).toBe(
      "This password reset link is invalid or has expired. Please request a new one."
    );
    expect(success.value).toBe(false);
  });

  it("falls back to the generic message on any other error code/status", async () => {
    resetPasswordMock.mockImplementation(async (_payload, handlers) => {
      handlers.onError({ error: { status: 500, code: "SOME_OTHER_CODE" } });
    });

    const { submit, errorMessage } = useResetPasswordForm();
    await submit();

    expect(errorMessage.value).toBe("Something went wrong. Please try again.");
  });

  it("falls back to the generic message when the call throws/rejects", async () => {
    resetPasswordMock.mockImplementation(async () => {
      throw new Error("network down");
    });

    const { submit, errorMessage, pending } = useResetPasswordForm();
    await submit();

    expect(errorMessage.value).toBe("Something went wrong. Please try again.");
    expect(pending.value).toBe(false);
  });

  it("does not overwrite an error message already set by onError before the rejection", async () => {
    resetPasswordMock.mockImplementation(async (_payload, handlers) => {
      handlers.onError({ error: { code: "INVALID_TOKEN" } });
      throw new Error("network down");
    });

    const { submit, errorMessage, pending } = useResetPasswordForm();
    await submit();

    expect(errorMessage.value).toBe(
      "This password reset link is invalid or has expired. Please request a new one."
    );
    expect(pending.value).toBe(false);
  });

  it("resets errorMessage and success at the top of a new submit() call", async () => {
    resetPasswordMock.mockImplementationOnce(async (_payload, handlers) => {
      handlers.onError({ error: { code: "INVALID_TOKEN" } });
    });

    const { submit, success, errorMessage } = useResetPasswordForm();
    await submit();
    expect(errorMessage.value).not.toBeNull();

    let resolveSecondCall!: () => void;
    resetPasswordMock.mockImplementationOnce(
      () =>
        new Promise<void>(resolve => {
          resolveSecondCall = resolve;
        })
    );

    const submitPromise = submit();
    // Reset happens synchronously at the top of submit(), before the second
    // call settles.
    expect(errorMessage.value).toBeNull();
    expect(success.value).toBe(false);

    resolveSecondCall();
    await submitPromise;
  });

  it("sets pending true while the request is in flight and false once it settles", async () => {
    let resolveCall!: () => void;
    resetPasswordMock.mockImplementation(
      () =>
        new Promise<void>(resolve => {
          resolveCall = resolve;
        })
    );

    const { submit, pending } = useResetPasswordForm();
    expect(pending.value).toBe(false);

    const submitPromise = submit();
    expect(pending.value).toBe(true);

    resolveCall();
    await submitPromise;

    expect(pending.value).toBe(false);
  });

  it("sets pending false after the call throws", async () => {
    let rejectCall!: (error: Error) => void;
    resetPasswordMock.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectCall = reject;
        })
    );

    const { submit, pending } = useResetPasswordForm();
    const submitPromise = submit();
    expect(pending.value).toBe(true);

    rejectCall(new Error("network down"));
    await submitPromise;

    expect(pending.value).toBe(false);
  });
});
