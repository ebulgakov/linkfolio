import { beforeEach, describe, expect, it, vi } from "vitest";

import { deferred } from "~/shared/testing/deferred";
import {
  deleteCollectionMock,
  resetCollectionsApiMocks
} from "~/shared/testing/mocks/collections-api";
import { tMock } from "~/shared/testing/mocks/i18n";

// This import must stay last: the `~/shared/testing/mocks/*` modules above
// register their `vi.mock`/`mockNuxtImport` side effects as they're
// evaluated, in the order their import statements appear. Importing the
// composable under test first would resolve its own `~/shared/api/collections`/
// `useI18n` auto-imports against the real implementations before the mocks
// are registered, so `pnpm lint:fix`/editors must not reorder this.
// eslint-disable-next-line import/order
import { useDeleteCollection } from "../use-delete-collection";

// Derived from the mock itself (which resolves against the real
// i18n/locales/en.json via a lazy readFileSync lookup - see
// app/shared/testing/mocks/i18n.ts) rather than hardcoded, so this constant
// can't silently drift out of sync with the actual translation.
const GENERIC_ERROR = tMock("errors.generic");

beforeEach(() => {
  resetCollectionsApiMocks();
  tMock.mockClear();
});

describe("useDeleteCollection - dialog state transitions", () => {
  it("starts closed, with no pending collection id", () => {
    const onDeleted = vi.fn();
    const { pendingDeleteCollectionId, isDialogOpen } = useDeleteCollection(onDeleted);

    expect(pendingDeleteCollectionId.value).toBeNull();
    expect(isDialogOpen.value).toBe(false);
  });

  it("requestDelete opens the dialog targeting the given collection id", () => {
    const onDeleted = vi.fn();
    const { pendingDeleteCollectionId, isDialogOpen, requestDelete } =
      useDeleteCollection(onDeleted);

    requestDelete("collection-1");

    expect(pendingDeleteCollectionId.value).toBe("collection-1");
    expect(isDialogOpen.value).toBe(true);
  });

  it("cancelDelete closes the dialog and clears the pending collection id", () => {
    const onDeleted = vi.fn();
    const { pendingDeleteCollectionId, isDialogOpen, requestDelete, cancelDelete } =
      useDeleteCollection(onDeleted);

    requestDelete("collection-1");
    cancelDelete();

    expect(pendingDeleteCollectionId.value).toBeNull();
    expect(isDialogOpen.value).toBe(false);
  });

  it("requestDelete clears a stale errorMessage from a previous failed attempt on a different collection", async () => {
    deleteCollectionMock.mockRejectedValue(new Error("network down"));
    const onDeleted = vi.fn();
    const { pendingDeleteCollectionId, errorMessage, requestDelete, confirmDelete } =
      useDeleteCollection(onDeleted);

    requestDelete("collection-1");
    await confirmDelete();
    expect(errorMessage.value).toBe(GENERIC_ERROR);

    // User dismisses the failed dialog and targets a different collection -
    // the stale error from collection-1's failed attempt must not bleed
    // into collection-2's fresh dialog.
    requestDelete("collection-2");

    expect(pendingDeleteCollectionId.value).toBe("collection-2");
    expect(errorMessage.value).toBeNull();
  });

  it("setting isDialogOpen to false behaves like cancelDelete (v-model convenience)", () => {
    const onDeleted = vi.fn();
    const { pendingDeleteCollectionId, isDialogOpen, requestDelete } =
      useDeleteCollection(onDeleted);

    requestDelete("collection-1");
    expect(isDialogOpen.value).toBe(true);

    isDialogOpen.value = false;

    expect(pendingDeleteCollectionId.value).toBeNull();
    expect(isDialogOpen.value).toBe(false);
  });

  it("setting isDialogOpen to true is a no-op (no pending id is invented)", () => {
    const onDeleted = vi.fn();
    const { pendingDeleteCollectionId, isDialogOpen } = useDeleteCollection(onDeleted);

    isDialogOpen.value = true;

    expect(pendingDeleteCollectionId.value).toBeNull();
    expect(isDialogOpen.value).toBe(false);
  });

  it("cancelDelete (and the isDialogOpen v-model setter) is a no-op while a delete is in flight", async () => {
    const { promise, resolve } = deferred();
    deleteCollectionMock.mockReturnValue(promise);
    const onDeleted = vi.fn().mockResolvedValue(undefined);

    const { pendingDeleteCollectionId, isDialogOpen, requestDelete, confirmDelete, cancelDelete } =
      useDeleteCollection(onDeleted);

    requestDelete("collection-1");
    const pending = confirmDelete();

    // The dialog must stay open and targeting collection-1 for the duration
    // of the in-flight request - dismissing it here (Cancel button or the
    // dialog's own scrim/ESC dismissal, both wired through these two paths)
    // would otherwise let the request's own continuation null out whatever
    // pending id happens to be current once it resolves, which is only safe
    // to do if nothing could have re-targeted the dialog in the meantime.
    cancelDelete();
    expect(pendingDeleteCollectionId.value).toBe("collection-1");
    expect(isDialogOpen.value).toBe(true);

    isDialogOpen.value = false;
    expect(pendingDeleteCollectionId.value).toBe("collection-1");
    expect(isDialogOpen.value).toBe(true);

    resolve();
    await pending;

    expect(deleteCollectionMock).toHaveBeenCalledWith("collection-1");
    expect(deleteCollectionMock).toHaveBeenCalledTimes(1);
    expect(pendingDeleteCollectionId.value).toBeNull();
    expect(isDialogOpen.value).toBe(false);
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });
});

