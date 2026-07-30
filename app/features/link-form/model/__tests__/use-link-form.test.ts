import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick } from "vue";

import type { LinkItem, LinkPreview } from "~/shared/api";

import { deferred } from "~/shared/testing/deferred";
import { tMock } from "~/shared/testing/mocks/i18n";
import {
  createLinkMock,
  fetchLinkPreviewMock,
  resetLinksApiMocks,
  updateLinkMock
} from "~/shared/testing/mocks/links-api";
import { navigateToMock } from "~/shared/testing/mocks/navigate";

// This import must stay last: the `~/shared/testing/mocks/*` modules above
// register their `vi.mock`/`mockNuxtImport` side effects as they're
// evaluated, in the order their import statements appear. Importing the
// composable under test first would resolve its own `~/shared/api/links`/
// `navigateTo`/`useI18n` auto-imports against the real implementations
// before the mocks are registered, so `pnpm lint:fix`/editors must not
// reorder this.
// eslint-disable-next-line import/order
import { useLinkForm } from "../use-link-form";

const PREVIEW_DEBOUNCE_MS = 400;

function makeLinkItem(overrides: Partial<LinkItem> = {}): LinkItem {
  return {
    id: "link-1",
    urlId: "url-1",
    collectionId: "collection-1",
    url: "https://existing.example.com",
    normalizedUrl: "https://existing.example.com",
    title: "Existing title",
    description: "Existing description",
    imageUrl: "https://existing.example.com/image.png",
    fetchStatus: "fetched",
    fetchedAt: "2024-01-01T00:00:00.000Z",
    position: 0,
    addedAt: "2024-01-01T00:00:00.000Z",
    ...overrides
  };
}

function makePreview(overrides: Partial<LinkPreview> = {}): LinkPreview {
  return {
    title: "Fetched title",
    description: "Fetched description",
    imageUrl: "https://example.com/preview.png",
    fetchStatus: "fetched",
    ...overrides
  };
}

// useLinkForm() calls onScopeDispose() unconditionally (to clear its
// debounce timer on teardown, in both create and edit mode), which warns if
// invoked with no active Vue effect scope - which is exactly what happens
// when a composable is called directly from a plain test function rather
// than a component's setup(). Running it inside a real effectScope()
// satisfies that requirement and keeps test output clean; the scope is
// deliberately never stopped since these tests don't exercise
// unmount/teardown behavior, except the dedicated teardown test below.
function withEffectScope<T>(setup: () => T): T {
  return effectScope().run(setup)!;
}

// Derived from the mock itself (which resolves against the real
// i18n/locales/en.json via a lazy readFileSync lookup - see
// app/shared/testing/mocks/i18n.ts) rather than hardcoded, so this constant
// can't silently drift out of sync with the actual translation.
const GENERIC_ERROR = tMock("errors.generic");

// Realistic shape of a thrown ofetch/h3 error for a validation failure
// mapped to a field error server-side, per app/shared/api/links.ts's
// `extractLinkFieldErrors` doc comment.
const urlFieldError = {
  data: {
    statusCode: 400,
    statusMessage: "Validation Error",
    stack: [],
    data: { fieldErrors: { url: ["This URL could not be reached."] } }
  }
};

