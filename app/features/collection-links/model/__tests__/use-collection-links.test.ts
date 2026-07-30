import { beforeEach, describe, expect, it, vi } from "vitest";

import { deferred } from "~/shared/testing/deferred";
import { tMock } from "~/shared/testing/mocks/i18n";
import { deleteLinkMock, resetLinksApiMocks } from "~/shared/testing/mocks/links-api";

// This import must stay last: the `~/shared/testing/mocks/*` modules above
// register their `vi.mock`/`mockNuxtImport` side effects as they're
// evaluated, in the order their import statements appear. Importing the
// composable under test first would resolve its own `~/shared/api/links`/
// `useI18n` auto-imports against the real implementations before the mocks
// are registered, so `pnpm lint:fix`/editors must not reorder this.
// eslint-disable-next-line import/order
import { useCollectionLinks } from "../use-collection-links";

// Derived from the mock itself (which resolves against the real
// i18n/locales/en.json via a lazy readFileSync lookup - see
// app/shared/testing/mocks/i18n.ts) rather than hardcoded, so this constant
// can't silently drift out of sync with the actual translation.
const GENERIC_ERROR = tMock("errors.generic");

beforeEach(() => {
  resetLinksApiMocks();
  tMock.mockClear();
});

describe("useCollectionLinks - dialog state transitions", () => {
  it("starts closed, with no pending link id", () => {
    const onDeleted = vi.fn();
    const { pendingDeleteLinkId, isDialogOpen } = useCollectionLinks("collection-1", onDeleted);

    expect(pendingDeleteLinkId.value).toBeNull();
    expect(isDialogOpen.value).toBe(false);
  });

  it("requestDelete opens the dialog targeting the given link id", () => {
    const onDeleted = vi.fn();
    const { pendingDeleteLinkId, isDialogOpen, requestDelete } = useCollectionLinks(
      "collection-1",
      onDeleted
    );

    requestDelete("link-1");

    expect(pendingDeleteLinkId.value).toBe("link-1");
    expect(isDialogOpen.value).toBe(true);
  });

  it("cancelDelete closes the dialog and clears the pending link id", () => {
    const onDeleted = vi.fn();
    const { pendingDeleteLinkId, isDialogOpen, requestDelete, cancelDelete } = useCollectionLinks(
      "collection-1",
      onDeleted
    );

    requestDelete("link-1");
    cancelDelete();

    expect(pendingDeleteLinkId.value).toBeNull();
    expect(isDialogOpen.value).toBe(false);
  });

  it("requestDelete clears a stale errorMessage from a previous failed attempt on a different link", async () => {
    deleteLinkMock.mockRejectedValue(new Error("network down"));
    const onDeleted = vi.fn();
    const { pendingDeleteLinkId, errorMessage, requestDelete, confirmDelete } = useCollectionLinks(
      "collection-1",
      onDeleted
    );

    requestDelete("link-1");
    await confirmDelete();
    expect(errorMessage.value).toBe(GENERIC_ERROR);

    // User dismisses the failed dialog and targets a different link - the
    // stale error from link-1's failed attempt must not bleed into link-2's
    // fresh dialog.
    requestDelete("link-2");

    expect(pendingDeleteLinkId.value).toBe("link-2");
    expect(errorMessage.value).toBeNull();
  });

  it("setting isDialogOpen to false behaves like cancelDelete (v-model convenience)", () => {
    const onDeleted = vi.fn();
    const { pendingDeleteLinkId, isDialogOpen, requestDelete } = useCollectionLinks(
      "collection-1",
      onDeleted
    );

    requestDelete("link-1");
    expect(isDialogOpen.value).toBe(true);

    isDialogOpen.value = false;

    expect(pendingDeleteLinkId.value).toBeNull();
    expect(isDialogOpen.value).toBe(false);
  });

  it("setting isDialogOpen to true is a no-op (no pending id is invented)", () => {
    const onDeleted = vi.fn();
    const { pendingDeleteLinkId, isDialogOpen } = useCollectionLinks("collection-1", onDeleted);

    isDialogOpen.value = true;

    expect(pendingDeleteLinkId.value).toBeNull();
    expect(isDialogOpen.value).toBe(false);
  });
});