describe("useDeleteCollection - confirmDelete: success", () => {
  it("deletes the pending collection, clears the pending id, and awaits onDeleted", async () => {
    deleteCollectionMock.mockResolvedValue(undefined);
    const onDeleted = vi.fn().mockResolvedValue(undefined);

    const { pendingDeleteCollectionId, isDialogOpen, requestDelete, confirmDelete } =
      useDeleteCollection(onDeleted);

    requestDelete("collection-1");
    await confirmDelete();

    expect(deleteCollectionMock).toHaveBeenCalledWith("collection-1");
    expect(pendingDeleteCollectionId.value).toBeNull();
    expect(isDialogOpen.value).toBe(false);
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });

  it("does nothing when there is no pending collection id", async () => {
    const onDeleted = vi.fn();
    const { confirmDelete } = useDeleteCollection(onDeleted);

    await confirmDelete();

    expect(deleteCollectionMock).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
  });
});

describe("useDeleteCollection - confirmDelete: failure", () => {
  it("keeps the dialog open and sets a generic error message on rejection, without calling onDeleted", async () => {
    deleteCollectionMock.mockRejectedValue(new Error("network down"));
    const onDeleted = vi.fn();

    const { pendingDeleteCollectionId, isDialogOpen, errorMessage, requestDelete, confirmDelete } =
      useDeleteCollection(onDeleted);

    requestDelete("collection-1");
    await confirmDelete();

    expect(pendingDeleteCollectionId.value).toBe("collection-1");
    expect(isDialogOpen.value).toBe(true);
    expect(errorMessage.value).toBe(GENERIC_ERROR);
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it("allows a retry after a failure: a second confirmDelete can still succeed", async () => {
    deleteCollectionMock.mockRejectedValueOnce(new Error("network down"));
    deleteCollectionMock.mockResolvedValueOnce(undefined);
    const onDeleted = vi.fn().mockResolvedValue(undefined);

    const { pendingDeleteCollectionId, errorMessage, requestDelete, confirmDelete } =
      useDeleteCollection(onDeleted);

    requestDelete("collection-1");
    await confirmDelete();
    expect(errorMessage.value).toBe(GENERIC_ERROR);

    await confirmDelete();

    expect(deleteCollectionMock).toHaveBeenCalledTimes(2);
    expect(pendingDeleteCollectionId.value).toBeNull();
    expect(errorMessage.value).toBeNull();
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });
});

describe("useDeleteCollection - onDeleted rejection after a successful delete", () => {
  // pendingDeleteCollectionId is cleared (closing the dialog, since
  // isDialogOpen derives from it) before `await onDeleted()` runs, so a
  // rejection here can't be surfaced through the dialog's errorMessage - the
  // closed dialog is no longer visible. `refreshError` is a separate,
  // page-level piece of state for exactly this case.
  it("closes the dialog on a successful delete but surfaces a page-level refreshError when onDeleted rejects", async () => {
    deleteCollectionMock.mockResolvedValue(undefined);
    const onDeleted = vi.fn().mockRejectedValue(new Error("refresh failed"));

    const {
      pendingDeleteCollectionId,
      isDialogOpen,
      errorMessage,
      refreshError,
      requestDelete,
      confirmDelete
    } = useDeleteCollection(onDeleted);

    requestDelete("collection-1");
    await confirmDelete();

    expect(deleteCollectionMock).toHaveBeenCalledWith("collection-1");
    expect(pendingDeleteCollectionId.value).toBeNull();
    expect(isDialogOpen.value).toBe(false);
    expect(errorMessage.value).toBeNull();
    expect(refreshError.value).toBe(GENERIC_ERROR);
  });

  it("clears a stale refreshError once a later refresh succeeds", async () => {
    deleteCollectionMock.mockResolvedValue(undefined);
    const onDeleted = vi
      .fn()
      .mockRejectedValueOnce(new Error("refresh failed"))
      .mockResolvedValueOnce(undefined);

    const { refreshError, requestDelete, confirmDelete } = useDeleteCollection(onDeleted);

    requestDelete("collection-1");
    await confirmDelete();
    expect(refreshError.value).toBe(GENERIC_ERROR);

    requestDelete("collection-2");
    await confirmDelete();
    expect(refreshError.value).toBeNull();
  });
});

describe("useDeleteCollection - double-delete guard", () => {
  it("ignores a second confirmDelete() while the first is still pending, calling deleteCollection exactly once", async () => {
    const { promise, resolve } = deferred();
    deleteCollectionMock.mockReturnValue(promise);
    const onDeleted = vi.fn().mockResolvedValue(undefined);

    const { requestDelete, confirmDelete } = useDeleteCollection(onDeleted);

    requestDelete("collection-1");

    const first = confirmDelete();
    const second = confirmDelete();

    resolve();
    await Promise.all([first, second]);

    expect(deleteCollectionMock).toHaveBeenCalledTimes(1);
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });
});