beforeEach(() => {
  vi.useFakeTimers();
  navigateToMock.mockReset();
  resetLinksApiMocks();
  tMock.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useLinkForm - create vs edit mode", () => {
  it("create mode: initializes an empty form and reflects create mode", () => {
    const { form, mode, isEditing, previewStatus } = withEffectScope(() =>
      useLinkForm("collection-1")
    );

    expect(form).toEqual({ url: "", title: "", description: "", imageUrl: "" });
    expect(mode).toBe("create");
    expect(isEditing).toBe(false);
    expect(previewStatus.value).toBe("idle");
  });

  it("edit mode: initializes the form from the existing link and reflects edit mode", () => {
    const existing = makeLinkItem({
      url: "https://old.example.com",
      title: "Old title",
      description: "Old description",
      imageUrl: "https://old.example.com/image.png"
    });

    const { form, mode, isEditing } = withEffectScope(() => useLinkForm("collection-1", existing));

    expect(form).toEqual({
      url: "https://old.example.com",
      title: "Old title",
      description: "Old description",
      imageUrl: "https://old.example.com/image.png"
    });
    expect(mode).toBe("edit");
    expect(isEditing).toBe(true);
  });

  it("edit mode: the url-change watcher is never wired up - editing form.url triggers no preview fetch", async () => {
    const existing = makeLinkItem({ url: "https://old.example.com" });
    const { form, previewStatus } = withEffectScope(() => useLinkForm("collection-1", existing));

    form.url = "https://new.example.com";
    await nextTick();
    await vi.advanceTimersByTimeAsync(PREVIEW_DEBOUNCE_MS);

    expect(previewStatus.value).toBe("idle");
    expect(fetchLinkPreviewMock).not.toHaveBeenCalled();
  });
});

describe("useLinkForm - debounced preview fetch", () => {
  it("transitions checking -> fetched and prefills title/description/imageUrl, after the debounce delay", async () => {
    const { promise, resolve } = deferred<LinkPreview>();
    fetchLinkPreviewMock.mockReturnValue(promise);

    const { form, previewStatus } = withEffectScope(() => useLinkForm("collection-1"));

    form.url = "https://example.com";
    await nextTick();
    expect(previewStatus.value).toBe("checking");
    expect(fetchLinkPreviewMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(PREVIEW_DEBOUNCE_MS);
    expect(fetchLinkPreviewMock).toHaveBeenCalledWith("https://example.com");

    resolve(
      makePreview({ title: "A title", description: "A description", imageUrl: "https://img" })
    );
    await promise;

    expect(previewStatus.value).toBe("fetched");
    expect(form.title).toBe("A title");
    expect(form.description).toBe("A description");
    expect(form.imageUrl).toBe("https://img");
  });

  it("transitions checking -> failed on a 200 'failed' fetchStatus result, and does NOT touch the form fields", async () => {
    const { promise, resolve } = deferred<LinkPreview>();
    fetchLinkPreviewMock.mockReturnValue(promise);

    const { form, previewStatus } = withEffectScope(() => useLinkForm("collection-1"));

    form.url = "https://example.com";
    await nextTick();
    await vi.advanceTimersByTimeAsync(PREVIEW_DEBOUNCE_MS);

    resolve(makePreview({ fetchStatus: "failed", title: "Should not apply" }));
    await promise;

    expect(previewStatus.value).toBe("failed");
    expect(form.title).toBe("");
    expect(form.description).toBe("");
    expect(form.imageUrl).toBe("");
  });

  it("transitions checking -> failed when the preview fetch rejects (network error)", async () => {
    const { promise, reject } = deferred<LinkPreview>();
    fetchLinkPreviewMock.mockReturnValue(promise);

    const { form, previewStatus } = withEffectScope(() => useLinkForm("collection-1"));

    form.url = "https://example.com";
    await nextTick();
    await vi.advanceTimersByTimeAsync(PREVIEW_DEBOUNCE_MS);
    expect(previewStatus.value).toBe("checking");

    reject(new Error("network down"));
    // The rejection is handled internally by the composable's own .catch(),
    // so awaiting the *settled* promise (not just the microtask queue) is
    // what guarantees that handler has already run before we assert.
    await promise.catch(() => {});
    expect(previewStatus.value).toBe("failed");
  });

  it("does not fire a network call for a syntactically invalid url, and the status is 'idle'", async () => {
    const { form, previewStatus } = withEffectScope(() => useLinkForm("collection-1"));

    form.url = "not-a-url";
    await nextTick();
    expect(previewStatus.value).toBe("idle");

    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchLinkPreviewMock).not.toHaveBeenCalled();
  });

  it("does not fire a network call for a non-http(s) url (e.g. ftp:), and the status is 'idle'", async () => {
    const { form, previewStatus } = withEffectScope(() => useLinkForm("collection-1"));

    form.url = "ftp://example.com/file";
    await nextTick();
    expect(previewStatus.value).toBe("idle");

    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchLinkPreviewMock).not.toHaveBeenCalled();
  });

  it("discards a stale response when a newer url change supersedes it (out-of-order guard)", async () => {
    const first = deferred<LinkPreview>();
    const second = deferred<LinkPreview>();
    fetchLinkPreviewMock
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);

    const { form, previewStatus } = withEffectScope(() => useLinkForm("collection-1"));

    form.url = "https://first.example.com";
    await nextTick();
    await vi.advanceTimersByTimeAsync(PREVIEW_DEBOUNCE_MS);
    expect(fetchLinkPreviewMock).toHaveBeenCalledTimes(1);

    form.url = "https://second.example.com";
    await nextTick();
    await vi.advanceTimersByTimeAsync(PREVIEW_DEBOUNCE_MS);
    expect(fetchLinkPreviewMock).toHaveBeenCalledTimes(2);

    // Resolve the FIRST (now-superseded) request as fetched - it must be
    // discarded, not applied.
    first.resolve(makePreview({ title: "Stale title" }));
    await first.promise;
    expect(previewStatus.value).not.toBe("fetched");
    expect(previewStatus.value).toBe("checking");
    expect(form.title).toBe("");

    // Resolve the SECOND (current) request as fetched - it must win.
    second.resolve(makePreview({ title: "Fresh title" }));
    await second.promise;
    expect(previewStatus.value).toBe("fetched");
    expect(form.title).toBe("Fresh title");
  });

  it("discards a stale response even when the url changes to an invalid format in between (requestId bump on every change)", async () => {
    const first = deferred<LinkPreview>();
    fetchLinkPreviewMock.mockImplementationOnce(() => first.promise);

    const { form, previewStatus } = withEffectScope(() => useLinkForm("collection-1"));

    form.url = "https://first.example.com";
    await nextTick();
    await vi.advanceTimersByTimeAsync(PREVIEW_DEBOUNCE_MS);
    expect(fetchLinkPreviewMock).toHaveBeenCalledTimes(1);

    form.url = "not-a-url";
    await nextTick();
    expect(previewStatus.value).toBe("idle");

    first.resolve(makePreview({ title: "Stale title" }));
    await first.promise;

    // The invalid-format change bumped requestId even though it never
    // scheduled a new network call, so the first request's token is stale.
    expect(previewStatus.value).toBe("idle");
    expect(form.title).toBe("");
  });
});

