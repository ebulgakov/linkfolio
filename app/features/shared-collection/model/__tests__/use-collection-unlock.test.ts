import { beforeEach, describe, expect, it } from "vitest";
import { effectScope } from "vue";

import type { SharedLinkItem } from "~/shared/api";

import { deferred } from "~/shared/testing/deferred";
import { tMock } from "~/shared/testing/mocks/i18n";
import {
  resetSharedCollectionsApiMocks,
  unlockSharedCollectionMock
} from "~/shared/testing/mocks/shared-collections-api";

// This import must stay last: the `~/shared/testing/mocks/*` modules above
// register their `vi.mock`/`mockNuxtImport` side effects as they're
// evaluated, in the order their import statements appear. Importing the
// composable under test first would resolve its own `~/shared/api`/`useI18n`
// auto-imports against the real implementations before the mocks are
// registered, so `pnpm lint:fix`/editors must not reorder this.
// eslint-disable-next-line import/order
import { useCollectionUnlock } from "../use-collection-unlock";

function withEffectScope<T>(setup: () => T): T {
  return effectScope().run(setup)!;
}

const INCORRECT_PASSWORD_MESSAGE = tMock("sharedCollection.passwordPrompt.incorrect");

const links: SharedLinkItem[] = [
  { id: "link-1", url: "https://example.com", title: "Example", description: null, imageUrl: null }
];

beforeEach(() => {
  resetSharedCollectionsApiMocks();
  tMock.mockClear();
});

describe("useCollectionUnlock", () => {
  it("submits the entered password and returns the links on success", async () => {
    unlockSharedCollectionMock.mockResolvedValue(links);

    const { password, submit, errorMessage } = withEffectScope(() =>
      useCollectionUnlock("my-slug")
    );
    password.value = "correct-horse";

    const result = await submit();

    expect(unlockSharedCollectionMock).toHaveBeenCalledWith("my-slug", "correct-horse");
    expect(result).toBe(links);
    expect(errorMessage.value).toBeNull();
  });

  it("sets an error message and returns null on a rejected (incorrect password) attempt", async () => {
    unlockSharedCollectionMock.mockRejectedValue({
      data: { statusCode: 403, statusMessage: "Incorrect Password" }
    });

    const { password, submit, errorMessage } = withEffectScope(() =>
      useCollectionUnlock("my-slug")
    );
    password.value = "wrong-guess";

    const result = await submit();

    expect(result).toBeNull();
    expect(errorMessage.value).toBe(INCORRECT_PASSWORD_MESSAGE);
  });

  it("toggles pending true -> false around an in-flight submit", async () => {
    const { promise, resolve } = deferred<SharedLinkItem[]>();
    unlockSharedCollectionMock.mockReturnValue(promise);

    const { pending, submit } = withEffectScope(() => useCollectionUnlock("my-slug"));
    expect(pending.value).toBe(false);

    const submitPromise = submit();
    expect(pending.value).toBe(true);

    resolve(links);
    await submitPromise;
    expect(pending.value).toBe(false);
  });

  it("allows retrying after a failed attempt, with no cap on the number of tries", async () => {
    unlockSharedCollectionMock.mockRejectedValueOnce({
      data: { statusCode: 403, statusMessage: "Incorrect Password" }
    });
    unlockSharedCollectionMock.mockRejectedValueOnce({
      data: { statusCode: 403, statusMessage: "Incorrect Password" }
    });
    unlockSharedCollectionMock.mockResolvedValueOnce(links);

    const { password, submit, errorMessage } = withEffectScope(() =>
      useCollectionUnlock("my-slug")
    );

    password.value = "wrong-1";
    expect(await submit()).toBeNull();
    expect(errorMessage.value).toBe(INCORRECT_PASSWORD_MESSAGE);

    password.value = "wrong-2";
    expect(await submit()).toBeNull();
    expect(errorMessage.value).toBe(INCORRECT_PASSWORD_MESSAGE);

    password.value = "correct-horse";
    const result = await submit();

    expect(result).toBe(links);
    expect(errorMessage.value).toBeNull();
    expect(unlockSharedCollectionMock).toHaveBeenCalledTimes(3);
  });

  it("ignores a second submit() while the first is still pending, calling the API exactly once", async () => {
    const { promise, resolve } = deferred<SharedLinkItem[]>();
    unlockSharedCollectionMock.mockReturnValue(promise);

    const { submit } = withEffectScope(() => useCollectionUnlock("my-slug"));

    const first = submit();
    const second = submit();

    resolve(links);
    await Promise.all([first, second]);

    expect(unlockSharedCollectionMock).toHaveBeenCalledTimes(1);
  });
});
