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

// Derived from the mock itself (which resolves against the real
// i18n/locales/en.json via a lazy readFileSync lookup - see
// app/shared/testing/mocks/i18n.ts) rather than hardcoded, so this constant
// can't silently drift out of sync with the actual translation. Called once
// here at module-eval time, before any `beforeEach` runs - the
// `tMock.mockClear()` in `beforeEach` below resets call history before every
// test starts, so this call never counts toward a test's own assertions.
const GENERIC_ERROR = tMock("errors.generic");

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
  // Default so a test that changes the slug but never sets up its own
  // implementation still has something to resolve if its debounce timer is
  // ever advanced - keeps `checkSlugAvailability(...).then(...)` from
  // blowing up on `undefined` rather than the test's own assertions.
  checkSlugAvailabilityMock.mockResolvedValue({ available: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useCollectionForm - create vs edit mode", () => {
  it("create mode: initializes an empty form and reflects create mode", () => {
    const { form, mode, isEditing, slugStatus } = withEffectScope(() => useCollectionForm());

    expect(form).toEqual({ name: "", description: "", shared: false, slug: "" });
    expect(mode).toBe("create");
    expect(isEditing).toBe(false);
    // Distinct from edit mode's own-slug skip, which starts at 'free' - and
    // distinct from 'invalid', which the empty starting slug would also
    // technically qualify for since it fails the format check. 'idle' is
    // only ever set here, in the ref initializer, never by scheduleSlugCheck.
    expect(slugStatus.value).toBe("idle");
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

  it("truncates the auto-synced slug to 64 chars when the slugified name is longer (cut lands mid-word)", async () => {
    const { form } = withEffectScope(() => useCollectionForm());

    // "alpha" x11 joined by spaces slugifies (pre-truncation) to a 65-char
    // string: 10 full "alpha-" blocks (60 chars) plus the first 4 chars of
    // an 11th "alpha" landing at the 64-char cutoff - "alph", not a full
    // word and not a hyphen. Verified with a standalone reproduction of
    // slugify() before writing this assertion, not guessed.
    form.name = Array(11).fill("alpha").join(" ");
    await nextTick();

    expect(form.slug).toBe("alpha-alpha-alpha-alpha-alpha-alpha-alpha-alpha-alpha-alpha-alph");
    expect(form.slug.length).toBe(64);
  });

  it("strips a trailing hyphen left by the 64-char slice, when the cut lands right after a hyphen", async () => {
    const { form } = withEffectScope(() => useCollectionForm());

    // "abc" x17 joined by spaces slugifies (pre-truncation) to a 67-char
    // string of 17 "abc" segments joined by hyphens. 16 full "abc-" blocks
    // are exactly 64 chars (4 chars each), so slice(0, 64) cuts right after
    // the 16th block's trailing hyphen, and the 17th "abc" is dropped
    // entirely - exercising the `.replace(/-+$/g, "")` cleanup after the
    // slice, not just the slice itself. Verified with a standalone
    // reproduction of slugify() before writing this assertion.
    form.name = Array(17).fill("abc").join(" ");
    await nextTick();

    const expectedSlug = Array(16).fill("abc").join("-");
    expect(form.slug).toBe(expectedSlug);
    expect(form.slug.length).toBe(63);
    expect(form.slug.endsWith("-")).toBe(false);
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

  it("transitions checking -> idle when the availability check rejects (network error)", async () => {
    const { promise, reject } = deferred<{ available: boolean }>();
    checkSlugAvailabilityMock.mockReturnValue(promise);

    const { onSlugInput, slugStatus } = withEffectScope(() => useCollectionForm());

    onSlugInput("free-slug");
    await nextTick();
    await vi.advanceTimersByTimeAsync(400);
    expect(slugStatus.value).toBe("checking");

    reject(new Error("network down"));
    // The rejection is handled internally by the composable's own .catch(),
    // so awaiting the *settled* promise (not just the microtask queue) is
    // what guarantees that handler has already run before we assert.
    await promise.catch(() => {});
    expect(slugStatus.value).toBe("idle");
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

describe("useCollectionForm - teardown", () => {
  it("clears a pending debounce timer when the effect scope is stopped, so no network call ever fires", async () => {
    // Unlike withEffectScope() (which deliberately never stops its scope),
    // this test needs the scope handle itself so it can call .stop() and
    // exercise the composable's onScopeDispose(() => clearDebounceTimer())
    // registration.
    const scope = effectScope();
    const { onSlugInput, slugStatus } = scope.run(() => useCollectionForm())!;

    onSlugInput("free-slug");
    await nextTick(); // schedules the debounce timer, does not fire it yet
    // Proves a debounce timer is actually pending at this point - otherwise
    // the "not called yet" assertion below would pass vacuously even if
    // scheduling were broken.
    expect(slugStatus.value).toBe("checking");
    expect(checkSlugAvailabilityMock).not.toHaveBeenCalled();

    scope.stop();

    await vi.advanceTimersByTimeAsync(400);
    expect(checkSlugAvailabilityMock).not.toHaveBeenCalled();
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
    await nextTick(); // let the name -> slug auto-sync watcher run

    await submit();

    // Also exercises toPayload()'s whitespace-collapsing description mapping
    // - an untouched empty-string description must cross the boundary as
    // `null`, not `""`.
    expect(createCollectionMock).toHaveBeenCalledWith({
      name: "Test Collection",
      description: null,
      shared: false,
      slug: "test-collection"
    });
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

describe("useCollectionForm - toPayload trimming", () => {
  it("create: trims a padded name and collapses a whitespace-only description to null", async () => {
    createCollectionMock.mockResolvedValue(makeCollection());

    const { form, submit } = withEffectScope(() => useCollectionForm());
    form.name = "  Test Collection  ";
    form.description = "   ";
    // Slug auto-sync runs off the raw (untrimmed) `form.name`, but
    // slugify() already .trim()s internally, so the resulting slug is the
    // same either way - asserted explicitly below rather than assumed.
    await nextTick();

    await submit();

    expect(createCollectionMock).toHaveBeenCalledWith({
      name: "Test Collection",
      description: null,
      shared: false,
      slug: "test-collection"
    });
  });

  it("edit: trims a padded name and collapses a whitespace-only description to null", async () => {
    const existing = makeCollection({ name: "Old Name", description: "Old desc" });
    updateCollectionMock.mockResolvedValue(existing);

    const { form, submit } = withEffectScope(() => useCollectionForm(existing));
    form.name = "  Test Collection  ";
    form.description = "   ";

    await submit();

    // Edit mode's slug auto-sync is off from the start, so the slug stays
    // the existing collection's slug regardless of the name change.
    expect(updateCollectionMock).toHaveBeenCalledWith("collection-1", {
      name: "Test Collection",
      description: null,
      shared: false,
      slug: "my-collection"
    });
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

    expect(updateCollectionMock).toHaveBeenCalledWith("collection-1", {
      name: "My Collection",
      description: null,
      shared: true,
      slug: "old-slug"
    });
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

describe("useCollectionForm - double-submit guard", () => {
  it("ignores a second submit() while the first is still pending, calling the API exactly once", async () => {
    const { promise, resolve } = deferred<Collection>();
    createCollectionMock.mockReturnValue(promise);

    const { form, submit } = withEffectScope(() => useCollectionForm());
    form.name = "Test Collection";
    await nextTick(); // let the name -> slug auto-sync watcher run

    // Deliberately not awaiting the first call before starting the second -
    // performSubmit()'s `if (pending.value) return;` guard is what's under
    // test here, not sequential submits.
    const first = submit();
    const second = submit();

    resolve(makeCollection());
    await Promise.all([first, second]);

    expect(createCollectionMock).toHaveBeenCalledTimes(1);
    expect(navigateToMock).toHaveBeenCalledTimes(1);
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