describe("useLinkForm - dirty-flag gating", () => {
  it("does not overwrite a field the user already typed into, but still fills the untouched ones", async () => {
    const { promise, resolve } = deferred<LinkPreview>();
    fetchLinkPreviewMock.mockReturnValue(promise);

    const { form, onTitleInput } = withEffectScope(() => useLinkForm("collection-1"));

    form.url = "https://example.com";
    onTitleInput("My own title");
    await nextTick();
    await vi.advanceTimersByTimeAsync(PREVIEW_DEBOUNCE_MS);

    resolve(
      makePreview({
        title: "Fetched title",
        description: "Fetched description",
        imageUrl: "https://fetched-image"
      })
    );
    await promise;

    expect(form.title).toBe("My own title");
    expect(form.description).toBe("Fetched description");
    expect(form.imageUrl).toBe("https://fetched-image");
  });

  it("onDescriptionInput/onImageUrlInput each independently gate their own field", async () => {
    const { promise, resolve } = deferred<LinkPreview>();
    fetchLinkPreviewMock.mockReturnValue(promise);

    const { form, onDescriptionInput, onImageUrlInput } = withEffectScope(() =>
      useLinkForm("collection-1")
    );

    form.url = "https://example.com";
    onDescriptionInput("My own description");
    onImageUrlInput("https://my-own-image");
    await nextTick();
    await vi.advanceTimersByTimeAsync(PREVIEW_DEBOUNCE_MS);

    resolve(
      makePreview({
        title: "Fetched title",
        description: "Fetched description",
        imageUrl: "https://fetched-image"
      })
    );
    await promise;

    expect(form.title).toBe("Fetched title");
    expect(form.description).toBe("My own description");
    expect(form.imageUrl).toBe("https://my-own-image");
  });
});

