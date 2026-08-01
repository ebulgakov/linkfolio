import { beforeEach, describe, expect, it } from "vitest";

import { deferred } from "~/shared/testing/deferred";
import { resetAuthClientMocks, signInEmailMock } from "~/shared/testing/mocks/auth-client";
import { tMock } from "~/shared/testing/mocks/i18n";
import { navigateToMock } from "~/shared/testing/mocks/navigate";
import { resetRouteState, routeState } from "~/shared/testing/mocks/route";

// This import must stay last: the `~/shared/testing/mocks/*` modules above
// register their `vi.mock`/`mockNuxtImport` side effects as they're
// evaluated, in the order their import statements appear. Importing the
// composable under test first would resolve its own `useRoute`/`navigateTo`/
// `useI18n` auto-imports against the real implementations before the mocks
// are registered, so `pnpm lint:fix`/editors must not reorder this.
// eslint-disable-next-line import/order
import { sanitizeRedirect, useLoginForm } from "../use-login-form";

beforeEach(() => {
  resetRouteState();
  navigateToMock.mockReset();
  resetAuthClientMocks();
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
    expect(sanitizeRedirect("//evil.com/phish")).toBe("/collections");
  });

  it("rejects a cross-origin absolute URL", () => {
    expect(sanitizeRedirect("https://evil.com/phish")).toBe("/collections");
  });

  it("rejects a javascript: scheme without throwing", () => {
    expect(sanitizeRedirect("javascript:alert(1)")).toBe("/collections");
  });

  it("falls back to /collections for a malformed URL that throws during parsing", () => {
    expect(sanitizeRedirect("http://")).toBe("/collections");
  });

  it("falls back to /collections for an empty string", () => {
    expect(sanitizeRedirect("")).toBe("/collections");
  });

  it.each([null, undefined, 123, {}, []])(
    "falls back to /collections for non-string input %j",
    value => {
      expect(sanitizeRedirect(value)).toBe("/collections");
    }
  );
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

    expect(navigateToMock).toHaveBeenCalledWith("/collections");
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

  describe("showForgotPasswordLink", () => {
    it("is false initially", () => {
      const { showForgotPasswordLink } = useLoginForm();

      expect(showForgotPasswordLink.value).toBe(false);
    });

    it("becomes true after a 401 error", async () => {
      signInEmailMock.mockImplementation(async (_credentials, handlers) => {
        handlers.onError({ error: { status: 401 } });
      });

      const { submit, showForgotPasswordLink } = useLoginForm();
      await submit();

      expect(showForgotPasswordLink.value).toBe(true);
    });

    it("stays false after a 403 error", async () => {
      signInEmailMock.mockImplementation(async (_credentials, handlers) => {
        handlers.onError({ error: { status: 403 } });
      });

      const { submit, showForgotPasswordLink } = useLoginForm();
      await submit();

      expect(showForgotPasswordLink.value).toBe(false);
    });

    it("stays false on success", async () => {
      signInEmailMock.mockImplementation(async (_credentials, handlers) => {
        await handlers.onSuccess();
      });

      const { submit, showForgotPasswordLink } = useLoginForm();
      await submit();

      expect(showForgotPasswordLink.value).toBe(false);
    });

    it("resets to false at the start of a new submit() call", async () => {
      signInEmailMock.mockImplementationOnce(async (_credentials, handlers) => {
        handlers.onError({ error: { status: 401 } });
      });

      const { submit, showForgotPasswordLink } = useLoginForm();
      await submit();
      expect(showForgotPasswordLink.value).toBe(true);

      const { promise, resolve } = deferred();
      signInEmailMock.mockImplementationOnce(() => promise);

      const submitPromise = submit();
      // Reset happens synchronously at the top of submit(), before the
      // second call settles.
      expect(showForgotPasswordLink.value).toBe(false);

      resolve();
      await submitPromise;
    });
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
    const { promise, resolve } = deferred();
    signInEmailMock.mockImplementation(() => promise);

    const { submit, pending } = useLoginForm();
    expect(pending.value).toBe(false);

    const submitPromise = submit();
    expect(pending.value).toBe(true);

    resolve();
    await submitPromise;

    expect(pending.value).toBe(false);
  });
});
