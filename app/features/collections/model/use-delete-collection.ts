import { computed, ref } from "vue";

import { deleteCollection } from "~/shared/api";

/**
 * Manages a single shared delete-confirmation dialog for the collections
 * list page: the page renders many rows, but only one dialog instance backs
 * all of them - `requestDelete(collectionId)` opens it targeting whichever
 * row's delete button was clicked.
 */
export function useDeleteCollection(onDeleted: () => void | Promise<void>) {
  const { t } = useI18n();

  const pendingDeleteCollectionId = ref<string | null>(null);
  const deletePending = ref(false);
  const errorMessage = ref<string | null>(null);
  // Separate from `errorMessage`: the dialog has already closed (and
  // `errorMessage` reset) by the time `onDeleted()` runs, so a rejection here
  // needs page-level feedback rather than reusing the closed dialog's error
  // state.
  const refreshError = ref<string | null>(null);

  // Convenience for a page that wants to bind the dialog with `v-model`
  // instead of wiring `pendingDeleteCollectionId`/`cancelDelete` manually -
  // setting it to false (e.g. via the dialog's own dismiss affordances)
  // behaves the same as calling cancelDelete().
  const isDialogOpen = computed({
    get: () => pendingDeleteCollectionId.value !== null,
    set: (value: boolean) => {
      if (!value) cancelDelete();
    }
  });

  function requestDelete(collectionId: string) {
    errorMessage.value = null;
    pendingDeleteCollectionId.value = collectionId;
  }

  function cancelDelete() {
    pendingDeleteCollectionId.value = null;
    errorMessage.value = null;
  }

  async function confirmDelete() {
    if (!pendingDeleteCollectionId.value || deletePending.value) return;

    errorMessage.value = null;
    deletePending.value = true;

    try {
      await deleteCollection(pendingDeleteCollectionId.value);
    } catch {
      // Keep the dialog open and surface the failure rather than silently
      // closing - the collection may already be gone (404), or the request
      // may have failed on the network, and the user needs to see that.
      errorMessage.value = t("errors.generic");
      deletePending.value = false;
      return;
    }

    pendingDeleteCollectionId.value = null;

    try {
      await onDeleted();
      refreshError.value = null;
    } catch {
      refreshError.value = t("errors.generic");
    } finally {
      deletePending.value = false;
    }
  }

  return {
    pendingDeleteCollectionId,
    deletePending,
    errorMessage,
    refreshError,
    isDialogOpen,
    requestDelete,
    confirmDelete,
    cancelDelete
  };
}
