import { computed, ref } from "vue";

import { deleteLink } from "~/shared/api";

/**
 * Manages a single shared delete-confirmation dialog for a collection's
 * links page: the page renders many `LinkCard`s, but only one dialog
 * instance backs all of them - `requestDelete(linkId)` opens it targeting
 * whichever card's delete button was clicked.
 */
export function useCollectionLinks(collectionId: string, onDeleted: () => void | Promise<void>) {
  const { t } = useI18n();

  const pendingDeleteLinkId = ref<string | null>(null);
  const deletePending = ref(false);
  const errorMessage = ref<string | null>(null);
  // Separate from `errorMessage`: the dialog has already closed (and
  // `errorMessage` reset) by the time `onDeleted()` runs, so a rejection here
  // needs page-level feedback rather than reusing the closed dialog's error
  // state.
  const refreshError = ref<string | null>(null);

  // Convenience for a page that wants to bind the dialog with `v-model`
  // instead of wiring `pendingDeleteLinkId`/`cancelDelete` manually - setting
  // it to false (e.g. via the dialog's own dismiss affordances) behaves the
  // same as calling cancelDelete().
  const isDialogOpen = computed({
    get: () => pendingDeleteLinkId.value !== null,
    set: (value: boolean) => {
      if (!value) cancelDelete();
    }
  });

  function requestDelete(linkId: string) {
    errorMessage.value = null;
    pendingDeleteLinkId.value = linkId;
  }

  function cancelDelete() {
    pendingDeleteLinkId.value = null;
    errorMessage.value = null;
  }

  async function confirmDelete() {
    if (!pendingDeleteLinkId.value || deletePending.value) return;

    errorMessage.value = null;
    deletePending.value = true;

    try {
      await deleteLink(collectionId, pendingDeleteLinkId.value);
    } catch {
      // Keep the dialog open and surface the failure rather than silently
      // closing - the link may already be gone (404), or the request may
      // have failed on the network, and the user needs to see that.
      errorMessage.value = t("errors.generic");
      deletePending.value = false;
      return;
    }

    pendingDeleteLinkId.value = null;

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
    pendingDeleteLinkId,
    deletePending,
    errorMessage,
    refreshError,
    isDialogOpen,
    requestDelete,
    confirmDelete,
    cancelDelete
  };
}
