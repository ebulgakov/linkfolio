import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick } from "vue";

import type { Collection } from "~/shared/api";

import { deferred } from "~/shared/testing/deferred";
import {
  checkSlugAvailabilityMock,
  createCollectionMock,
  resetCollectionsApiMocks,
  updateCollectionMock
} from "~/shared/testing/mocks/collections-api";
import { tMock } from "~/shared/testing/mocks/i18n";
import { navigateToMock } from "~/shared/testing/mocks/navigate";

// This import must stay last: the `~/shared/testing/mocks/*` modules above
// register their `vi.mock`/`mockNuxtImport` side effects as they're
// evaluated, in the order their import statements appear. Importing the
// composable under test first would resolve its own
// `~/shared/api/collections`/`navigateTo`/`useI18n` auto-imports against the
// real implementations before the mocks are registered, so `pnpm lint:fix`/
// editors must not reorder this.
// eslint-disable-next-line import/order
import { useCollectionForm } from "../use-collection-form";

function makeCollection(overrides: Partial<Collection> = {}): Collection {
  return {
    id: "collection-1",
    userId: "user-1",
    name: "My Collection",
    description: null,
    shared: false,
    slug: "my-collection",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...overrides
  };
}

// useCollectionForm() calls onScopeDispose() (to clear its debounce timer on
// teardown), which warns if invoked with no active Vue effect scope - which
// is exactly what happens when a composable is called directly from a plain
// test function rather than a component's setup(). Running it inside a real
// effectScope() satisfies that requirement and keeps test output clean; the
// scope is deliberately never stopped since these tests don't exercise
// unmount/teardown behavior.
function withEffectScope<T>(setup: () => T): T {
  return effectScope().run(setup)!;
}

const GENERIC_ERROR = "Something went wrong. Please try again.";

// Realistic shape of a thrown ofetch/h3 error for a 23505 (unique violation)
// mapped to a field error server-side, per app/shared/api/collections.ts's
// `extractFieldErrors` doc comment.
const slugCollisionError = {
  data: {
    statusCode: 400,
    statusMessage: "Validation Error",
    stack: [],
    data: { fieldErrors: { slug: ["This slug is already taken."] } }
  }
};

beforeEach(() => {
  vi.useFakeTimers();
  navigateToMock.mockReset();
  resetCollectionsApiMocks();
  tMock.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useCollectionForm - create vs edit mode", () => {
  it("create mode: initializes an empty form and reflects create mode", () => {
    const { form, mode, isEditing } = withEffectScope(() => useCollectionForm());

    expect(form).toEqual({ name: "", description: "", shared: false, slug: "" });
    expect(mode).toBe("create");
    expect(isEditing).toBe(false);
  });

  it("edit mode: initializes the form from the existing collection and reflects edit mode", () => {
    const existing = makeCollection({
      name: "My List",
      description: "desc",
      shared: true,
      slug: "my-list"
    });

    const { form, mode, isEditing } = withEffectScope(() => useCollectionForm(existing));

    expect(form).toEqual({ name: "My List", description: "desc", shared: true, slug: "my-list" });
    expect(mode).toBe("edit");
    expect(isEditing).toBe(true);
  });
});

describe("useCollectionForm - slugify-until-dirty", () => {
  it("auto-populates slug from name while the user hasn't touched slug directly", async () => {
    const { form } = withEffectScope(() => useCollectionForm());

    form.name = "Hello World";
    await nextTick();
    expect(form.slug).toBe("hello-world");

    form.name = "Hello World Two";
    await nextTick();
    expect(form.slug).toBe("hello-world-two");
  });

  it("stops auto-sync once onSlugInput is called, even after further name changes", async () => {
    const { form, onSlugInput } = withEffectScope(() => useCollectionForm());

    form.name = "Hello World";
    await nextTick();
    expect(form.slug).toBe("hello-world");

    onSlugInput("custom-slug");
    expect(form.slug).toBe("custom-slug");

    form.name = "Another Name";
    await nextTick();
    expect(form.slug).toBe("custom-slug");
  });

  it("edit mode: auto-sync is off from the start - slug starts as the existing slug and stays put on name changes", async () => {
    const existing = makeCollection({ name: "Old Name", slug: "old-slug" });
    const { form } = withEffectScope(() => useCollectionForm(existing));

    expect(form.slug).toBe("old-slug");

    form.name = "New Name";
    await nextTick();
    expect(form.slug).toBe("old-slug");
  });
});

