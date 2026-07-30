import { beforeEach, describe, expect, it } from "vitest";

import { deferred } from "~/shared/testing/deferred";
import { requestPasswordResetMock, resetAuthClientMocks } from "~/shared/testing/mocks/auth-client";
import { tMock } from "~/shared/testing/mocks/i18n";

// This import must stay last: the `~/shared/testing/mocks/*` modules above
// register their `vi.mock`/`mockNuxtImport` side effects as they're
// evaluated, in the order their import statements appear. Importing the
// composable under test first would resolve its own `useI18n` auto-import
// against the real implementation before the mocks are registered, so
// `pnpm lint:fix`/editors must not reorder this.
// eslint-disable-next-line import/order
import { useForgotPasswordForm } from "../useForgotPasswordForm";

beforeEach(() => {
  resetAuthClientMocks();
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

    const { promise, resolve } = deferred();
    requestPasswordResetMock.mockImplementationOnce(() => promise);

    const submitPromise = submit();
    // Reset happens synchronously at the top of submit(), before the second
    // call settles.
    expect(errorMessage.value).toBeNull();
    expect(submitted.value).toBe(false);

    resolve();
    await submitPromise;
  });

  it("sets pending true while the request is in flight and false once it settles", async () => {
    const { promise, resolve } = deferred();
    requestPasswordResetMock.mockImplementation(() => promise);

    const { submit, pending } = useForgotPasswordForm();
    expect(pending.value).toBe(false);

    const submitPromise = submit();
    expect(pending.value).toBe(true);

    resolve();
    await submitPromise;

    expect(pending.value).toBe(false);
  });

  it("sets pending false after settling on error", async () => {
    const { promise, resolve } = deferred();
    requestPasswordResetMock.mockImplementation((_payload, handlers) =>
      promise.then(() => handlers.onError({ error: { status: 500 } }))
    );

    const { submit, pending } = useForgotPasswordForm();
    const submitPromise = submit();
    expect(pending.value).toBe(true);

    resolve();
    await submitPromise;

    expect(pending.value).toBe(false);
  });

  it("sets pending false after the call throws", async () => {
    const { promise, reject } = deferred();
    requestPasswordResetMock.mockImplementation(() => promise);

    const { submit, pending } = useForgotPasswordForm();
    const submitPromise = submit();
    expect(pending.value).toBe(true);

    reject(new Error("network down"));
    await submitPromise;

    expect(pending.value).toBe(false);
  });
});