describe("useLinkForm - submitDisabled", () => {
  it("is false by default and unaffected by previewStatus", async () => {
    const { form, submitDisabled } = withEffectScope(() => useLinkForm("collection-1"));

    expect(submitDisabled.value).toBe(false);

    form.url = "not-a-url"; // previewStatus stays idle
    await nextTick();
    expect(submitDisabled.value).toBe(false);
  });

  it("stays false even while a preview fetch is in flight or failed", async () => {
    const { promise, resolve } = deferred<LinkPreview>();
    fetchLinkPreviewMock.mockReturnValue(promise);

    const { form, previewStatus, submitDisabled } = withEffectScope(() =>
      useLinkForm("collection-1")
    );

    form.url = "https://example.com";
    await nextTick();
    await vi.advanceTimersByTimeAsync(PREVIEW_DEBOUNCE_MS);
    expect(previewStatus.value).toBe("checking");
    expect(submitDisabled.value).toBe(false);

    resolve(makePreview({ fetchStatus: "failed" }));
    await promise;
    expect(previewStatus.value).toBe("failed");
    expect(submitDisabled.value).toBe(false);
  });

  it("is true while a submit is pending", async () => {
    const { promise, resolve } = deferred<LinkItem>();
    createLinkMock.mockReturnValue(promise);

    const { form, submit, submitDisabled } = withEffectScope(() => useLinkForm("collection-1"));
    form.url = "https://example.com";

    const submitPromise = submit();
    expect(submitDisabled.value).toBe(true);

    resolve(makeLinkItem());
    await submitPromise;
    expect(submitDisabled.value).toBe(false);
  });
});

describe("useLinkForm - submit payload: create mode", () => {
  it("trims fields and maps empty strings to undefined", async () => {
    createLinkMock.mockResolvedValue(makeLinkItem());

    const { form, submit } = withEffectScope(() => useLinkForm("collection-1"));
    form.url = "  https://example.com  ";
    form.title = "  ";
    form.description = "  My description  ";
    form.imageUrl = "";

    await submit();

    expect(createLinkMock).toHaveBeenCalledWith("collection-1", {
      url: "https://example.com",
      title: undefined,
      description: "My description",
      imageUrl: undefined
    });
  });
});

describe("useLinkForm - submit payload: edit mode", () => {
  it("trims fields, maps empty strings to null, and never includes url", async () => {
    const existing = makeLinkItem({ id: "link-42", collectionId: "collection-1" });
    updateLinkMock.mockResolvedValue(existing);

    const { form, submit } = withEffectScope(() => useLinkForm("collection-1", existing));
    form.title = "  ";
    form.description = "  Updated description  ";
    form.imageUrl = "";

    await submit();

    expect(updateLinkMock).toHaveBeenCalledTimes(1);
    expect(updateLinkMock.mock.calls[0]?.[0]).toBe("collection-1");
    expect(updateLinkMock.mock.calls[0]?.[1]).toBe("link-42");
    const payload = updateLinkMock.mock.calls[0]?.[2];
    expect(payload).toEqual({
      title: null,
      description: "Updated description",
      imageUrl: null
    });
    expect(payload).not.toHaveProperty("url");
  });
});

