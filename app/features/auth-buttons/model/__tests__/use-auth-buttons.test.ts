import { beforeEach, describe, expect, it } from "vitest";
import { ref } from "vue";

import { routerPushMock } from "./router-mock";

import { refreshNuxtDataMock } from "~/shared/testing/mocks/refresh-nuxt-data";
import { resetUseAuthMocks, useAuthSignOutMock } from "~/shared/testing/mocks/use-auth";
import { resetUseAuthSessionMocks, useAuthSessionMock } from "~/shared/testing/mocks/use-session";

// This import must stay last: the mocks above (including ./router-mock)
// register their vi.mock/mockNuxtImport side effects as they're evaluated,
// in the order their import statements appear. Importing the composable
// under test first would resolve its own useAuth/useAuthSession/useRouter
// imports against the real implementations before the mocks are registered,
// so pnpm lint:fix/editors must not reorder this.
// eslint-disable-next-line import/order
import { useAuthButtons } from "../use-auth-buttons";

beforeEach(() => {
  resetUseAuthSessionMocks();
  resetUseAuthMocks();
  refreshNuxtDataMock.mockReset();
  routerPushMock.mockReset();
  useAuthSessionMock.mockResolvedValue({ session: ref({ user: { id: "1" } }) });
});

describe("useAuthButtons", () => {
  it("returns the session resolved by useAuthSession", async () => {
    const sessionRef = ref({ user: { id: "1" } });
    useAuthSessionMock.mockResolvedValue({ session: sessionRef });

    const { session } = await useAuthButtons();

    expect(session).toBe(sessionRef);
  });

  it("goToLogin navigates to /login", async () => {
    const { goToLogin } = await useAuthButtons();

    goToLogin();

    expect(routerPushMock).toHaveBeenCalledWith("/login");
  });

  it("goToSignup navigates to /signup", async () => {
    const { goToSignup } = await useAuthButtons();

    goToSignup();

    expect(routerPushMock).toHaveBeenCalledWith("/signup");
  });

  it("logOut refreshes the auth session and redirects to /login, in that order, on a successful sign-out", async () => {
    // signOut only drives the redirect through fetchOptions.onSuccess - the
    // mock must actually invoke it, or refreshNuxtData/router.push never
    // fire and this branch goes untested.
    useAuthSignOutMock.mockImplementation(async ({ fetchOptions }) => {
      await fetchOptions.onSuccess();
    });

    const { logOut } = await useAuthButtons();
    await logOut();

    expect(refreshNuxtDataMock).toHaveBeenCalledWith("auth-session");
    expect(routerPushMock).toHaveBeenCalledWith("/login");
    const [refreshOrder] = refreshNuxtDataMock.mock.invocationCallOrder;
    const [pushOrder] = routerPushMock.mock.invocationCallOrder;
    expect(refreshOrder).toBeDefined();
    expect(pushOrder).toBeDefined();
    expect(refreshOrder).toBeLessThan(pushOrder as number);
  });

  it("logOut does not redirect when signOut never invokes onSuccess", async () => {
    useAuthSignOutMock.mockResolvedValue(undefined);

    const { logOut } = await useAuthButtons();
    await logOut();

    expect(refreshNuxtDataMock).not.toHaveBeenCalled();
    expect(routerPushMock).not.toHaveBeenCalled();
  });
});
