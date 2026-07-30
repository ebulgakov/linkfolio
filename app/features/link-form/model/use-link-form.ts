import { computed, onScopeDispose, reactive, ref, watch } from "vue";

import {
  createLink,
  extractLinkFieldErrors,
  fetchLinkPreview,
  updateLink,
  type LinkCreateInput,
  type LinkFieldErrors,
  type LinkItem,
  type LinkPreview,
  type LinkUpdateInput
} from "~/shared/api";
import { url as urlValidator } from "~/shared/lib";

const LINK_PREVIEW_DEBOUNCE_MS = 400;

export type PreviewStatus = "idle" | "checking" | "fetched" | "failed";

function isValidUrlFormat(value: string): boolean {
  return value.trim() !== "" && urlValidator("")(value) === true;
}

export function useLinkForm(collectionId: string, existing?: LinkItem) {
  const { t } = useI18n();

  const isEditing = !!existing;
  const mode = isEditing ? "edit" : "create";

  const form = reactive({
    url: existing?.url ?? "",
    title: existing?.title ?? "",
    description: existing?.description ?? "",
    imageUrl: existing?.imageUrl ?? ""
  });

  // Once the user manually edits one of these fields, an incoming preview
  // response must stop overwriting it - only fields still at their
  // pristine/untouched value get filled in from the preview.
  const titleDirty = ref(false);
  const descriptionDirty = ref(false);
  const imageUrlDirty = ref(false);

  const previewStatus = ref<PreviewStatus>("idle");

  const pending = ref(false);
  const errorMessage = ref<string | null>(null);
  const errors = ref<LinkFieldErrors>({});

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  // Same request-token pattern as `scheduleSlugCheck` in
  // use-collection-form.ts: bumped on every url change (including the
  // early-return branches), so an in-flight preview request for a
  // since-superseded url can never land and overwrite a newer status.
  let requestId = 0;

  function clearDebounceTimer() {
    if (debounceTimer !== undefined) {
      clearTimeout(debounceTimer);
      debounceTimer = undefined;
    }
  }

  function applyPreview(preview: LinkPreview) {
    if (!titleDirty.value) form.title = preview.title ?? "";
    if (!descriptionDirty.value) form.description = preview.description ?? "";
    if (!imageUrlDirty.value) form.imageUrl = preview.imageUrl ?? "";
  }

  function schedulePreviewFetch(value: string) {
    clearDebounceTimer();

    requestId += 1;
    const token = requestId;

    if (!isValidUrlFormat(value)) {
      previewStatus.value = "idle";
      return;
    }

    previewStatus.value = "checking";
    debounceTimer = setTimeout(() => {
      debounceTimer = undefined;

      fetchLinkPreview(value)
        .then(preview => {
          if (token !== requestId) return; // stale response, discard
          previewStatus.value = preview.fetchStatus;
          // The endpoint returns 200 with fetchStatus: "failed" as a valid
          // result (not a thrown error) - only prefill on an actual fetch.
          if (preview.fetchStatus === "fetched") {
            applyPreview(preview);
          }
        })
        .catch(() => {
          if (token !== requestId) return; // stale response, discard
          previewStatus.value = "failed";
        });
    }, LINK_PREVIEW_DEBOUNCE_MS);
  }

  // Structural skip, not an early-return inside the watcher: in edit mode
  // `url` is fixed from `existing.url` and the preview flow must never run,
  // not even once - so the watcher is simply never wired up.
  if (!isEditing) {
    watch(
      () => form.url,
      value => {
        schedulePreviewFetch(value);
      }
    );
  }

  onScopeDispose(() => {
    clearDebounceTimer();
  });

  function onTitleInput(value: string) {
    titleDirty.value = true;
    form.title = value;
  }

  function onDescriptionInput(value: string) {
    descriptionDirty.value = true;
    form.description = value;
  }

  function onImageUrlInput(value: string) {
    imageUrlDirty.value = true;
    form.imageUrl = value;
  }

  // Unlike the slug-availability check (which blocks submission because a
  // taken slug is a hard conflict), the link preview is only a convenience
  // prefill for title/description/imageUrl - it never blocks a valid
  // submission. So `submitDisabled` only reflects the submit-in-flight
  // state, not `previewStatus`.
  const submitDisabled = computed(() => pending.value);

  function toCreatePayload(): LinkCreateInput {
    const title = form.title.trim();
    const description = form.description.trim();
    const imageUrl = form.imageUrl.trim();
    return {
      url: form.url.trim(),
      title: title || undefined,
      description: description || undefined,
      imageUrl: imageUrl || undefined
    };
  }

  function toUpdatePayload(): LinkUpdateInput {
    const title = form.title.trim();
    const description = form.description.trim();
    const imageUrl = form.imageUrl.trim();
    return {
      title: title || null,
      description: description || null,
      imageUrl: imageUrl || null
    };
  }

  async function submit() {
    if (pending.value) return;

    errorMessage.value = null;
    errors.value = {};
    pending.value = true;

    try {
      if (isEditing) {
        await updateLink(collectionId, existing!.id, toUpdatePayload());
      } else {
        await createLink(collectionId, toCreatePayload());
      }
      await navigateTo(`/collections/${collectionId}`);
    } catch (error) {
      const fieldErrors = extractLinkFieldErrors(error);
      if (fieldErrors) {
        errors.value = fieldErrors;
      } else {
        errorMessage.value = t("errors.generic");
      }
    } finally {
      pending.value = false;
    }
  }

  return {
    mode,
    isEditing,
    form,
    pending,
    errorMessage,
    errors,
    previewStatus,
    submitDisabled,
    onTitleInput,
    onDescriptionInput,
    onImageUrlInput,
    submit
  };
}
