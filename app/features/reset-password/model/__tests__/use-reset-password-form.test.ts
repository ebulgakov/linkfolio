import { beforeEach, describe, expect, it } from "vitest";

import { deferred } from "~/shared/testing/deferred";
import { resetAuthClientMocks, resetPasswordMock } from "~/shared/testing/mocks/auth-client";
import { tMock } from "~/shared/testing/mocks/i18n";
import { resetRouteState, routeState } from "~/shared/testing/mocks/route";

// This import must stay last: the `~/shared/testing/mocks/*` modules above
// register their `vi.mock`/`mockNuxtImport` side effects as they're
// evaluated, in the order their import statements appear. Importing the
// composable under test first would resolve its own `useRoute`/`useI18n`
// auto-imports against the real implementations before the mocks are
// registered, so `pnpm lint:fix`/editors must not reorder this.
// eslint-disable-next-line import/order
import { useResetPasswordForm } from "../use-reset-password-form";

beforeEach(() => {
  resetRouteState();
  resetAuthClientMocks();
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

    const { promise, resolve } = deferred();
    resetPasswordMock.mockImplementationOnce(() => promise);

    const submitPromise = submit();
    // Reset happens synchronously at the top of submit(), before the second
    // call settles.
    expect(errorMessage.value).toBeNull();
    expect(success.value).toBe(false);

    resolve();
    await submitPromise;
  });

  it("sets pending true while the request is in flight and false once it settles", async () => {
    const { promise, resolve } = deferred();
    resetPasswordMock.mockImplementation(() => promise);

    const { submit, pending } = useResetPasswordForm();
    expect(pending.value).toBe(false);

    const submitPromise = submit();
    expect(pending.value).toBe(true);

    resolve();
    await submitPromise;

    expect(pending.value).toBe(false);
  });

  it("sets pending false after the call throws", async () => {
    const { promise, reject } = deferred();
    resetPasswordMock.mockImplementation(() => promise);

    const { submit, pending } = useResetPasswordForm();
    const submitPromise = submit();
    expect(pending.value).toBe(true);

    reject(new Error("network down"));
    await submitPromise;

    expect(pending.value).toBe(false);
  });
});