describe("useCollectionForm - debounced slug availability check", () => {
  it("transitions checking -> free on an available slug, after the debounce delay", async () => {
    const { promise, resolve } = deferred<{ available: boolean }>();
    checkSlugAvailabilityMock.mockReturnValue(promise);

    const { onSlugInput, slugStatus } = withEffectScope(() => useCollectionForm());

    onSlugInput("free-slug");
    await nextTick();
    expect(slugStatus.value).toBe("checking");
    expect(checkSlugAvailabilityMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(400);
    expect(checkSlugAvailabilityMock).toHaveBeenCalledWith("free-slug", undefined);

    resolve({ available: true });
    await promise;
    expect(slugStatus.value).toBe("free");
  });

  it("transitions checking -> taken on an unavailable slug, after the debounce delay", async () => {
    const { promise, resolve } = deferred<{ available: boolean }>();
    checkSlugAvailabilityMock.mockReturnValue(promise);

    const { onSlugInput, slugStatus } = withEffectScope(() => useCollectionForm());

    onSlugInput("taken-slug");
    await nextTick();
    await vi.advanceTimersByTimeAsync(400);

    resolve({ available: false });
    await promise;
    expect(slugStatus.value).toBe("taken");
  });

  it("does not fire a network call for an invalid-format slug, and the status is 'invalid' (not 'idle')", async () => {
    const { onSlugInput, slugStatus } = withEffectScope(() => useCollectionForm());

    onSlugInput("ab"); // shorter than the 3-char minimum
    await nextTick();
    expect(slugStatus.value).toBe("invalid");

    await vi.advanceTimersByTimeAsync(1000);
    expect(checkSlugAvailabilityMock).not.toHaveBeenCalled();
  });

  it("discards a stale response when a newer slug check supersedes it (out-of-order guard)", async () => {
    const first = deferred<{ available: boolean }>();
    const second = deferred<{ available: boolean }>();
    checkSlugAvailabilityMock
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);

    const { onSlugInput, slugStatus } = withEffectScope(() => useCollectionForm());

    onSlugInput("first-slug");
    await nextTick();
    await vi.advanceTimersByTimeAsync(400);
    expect(checkSlugAvailabilityMock).toHaveBeenCalledTimes(1);

    onSlugInput("second-slug");
    await nextTick();
    await vi.advanceTimersByTimeAsync(400);
    expect(checkSlugAvailabilityMock).toHaveBeenCalledTimes(2);

    // Resolve the FIRST (now-superseded) request as available - it must be
    // discarded, not applied.
    first.resolve({ available: true });
    await first.promise;
    expect(slugStatus.value).not.toBe("free");
    expect(slugStatus.value).toBe("checking");

    // Resolve the SECOND (current) request as unavailable - it must win.
    second.resolve({ available: false });
    await second.promise;
    expect(slugStatus.value).toBe("taken");
  });
});

describe("useCollectionForm - edit mode's own-slug skip", () => {
  it("starts at 'free' with no network call, and returns to 'free' with no call when the slug is set back to its own value", async () => {
    const existing = makeCollection({ slug: "my-collection" });
    const { onSlugInput, slugStatus } = withEffectScope(() => useCollectionForm(existing));

    expect(slugStatus.value).toBe("free");
    expect(checkSlugAvailabilityMock).not.toHaveBeenCalled();

    onSlugInput("something-else");
    await nextTick();
    expect(slugStatus.value).toBe("checking");

    onSlugInput("my-collection");
    await nextTick();
    expect(slugStatus.value).toBe("free");

    // The pending debounce timer for "something-else" must have been
    // cleared by the early-return branch - advancing past it must not fire
    // a network call.
    await vi.advanceTimersByTimeAsync(1000);
    expect(checkSlugAvailabilityMock).not.toHaveBeenCalled();
  });
});

