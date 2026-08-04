import { onMounted, onScopeDispose, ref } from "vue";

import { deleteUploadedImage, uploadImage } from "~/shared/api";

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

interface UseImageUploadProps {
  modelValue: string | null;
}

type Emit = (event: "update:modelValue", value: string | null) => void;

/**
 * Drives an image-upload widget that slots into a `v-model`: the component
 * exposes `modelValue: string | null` + `update:modelValue`, this composable
 * does the upload/paste/remove logic and calls `emit` to write the result.
 *
 * `props` must be passed through as the component's actual reactive props
 * object (not destructured) so `props.modelValue` stays live across calls.
 */
export function useImageUpload(props: UseImageUploadProps, emit: Emit) {
  const { t } = useI18n();

  const pending = ref(false);
  const error = ref<string | null>(null);

  // URLs this composable itself uploaded during the current session. The
  // value the widget was initialized with (e.g. an existing collection's
  // saved image on edit-open) is deliberately never added here - only a URL
  // this composable uploaded itself is ever eligible for a delete call from
  // remove()/replace, so removing-then-cancelling-without-saving can never
  // destroy a live saved image.
  const sessionUploadedUrls = new Set<string>();

  // Feature-detected post-mount only, never during setup/SSR - `navigator`
  // doesn't exist server-side, and `navigator.clipboard.read` is itself
  // browser-specific even client-side.
  const canUseClipboardReadApi = ref(false);

  function validateFile(file: File): string | null {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return t("forms.imageUpload.errors.invalidType");
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return t("forms.imageUpload.errors.tooLarge");
    }
    return null;
  }

  async function uploadFile(file: File) {
    // Guard against overlapping uploads - the native `paste` listener below
    // can't be disabled by markup the way the file input/buttons are via
    // `:disabled="pending"`, so without this a second fast paste while the
    // first upload is still in flight would race it: both URLs would land
    // in sessionUploadedUrls but only the second ever reaches the model,
    // leaking the first in storage.
    if (pending.value) return;

    // Fast-fail client-side check - the server still re-validates by
    // sniffing the actual bytes, so this is UX only, not the source of
    // truth.
    const validationError = validateFile(file);
    if (validationError) {
      error.value = validationError;
      return;
    }

    error.value = null;
    pending.value = true;

    const previousValue = props.modelValue;
    const previousWasSessionUploaded = !!previousValue && sessionUploadedUrls.has(previousValue);

    try {
      const { url } = await uploadImage(file);
      sessionUploadedUrls.add(url);
      emit("update:modelValue", url);

      // Replace: only delete the old value after the new upload succeeds -
      // never before, so a failed upload leaves the old image intact - and
      // only if we uploaded that old value ourselves this session.
      if (previousWasSessionUploaded && previousValue) {
        sessionUploadedUrls.delete(previousValue);
        deleteUploadedImage(previousValue).catch(() => {
          // Best-effort: storage delete failing must never surface to the
          // user or block anything they're doing.
        });
      }
    } catch {
      // A translated message only, never the raw server error: every other
      // user-facing string in this app comes from t(...), and the client
      // pre-check above already catches oversize/bad-mime in the normal
      // case, so a server-side failure here is rare enough (spoofed file,
      // storage misconfigured) that a generic message is the right amount
      // of specificity.
      error.value = t("forms.imageUpload.errors.uploadFailed");
    } finally {
      pending.value = false;
    }
  }

  function onFileSelected(fileOrFiles: File | File[] | null) {
    const file = Array.isArray(fileOrFiles) ? fileOrFiles[0] : fileOrFiles;
    if (!file) return;
    void uploadFile(file);
  }

  // Primary clipboard path: the native `paste` event, broad browser support
  // and no permission prompt. Registered on `document` (not a container
  // element in the component template) so Ctrl+V works no matter which
  // field on the page currently has focus - a `@paste` listener scoped to
  // just this widget's own elements would require the user to first click
  // into it, which isn't how paste-an-image UX normally works. Only events
  // that actually carry an image file are intercepted; anything else (plain
  // text pasted into some other field) is left alone.
  function handleDocumentPaste(event: ClipboardEvent) {
    const file = Array.from(event.clipboardData?.files ?? []).find(candidate =>
      candidate.type.startsWith("image/")
    );
    if (!file) return;
    event.preventDefault();
    void uploadFile(file);
  }

  onMounted(() => {
    canUseClipboardReadApi.value =
      typeof navigator !== "undefined" &&
      !!navigator.clipboard &&
      typeof navigator.clipboard.read === "function";

    document.addEventListener("paste", handleDocumentPaste);
  });

  onScopeDispose(() => {
    document.removeEventListener("paste", handleDocumentPaste);
  });

  // Secondary "Paste from clipboard" button path: `navigator.clipboard.read()`.
  // Three distinct outcomes get three distinct messages - never collapsed
  // into one generic error:
  //   (a) API unsupported -> canUseClipboardReadApi is false, component
  //       hides/disables the button entirely, this never even gets called.
  //   (b) NotAllowedError (permission denied) -> specific message.
  //   (c) supported + permitted but nothing image/* on the clipboard ->
  //       "nothing to paste" message.
  async function pasteFromClipboard() {
    if (!canUseClipboardReadApi.value) return;

    error.value = null;
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find(type => type.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          const file = new File([blob], "pasted-image", { type: imageType });
          await uploadFile(file);
          return;
        }
      }
      error.value = t("forms.imageUpload.errors.clipboardEmpty");
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        error.value = t("forms.imageUpload.errors.clipboardDenied");
      } else {
        error.value = t("forms.imageUpload.errors.clipboardEmpty");
      }
    }
  }

  function remove() {
    const currentValue = props.modelValue;
    emit("update:modelValue", null);

    if (currentValue && sessionUploadedUrls.has(currentValue)) {
      sessionUploadedUrls.delete(currentValue);
      deleteUploadedImage(currentValue).catch(() => {
        // Best-effort, same as the replace path above.
      });
    }
  }

  return {
    pending,
    error,
    canUseClipboardReadApi,
    onFileSelected,
    pasteFromClipboard,
    remove
  };
}
