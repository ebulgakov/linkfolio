import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSignupForm } from "../useSignupForm";

const navigateToMock = vi.hoisted(() => vi.fn());

mockNuxtImport("navigateTo", () => navigateToMock);

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

describe("useSignupForm().submit - missing try/catch (documented bug)", () => {
  it("BUG: pending stays true forever when signUp.email itself rejects, since there is no try/catch/finally", async () => {
    signUpEmailMock.mockImplementation(async () => {
      throw new Error("network down");
    });

    const { submit, pending, errorMessage } = useSignupForm();

    // submit() has no try/catch around authClient.signUp.email, so a
    // rejected call propagates out of submit() itself rather than being
    // routed through onError. Wrap the await so this test documents the
    // current behavior instead of failing on the unhandled rejection.
    await expect(submit()).rejects.toThrow("network down");

    expect(pending.value).toBe(true);
    expect(errorMessage.value).toBeNull();
  });
});
