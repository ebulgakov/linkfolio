import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSignupForm } from "../useSignupForm";

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

const navigateToMock = vi.hoisted(() => vi.fn());

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

const signUpEmailMock = vi.hoisted(() => vi.fn());
const getSessionMock = vi.hoisted(() => vi.fn());

vi.mock("~/shared/api/auth-client", () => ({
  authClient: {
    signUp: {
      email: signUpEmailMock
    },
    getSession: getSessionMock
  }
}));

beforeEach(() => {
  navigateToMock.mockReset();
  signUpEmailMock.mockReset();
  getSessionMock.mockReset();
  tMock.mockClear();
});

describe("useSignupForm().submit - name derivation", () => {
  it("derives the name as the local part of the email", async () => {
    signUpEmailMock.mockImplementation(async () => {});

    const { form, submit } = useSignupForm();
    form.email = "jane@example.com";
    form.password = "hunter2";

    await submit();

    expect(signUpEmailMock).toHaveBeenCalledWith(
      { email: "jane@example.com", password: "hunter2", name: "jane" },
      expect.anything()
    );
  });

  it("falls back to the full string when the email has no @", async () => {
    signUpEmailMock.mockImplementation(async () => {});

    const { form, submit } = useSignupForm();
    form.email = "jane";
    form.password = "hunter2";

    await submit();

    // split("@")[0] on "jane" is already "jane", so the `|| form.email`
    // fallback is never actually exercised here - the derived name equals
    // form.email either way. Documenting the actual observed behavior.
    expect(signUpEmailMock).toHaveBeenCalledWith(
      { email: "jane", password: "hunter2", name: "jane" },
      expect.anything()
    );
  });
});