describe("useCollectionForm - submit: 23505 field-error mapping", () => {
  it("create: maps a slug-collision error to errors.slug instead of a generic message", async () => {
    createCollectionMock.mockRejectedValue(slugCollisionError);

    const { form, errors, errorMessage, submit } = withEffectScope(() => useCollectionForm());
    form.name = "Test Collection";

    await submit();

    expect(createCollectionMock).toHaveBeenCalledTimes(1);
    expect(errors.value).toEqual({ slug: ["This slug is already taken."] });
    expect(errorMessage.value).toBeNull();
  });

  it("edit: maps a slug-collision error to errors.slug instead of a generic message", async () => {
    const existing = makeCollection();
    updateCollectionMock.mockRejectedValue(slugCollisionError);

    const { errors, errorMessage, submit } = withEffectScope(() => useCollectionForm(existing));

    await submit();

    expect(updateCollectionMock).toHaveBeenCalledTimes(1);
    expect(errors.value).toEqual({ slug: ["This slug is already taken."] });
    expect(errorMessage.value).toBeNull();
  });

  it("falls back to the generic error message for a rejection that isn't in the fieldErrors shape (plain Error)", async () => {
    createCollectionMock.mockRejectedValue(new Error("network down"));

    const { errors, errorMessage, submit } = withEffectScope(() => useCollectionForm());
    await submit();

    expect(errorMessage.value).toBe(GENERIC_ERROR);
    expect(errors.value).toEqual({});
  });

  it("falls back to the generic error message for a 401-shaped rejection (no .data.data.fieldErrors)", async () => {
    createCollectionMock.mockRejectedValue({
      data: { statusCode: 401, statusMessage: "Unauthorized" }
    });

    const { errorMessage, submit } = withEffectScope(() => useCollectionForm());
    await submit();

    expect(errorMessage.value).toBe(GENERIC_ERROR);
  });
});

describe("useCollectionForm - shared-link-change confirmation gate", () => {
  it("blocks submit and shows the warning when a shared collection's slug changes", async () => {
    const existing = makeCollection({ shared: true, slug: "old-slug" });
    const { onSlugInput, submit, showShareWarning } = withEffectScope(() =>
      useCollectionForm(existing)
    );

    onSlugInput("new-slug");
    await submit();

    expect(updateCollectionMock).not.toHaveBeenCalled();
    expect(showShareWarning.value).toBe(true);
  });

  it("confirmAndSubmit proceeds with the update after the warning is shown", async () => {
    const existing = makeCollection({ shared: true, slug: "old-slug" });
    updateCollectionMock.mockResolvedValue({ ...existing, slug: "new-slug" });

    const { onSlugInput, submit, confirmAndSubmit, showShareWarning } = withEffectScope(() =>
      useCollectionForm(existing)
    );

    onSlugInput("new-slug");
    await submit();
    expect(showShareWarning.value).toBe(true);
    expect(updateCollectionMock).not.toHaveBeenCalled();

    await confirmAndSubmit();

    expect(updateCollectionMock).toHaveBeenCalledTimes(1);
    expect(showShareWarning.value).toBe(false);
  });

  it("submits immediately with no warning when shared but the slug is unchanged", async () => {
    const existing = makeCollection({ shared: true, slug: "old-slug" });
    updateCollectionMock.mockResolvedValue(existing);

    const { submit, showShareWarning } = withEffectScope(() => useCollectionForm(existing));
    await submit();

    expect(updateCollectionMock).toHaveBeenCalledTimes(1);
    expect(showShareWarning.value).toBe(false);
  });

  it("submits immediately with no warning when the slug changes but the collection isn't shared", async () => {
    const existing = makeCollection({ shared: false, slug: "old-slug" });
    updateCollectionMock.mockResolvedValue({ ...existing, slug: "new-slug" });

    const { onSlugInput, submit, showShareWarning } = withEffectScope(() =>
      useCollectionForm(existing)
    );
    onSlugInput("new-slug");
    await submit();

    expect(updateCollectionMock).toHaveBeenCalledTimes(1);
    expect(showShareWarning.value).toBe(false);
  });

  it("cancelShareWarning resets the flag without submitting", async () => {
    const existing = makeCollection({ shared: true, slug: "old-slug" });
    const { onSlugInput, submit, cancelShareWarning, showShareWarning } = withEffectScope(() =>
      useCollectionForm(existing)
    );

    onSlugInput("new-slug");
    await submit();
    expect(showShareWarning.value).toBe(true);

    cancelShareWarning();

    expect(showShareWarning.value).toBe(false);
    expect(updateCollectionMock).not.toHaveBeenCalled();
  });
});