describe("useLinkForm - submit: field-error mapping vs generic fallback", () => {
  it("create: maps a field-shaped rejection to errors.url instead of a generic message", async () => {
    createLinkMock.mockRejectedValue(urlFieldError);

    const { form, errors, errorMessage, submit } = withEffectScope(() =>
      useLinkForm("collection-1")
    );
    form.url = "https://example.com";

    await submit();

    expect(errors.value).toEqual({ url: ["This URL could not be reached."] });
    expect(errorMessage.value).toBeNull();
  });

  it("edit: maps a field-shaped rejection to errors.url instead of a generic message", async () => {
    const existing = makeLinkItem();
    updateLinkMock.mockRejectedValue(urlFieldError);

    const { errors, errorMessage, submit } = withEffectScope(() =>
      useLinkForm("collection-1", existing)
    );

    await submit();

    expect(errors.value).toEqual({ url: ["This URL could not be reached."] });
    expect(errorMessage.value).toBeNull();
  });

  it("falls back to the generic error message for a rejection that isn't in the fieldErrors shape (plain Error)", async () => {
    createLinkMock.mockRejectedValue(new Error("network down"));

    const { form, errors, errorMessage, submit } = withEffectScope(() =>
      useLinkForm("collection-1")
    );
    form.url = "https://example.com";

    await submit();

    expect(errorMessage.value).toBe(GENERIC_ERROR);
    expect(errors.value).toEqual({});
  });

  it("falls back to the generic error message for a 401-shaped rejection (no .data.data.fieldErrors)", async () => {
    createLinkMock.mockRejectedValue({ data: { statusCode: 401, statusMessage: "Unauthorized" } });

    const { form, errorMessage, submit } = withEffectScope(() => useLinkForm("collection-1"));
    form.url = "https://example.com";

    await submit();

    expect(errorMessage.value).toBe(GENERIC_ERROR);
  });
});

describe("useLinkForm - double-submit guard", () => {
  it("ignores a second submit() while the first is still pending, calling the API exactly once", async () => {
    const { promise, resolve } = deferred<LinkItem>();
    createLinkMock.mockReturnValue(promise);

    const { form, submit } = withEffectScope(() => useLinkForm("collection-1"));
    form.url = "https://example.com";

    // Deliberately not awaiting the first call before starting the second -
    // the `if (pending.value) return;` guard is what's under test here, not
    // sequential submits.
    const first = submit();
    const second = submit();

    resolve(makeLinkItem());
    await Promise.all([first, second]);

    expect(createLinkMock).toHaveBeenCalledTimes(1);
    expect(navigateToMock).toHaveBeenCalledTimes(1);
  });
});

describe("useLinkForm - on success", () => {
  it("navigates to /collections/:id after a successful create", async () => {
    createLinkMock.mockResolvedValue(makeLinkItem());

    const { form, submit } = withEffectScope(() => useLinkForm("collection-42"));
    form.url = "https://example.com";
    await submit();

    expect(navigateToMock).toHaveBeenCalledWith("/collections/collection-42");
  });

  it("navigates to /collections/:id after a successful edit", async () => {
    const existing = makeLinkItem();
    updateLinkMock.mockResolvedValue(existing);

    const { submit } = withEffectScope(() => useLinkForm("collection-42", existing));
    await submit();

    expect(navigateToMock).toHaveBeenCalledWith("/collections/collection-42");
  });
});

describe("useLinkForm - teardown", () => {
  it("clears a pending debounce timer when the effect scope is stopped, so no network call ever fires", async () => {
    // Unlike withEffectScope() (which deliberately never stops its scope),
    // this test needs the scope handle itself so it can call .stop() and
    // exercise the composable's onScopeDispose(() => clearDebounceTimer())
    // registration.
    const scope = effectScope();
    const { form, previewStatus } = scope.run(() => useLinkForm("collection-1"))!;

    form.url = "https://example.com";
    await nextTick(); // schedules the debounce timer, does not fire it yet
    expect(previewStatus.value).toBe("checking");
    expect(fetchLinkPreviewMock).not.toHaveBeenCalled();

    scope.stop();

    await vi.advanceTimersByTimeAsync(PREVIEW_DEBOUNCE_MS);
    expect(fetchLinkPreviewMock).not.toHaveBeenCalled();
  });
});