describe("useSignupForm().submit - onError", () => {
  it("sets the 'already registered' message on status 422", async () => {
    signUpEmailMock.mockImplementation(async (_credentials, handlers) => {
      handlers.onError({ error: { status: 422, code: "SOME_OTHER_CODE" } });
    });

    const { submit, errorMessage, pending } = useSignupForm();
    await submit();

    expect(errorMessage.value).toBe("This email is already registered.");
    expect(pending.value).toBe(false);
  });

  it("sets the 'already registered' message on USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL code alone, isolated from status", async () => {
    signUpEmailMock.mockImplementation(async (_credentials, handlers) => {
      handlers.onError({
        error: { status: 400, code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" }
      });
    });

    const { submit, errorMessage } = useSignupForm();
    await submit();

    expect(errorMessage.value).toBe("This email is already registered.");
  });

  it("falls back to a generic message when neither condition is met", async () => {
    signUpEmailMock.mockImplementation(async (_credentials, handlers) => {
      handlers.onError({ error: { status: 500, code: "SOME_OTHER_CODE" } });
    });

    const { submit, errorMessage } = useSignupForm();
    await submit();

    expect(errorMessage.value).toBe("Something went wrong. Please try again.");
  });

  describe("showForgotPasswordLink", () => {
    it("is false initially", () => {
      const { showForgotPasswordLink } = useSignupForm();

      expect(showForgotPasswordLink.value).toBe(false);
    });

    it("becomes true on status 422 (email taken)", async () => {
      signUpEmailMock.mockImplementation(async (_credentials, handlers) => {
        handlers.onError({ error: { status: 422, code: "SOME_OTHER_CODE" } });
      });

      const { submit, showForgotPasswordLink } = useSignupForm();
      await submit();

      expect(showForgotPasswordLink.value).toBe(true);
    });

    it("becomes true on USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL code alone, isolated from status", async () => {
      signUpEmailMock.mockImplementation(async (_credentials, handlers) => {
        handlers.onError({
          error: { status: 400, code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" }
        });
      });

      const { submit, showForgotPasswordLink } = useSignupForm();
      await submit();

      expect(showForgotPasswordLink.value).toBe(true);
    });

    it("stays false when neither condition is met", async () => {
      signUpEmailMock.mockImplementation(async (_credentials, handlers) => {
        handlers.onError({ error: { status: 500, code: "SOME_OTHER_CODE" } });
      });

      const { submit, showForgotPasswordLink } = useSignupForm();
      await submit();

      expect(showForgotPasswordLink.value).toBe(false);
    });

    it("stays false on success", async () => {
      signUpEmailMock.mockImplementation(async (_credentials, handlers) => {
        await handlers.onSuccess();
      });
      getSessionMock.mockResolvedValue({ data: { user: { id: "1" } } });

      const { submit, showForgotPasswordLink } = useSignupForm();
      await submit();

      expect(showForgotPasswordLink.value).toBe(false);
    });

    it("resets to false at the start of a new submit() call", async () => {
      signUpEmailMock.mockImplementationOnce(async (_credentials, handlers) => {
        handlers.onError({ error: { status: 422, code: "SOME_OTHER_CODE" } });
      });

      const { submit, showForgotPasswordLink } = useSignupForm();
      await submit();
      expect(showForgotPasswordLink.value).toBe(true);

      let resolveSecondCall!: () => void;
      signUpEmailMock.mockImplementationOnce(
        () =>
          new Promise<void>(resolve => {
            resolveSecondCall = resolve;
          })
      );

      const submitPromise = submit();
      // Reset happens synchronously at the top of submit(), before the
      // second call settles.
      expect(showForgotPasswordLink.value).toBe(false);

      resolveSecondCall();
      await submitPromise;
    });
  });

  it("sets pending true while in flight and false after settling on error", async () => {
    let resolveSignUp!: () => void;
    signUpEmailMock.mockImplementation(
      (_credentials, handlers) =>
        new Promise<void>(resolve => {
          resolveSignUp = () => {
            handlers.onError({ error: { status: 500, code: "X" } });
            resolve();
          };
        })
    );

    const { submit, pending } = useSignupForm();
    expect(pending.value).toBe(false);

    const submitPromise = submit();
    expect(pending.value).toBe(true);

    resolveSignUp();
    await submitPromise;

    expect(pending.value).toBe(false);
  });
});

describe("useSignupForm().submit - onSuccess", () => {
  it("navigates to / when getSession resolves with truthy data", async () => {
    signUpEmailMock.mockImplementation(async (_credentials, handlers) => {
      await handlers.onSuccess();
    });
    getSessionMock.mockResolvedValue({ data: { user: { id: "1" } } });

    const { submit, errorMessage, pending } = useSignupForm();
    await submit();

    expect(navigateToMock).toHaveBeenCalledWith("/");
    expect(errorMessage.value).toBeNull();
    expect(pending.value).toBe(false);
  });

  it("sets the verify-email message and does not navigate when getSession data is null", async () => {
    signUpEmailMock.mockImplementation(async (_credentials, handlers) => {
      await handlers.onSuccess();
    });
    getSessionMock.mockResolvedValue({ data: null });

    const { submit, errorMessage } = useSignupForm();
    await submit();

    expect(navigateToMock).not.toHaveBeenCalled();
    expect(errorMessage.value).toBe(
      "Signup succeeded, but you need to verify your email before signing in."
    );
  });

  it("sets the verify-email message and does not navigate when getSession resolves undefined", async () => {
    signUpEmailMock.mockImplementation(async (_credentials, handlers) => {
      await handlers.onSuccess();
    });
    getSessionMock.mockResolvedValue(undefined);

    const { submit, errorMessage } = useSignupForm();
    await submit();

    expect(navigateToMock).not.toHaveBeenCalled();
    expect(errorMessage.value).toBe(
      "Signup succeeded, but you need to verify your email before signing in."
    );
  });

  it("sets pending true while in flight and false after settling on success", async () => {
    let resolveSignUp!: () => void;
    signUpEmailMock.mockImplementation(
      (_credentials, handlers) =>
        new Promise<void>(resolve => {
          resolveSignUp = () => {
            getSessionMock.mockResolvedValue({ data: { user: { id: "1" } } });
            void handlers.onSuccess().then(resolve);
          };
        })
    );

    const { submit, pending } = useSignupForm();
    expect(pending.value).toBe(false);

    const submitPromise = submit();
    expect(pending.value).toBe(true);

    resolveSignUp();
    await submitPromise;

    expect(pending.value).toBe(false);
  });
});

describe("useSignupForm().submit - signUp.email rejects", () => {
  it("sets the generic error message and resets pending instead of leaving it stuck", async () => {
    signUpEmailMock.mockImplementation(async () => {
      throw new Error("network down");
    });

    const { submit, pending, errorMessage } = useSignupForm();
    await submit();

    expect(errorMessage.value).toBe("Something went wrong. Please try again.");
    expect(pending.value).toBe(false);
  });

  it("does not overwrite an error message already set by onError before the rejection", async () => {
    signUpEmailMock.mockImplementation(async (_credentials, handlers) => {
      handlers.onError({ error: { status: 422, code: "SOME_OTHER_CODE" } });
      throw new Error("network down");
    });

    const { submit, pending, errorMessage } = useSignupForm();
    await submit();

    expect(errorMessage.value).toBe("This email is already registered.");
    expect(pending.value).toBe(false);
  });
});
