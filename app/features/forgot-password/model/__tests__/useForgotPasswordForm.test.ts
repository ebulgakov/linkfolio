import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useForgotPasswordForm } from "../useForgotPasswordForm";

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

const requestPasswordResetMock = vi.hoisted(() => vi.fn());

vi.mock("~/shared/api/auth-client", () => ({
  authClient: {
    requestPasswordReset: requestPasswordResetMock
  }
}));

beforeEach(() => {
  requestPasswordResetMock.mockReset();
  tMock.mockClear();
});

describe("useForgotPasswordForm().submit", () => {
  it("calls requestPasswordReset with the email and an origin-based redirectTo", async () => {
    requestPasswordResetMock.mockImplementation(async (_payload, handlers) => {
      handlers.onSuccess();
    });

    const { form, submit } = useForgotPasswordForm();
    form.email = "user@example.com";

    await submit();

    expect(requestPasswordResetMock).toHaveBeenCalledWith(
      { email: "user@example.com", redirectTo: expect.stringMatching(/\/reset-password$/) },
      expect.anything()
    );
    const call = requestPasswordResetMock.mock.calls[0];
    expect(call?.[0]).toEqual({
      email: "user@example.com",
      redirectTo: `${window.location.origin}/reset-password`
    });
  });

  it("on success, sets submitted true and leaves errorMessage null", async () => {
    requestPasswordResetMock.mockImplementation(async (_payload, handlers) => {
      handlers.onSuccess();
    });

    const { submit, submitted, errorMessage, pending } = useForgotPasswordForm();
    await submit();

    expect(submitted.value).toBe(true);
    expect(errorMessage.value).toBeNull();
    expect(pending.value).toBe(false);
  });

  it("on error, sets the generic error message and leaves submitted false", async () => {
    requestPasswordResetMock.mockImplementation(async (_payload, handlers) => {
      handlers.onError({ error: { status: 500 } });
    });

    const { submit, submitted, errorMessage, pending } = useForgotPasswordForm();
    await submit();

    expect(errorMessage.value).toBe("Something went wrong. Please try again.");
    expect(submitted.value).toBe(false);
    expect(pending.value).toBe(false);
  });

  it("falls back to the generic message when the call throws/rejects", async () => {
    requestPasswordResetMock.mockImplementation(async () => {
      throw new Error("network down");
    });

    const { submit, errorMessage, pending } = useForgotPasswordForm();
    await submit();

    expect(errorMessage.value).toBe("Something went wrong. Please try again.");
    expect(pending.value).toBe(false);
  });

  it("does not overwrite an error message already set by onError before the rejection", async () => {
    requestPasswordResetMock.mockImplementation(async (_payload, handlers) => {
      handlers.onError({ error: { status: 500 } });
      throw new Error("network down");
    });

    const { submit, errorMessage, pending } = useForgotPasswordForm();
    await submit();

    expect(errorMessage.value).toBe("Something went wrong. Please try again.");
    expect(pending.value).toBe(false);
  });

  it("resets errorMessage and submitted at the top of a new submit() call", async () => {
    requestPasswordResetMock.mockImplementationOnce(async (_payload, handlers) => {
      handlers.onError({ error: { status: 500 } });
    });

    const { submit, submitted, errorMessage } = useForgotPasswordForm();
    await submit();
    expect(errorMessage.value).toBe("Something went wrong. Please try again.");

    let resolveSecondCall!: () => void;
    requestPasswordResetMock.mockImplementationOnce(
      () =>
        new Promise<void>(resolve => {
          resolveSecondCall = resolve;
        })
    );

    const submitPromise = submit();
    // Reset happens synchronously at the top of submit(), before the second
    // call settles.
    expect(errorMessage.value).toBeNull();
    expect(submitted.value).toBe(false);

    resolveSecondCall();
    await submitPromise;
  });

  it("sets pending true while the request is in flight and false once it settles", async () => {
    let resolveCall!: () => void;
    requestPasswordResetMock.mockImplementation(
      () =>
        new Promise<void>(resolve => {
          resolveCall = resolve;
        })
    );

    const { submit, pending } = useForgotPasswordForm();
    expect(pending.value).toBe(false);

    const submitPromise = submit();
    expect(pending.value).toBe(true);

    resolveCall();
    await submitPromise;

    expect(pending.value).toBe(false);
  });

  it("sets pending false after settling on error", async () => {
    let resolveCall!: () => void;
    requestPasswordResetMock.mockImplementation(
      (_payload, handlers) =>
        new Promise<void>(resolve => {
          resolveCall = () => {
            handlers.onError({ error: { status: 500 } });
            resolve();
          };
        })
    );

    const { submit, pending } = useForgotPasswordForm();
    const submitPromise = submit();
    expect(pending.value).toBe(true);

    resolveCall();
    await submitPromise;

    expect(pending.value).toBe(false);
  });

  it("sets pending false after the call throws", async () => {
    let rejectCall!: (error: Error) => void;
    requestPasswordResetMock.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectCall = reject;
        })
    );

    const { submit, pending } = useForgotPasswordForm();
    const submitPromise = submit();
    expect(pending.value).toBe(true);

    rejectCall(new Error("network down"));
    await submitPromise;

    expect(pending.value).toBe(false);
  });
});