describe("useCollectionForm - submitDisabled", () => {
  it("is false by default (idle slug status, not pending)", () => {
    const { submitDisabled } = withEffectScope(() => useCollectionForm());

    expect(submitDisabled.value).toBe(false);
  });

  it("is true while the slug check is in flight, and false once it resolves free", async () => {
    const { promise, resolve } = deferred<{ available: boolean }>();
    checkSlugAvailabilityMock.mockReturnValue(promise);

    const { onSlugInput, submitDisabled } = withEffectScope(() => useCollectionForm());
    onSlugInput("checking-slug");
    await nextTick();
    await vi.advanceTimersByTimeAsync(400);
    expect(submitDisabled.value).toBe(true);

    resolve({ available: true });
    await promise;
    expect(submitDisabled.value).toBe(false);
  });

  it("stays true when the slug resolves taken", async () => {
    const { promise, resolve } = deferred<{ available: boolean }>();
    checkSlugAvailabilityMock.mockReturnValue(promise);

    const { onSlugInput, submitDisabled } = withEffectScope(() => useCollectionForm());
    onSlugInput("taken-slug");
    await nextTick();
    await vi.advanceTimersByTimeAsync(400);

    resolve({ available: false });
    await promise;
    expect(submitDisabled.value).toBe(true);
  });

  it("is false for an invalid-format slug (not included in the disable list)", async () => {
    const { onSlugInput, submitDisabled } = withEffectScope(() => useCollectionForm());

    onSlugInput("ab");
    await nextTick();
    expect(submitDisabled.value).toBe(false);
  });

  it("is true while a submit is pending, regardless of slug status", async () => {
    const { promise, resolve } = deferred<Collection>();
    createCollectionMock.mockReturnValue(promise);

    const { submit, submitDisabled } = withEffectScope(() => useCollectionForm());
    expect(submitDisabled.value).toBe(false);

    const submitPromise = submit();
    expect(submitDisabled.value).toBe(true);

    resolve(makeCollection());
    await submitPromise;
    expect(submitDisabled.value).toBe(false);
  });
});

describe("useCollectionForm - on success", () => {
  it("navigates to /collections after a successful create", async () => {
    createCollectionMock.mockResolvedValue(makeCollection());

    const { form, submit } = withEffectScope(() => useCollectionForm());
    form.name = "New Collection";
    await submit();

    expect(navigateToMock).toHaveBeenCalledWith("/collections");
  });

  it("navigates to /collections after a successful edit", async () => {
    const existing = makeCollection();
    updateCollectionMock.mockResolvedValue(existing);

    const { submit } = withEffectScope(() => useCollectionForm(existing));
    await submit();

    expect(navigateToMock).toHaveBeenCalledWith("/collections");
  });
});
