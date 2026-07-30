import { beforeEach, describe, expect, it } from "vitest";

import { deferred } from "~/shared/testing/deferred";
import {
  getSessionMock,
  resetAuthClientMocks,
  signUpEmailMock
} from "~/shared/testing/mocks/auth-client";
import { tMock } from "~/shared/testing/mocks/i18n";
import { navigateToMock } from "~/shared/testing/mocks/navigate";

// This import must stay last: the `~/shared/testing/mocks/*` modules above
// register their `vi.mock`/`mockNuxtImport` side effects as they're
// evaluated, in the order their import statements appear. Importing the
// composable under test first would resolve its own `navigateTo`/`useI18n`
// auto-imports against the real implementations before the mocks are
// registered, so `pnpm lint:fix`/editors must not reorder this.
// eslint-disable-next-line import/order
import { useSignupForm } from "../use-signup-form";

beforeEach(() => {
  navigateToMock.mockReset();
  resetAuthClientMocks();
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

      const { promise, resolve } = deferred();
      signUpEmailMock.mockImplementationOnce(() => promise);

      const submitPromise = submit();
      // Reset happens synchronously at the top of submit(), before the
      // second call settles.
      expect(showForgotPasswordLink.value).toBe(false);

      resolve();
      await submitPromise;
    });
  });

  it("sets pending true while in flight and false after settling on error", async () => {
    const { promise, resolve } = deferred();
    signUpEmailMock.mockImplementation((_credentials, handlers) =>
      promise.then(() => handlers.onError({ error: { status: 500, code: "X" } }))
    );

    const { submit, pending } = useSignupForm();
    expect(pending.value).toBe(false);

    const submitPromise = submit();
    expect(pending.value).toBe(true);

    resolve();
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
    const { promise, resolve } = deferred();
    signUpEmailMock.mockImplementation((_credentials, handlers) =>
      promise.then(() => {
        getSessionMock.mockResolvedValue({ data: { user: { id: "1" } } });
        return handlers.onSuccess();
      })
    );

    const { submit, pending } = useSignupForm();
    expect(pending.value).toBe(false);

    const submitPromise = submit();
    expect(pending.value).toBe(true);

    resolve();
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
