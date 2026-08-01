import { beforeEach, describe, expect, it } from "vitest";

import { resetUseAuthMocks, useAuthGetSessionMock } from "~/shared/testing/mocks/use-auth";

// This import must stay last: ~/shared/testing/mocks/use-auth registers its
// `vi.mock` side effect as it's evaluated. Importing the composable under
// test first would resolve its `useAuth` import against the real
// implementation before the mock is registered.
// eslint-disable-next-line import/order
import { useLandingHero } from "../use-landing-hero";

beforeEach(() => {
  resetUseAuthMocks();
});

describe("useLandingHero", () => {
  it("returns loggedIn: true when a session is present", async () => {
    useAuthGetSessionMock.mockResolvedValue({ data: { user: { id: "1" } } });

    const { loggedIn } = await useLandingHero();

    expect(loggedIn).toBe(true);
  });

  it("returns loggedIn: false when the session data is null", async () => {
    useAuthGetSessionMock.mockResolvedValue({ data: null });

    const { loggedIn } = await useLandingHero();

    expect(loggedIn).toBe(false);
  });

  it("returns loggedIn: false when the session data is undefined", async () => {
    useAuthGetSessionMock.mockResolvedValue({ data: undefined });

    const { loggedIn } = await useLandingHero();

    expect(loggedIn).toBe(false);
  });
});
