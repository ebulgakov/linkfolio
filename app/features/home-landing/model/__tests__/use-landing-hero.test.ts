import { beforeEach, describe, expect, it } from "vitest";
import { ref } from "vue";

import { resetUseAuthSessionMocks, useAuthSessionMock } from "~/shared/testing/mocks/use-session";

// This import must stay last: ~/shared/testing/mocks/use-session registers its
// `vi.mock` side effect as it's evaluated. Importing the composable under
// test first would resolve its `useAuthSession` import against the real
// implementation before the mock is registered.
// eslint-disable-next-line import/order
import { useLandingHero } from "../use-landing-hero";

beforeEach(() => {
  resetUseAuthSessionMocks();
});

describe("useLandingHero", () => {
  it("returns loggedIn: true when a session is present", async () => {
    useAuthSessionMock.mockResolvedValue({ session: ref({ user: { id: "1" } }) });

    const { loggedIn } = await useLandingHero();

    expect(loggedIn).toBe(true);
  });

  it("returns loggedIn: false when the session data is null", async () => {
    useAuthSessionMock.mockResolvedValue({ session: ref(null) });

    const { loggedIn } = await useLandingHero();

    expect(loggedIn).toBe(false);
  });

  it("returns loggedIn: false when the session data is undefined", async () => {
    useAuthSessionMock.mockResolvedValue({ session: ref(undefined) });

    const { loggedIn } = await useLandingHero();

    expect(loggedIn).toBe(false);
  });
});