describe("useCollectionLinks - confirmDelete: success", () => {
  it("deletes the pending link, clears the pending id, and awaits onDeleted", async () => {
    deleteLinkMock.mockResolvedValue(undefined);
    const onDeleted = vi.fn().mockResolvedValue(undefined);

    const { pendingDeleteLinkId, isDialogOpen, requestDelete, confirmDelete } = useCollectionLinks(
      "collection-1",
      onDeleted
    );

    requestDelete("link-1");
    await confirmDelete();

    expect(deleteLinkMock).toHaveBeenCalledWith("collection-1", "link-1");
    expect(pendingDeleteLinkId.value).toBeNull();
    expect(isDialogOpen.value).toBe(false);
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });

  it("does nothing when there is no pending link id", async () => {
    const onDeleted = vi.fn();
    const { confirmDelete } = useCollectionLinks("collection-1", onDeleted);

    await confirmDelete();

    expect(deleteLinkMock).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
  });
});

describe("useCollectionLinks - confirmDelete: failure", () => {
  it("keeps the dialog open and sets a generic error message on rejection, without calling onDeleted", async () => {
    deleteLinkMock.mockRejectedValue(new Error("network down"));
    const onDeleted = vi.fn();

    const { pendingDeleteLinkId, isDialogOpen, errorMessage, requestDelete, confirmDelete } =
      useCollectionLinks("collection-1", onDeleted);

    requestDelete("link-1");
    await confirmDelete();

    expect(pendingDeleteLinkId.value).toBe("link-1");
    expect(isDialogOpen.value).toBe(true);
    expect(errorMessage.value).toBe(GENERIC_ERROR);
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it("allows a retry after a failure: a second confirmDelete can still succeed", async () => {
    deleteLinkMock.mockRejectedValueOnce(new Error("network down"));
    deleteLinkMock.mockResolvedValueOnce(undefined);
    const onDeleted = vi.fn().mockResolvedValue(undefined);

    const { pendingDeleteLinkId, errorMessage, requestDelete, confirmDelete } = useCollectionLinks(
      "collection-1",
      onDeleted
    );

    requestDelete("link-1");
    await confirmDelete();
    expect(errorMessage.value).toBe(GENERIC_ERROR);

    await confirmDelete();

    expect(deleteLinkMock).toHaveBeenCalledTimes(2);
    expect(pendingDeleteLinkId.value).toBeNull();
    expect(errorMessage.value).toBeNull();
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });
});

describe("useCollectionLinks - onDeleted rejection after a successful delete", () => {
  // FLAG FOR TEAM-LEAD: pendingDeleteLinkId is cleared (closing the dialog,
  // since isDialogOpen derives from it) BEFORE `await onDeleted()` runs. If
  // onDeleted (a page's refresh()) rejects, the catch block still sets
  // errorMessage - but by then isDialogOpen is already false. In
  // app/pages/collections/[id]/index.vue, the `<v-alert>` showing
  // errorMessage lives *inside* the `<v-dialog v-model="isDialogOpen">`, so
  // this error becomes unreachable/invisible to the user on a closed dialog
  // rather than a source bug this test file should fix inline - documenting
  // the current behavior here per the qa-specialist "don't fix source
  // inline" rule.
  it("documents that a rejected onDeleted still sets errorMessage even though the dialog has already closed", async () => {
    deleteLinkMock.mockResolvedValue(undefined);
    const onDeleted = vi.fn().mockRejectedValue(new Error("refresh failed"));

    const { pendingDeleteLinkId, isDialogOpen, errorMessage, requestDelete, confirmDelete } =
      useCollectionLinks("collection-1", onDeleted);

    requestDelete("link-1");
    await confirmDelete();

    expect(deleteLinkMock).toHaveBeenCalledWith("collection-1", "link-1");
    // The dialog is already closed at this point...
    expect(pendingDeleteLinkId.value).toBeNull();
    expect(isDialogOpen.value).toBe(false);
    // ...yet errorMessage is still set, with nowhere in the current UI to
    // display it.
    expect(errorMessage.value).toBe(GENERIC_ERROR);
  });
});

describe("useCollectionLinks - double-delete guard", () => {
  it("ignores a second confirmDelete() while the first is still pending, calling deleteLink exactly once", async () => {
    const { promise, resolve } = deferred();
    deleteLinkMock.mockReturnValue(promise);
    const onDeleted = vi.fn().mockResolvedValue(undefined);

    const { requestDelete, confirmDelete } = useCollectionLinks("collection-1", onDeleted);

    requestDelete("link-1");

    const first = confirmDelete();
    const second = confirmDelete();

    resolve();
    await Promise.all([first, second]);

    expect(deleteLinkMock).toHaveBeenCalledTimes(1);
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });
});
