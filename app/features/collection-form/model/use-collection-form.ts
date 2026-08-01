import { computed, onScopeDispose, reactive, ref, watch } from "vue";

import {
  checkSlugAvailability,
  createCollection,
  extractFieldErrors,
  updateCollection,
  type Collection,
  type CollectionInput,
  type FieldErrors
} from "~/shared/api";
import { slug as slugValidator } from "~/shared/lib";

const SLUG_CHECK_DEBOUNCE_MS = 400;

export type SlugStatus = "idle" | "checking" | "free" | "taken" | "invalid";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/g, "");
}

function isValidSlugFormat(value: string): boolean {
  return slugValidator("")(value) === true;
}

export function useCollectionForm(existing?: Collection) {
  const { t } = useI18n();

  const isEditing = !!existing;
  const mode = isEditing ? "edit" : "create";

  const form = reactive({
    name: existing?.name ?? "",
    description: existing?.description ?? "",
    shared: existing?.shared ?? false,
    slug: existing?.slug ?? "",
    password: existing?.password ?? "",
    published: existing?.published ?? false,
    imageUrl: existing?.imageUrl ?? ""
  });

  // Tri-state visibility for the password field: hidden by default, shown
  // once the collection is shared, hidden again once it's published (a
  // published collection is publicly listed, so a password gate on it would
  // be misleading). Not clearing form.password when hidden is deliberate -
  // see toPayload() below.
  const showPassword = computed(() => form.shared && !form.published);

  // In edit mode the slug is already "set" by the existing collection, so
  // auto-sync from `name` must not kick in on load — treat it as if the
  // user already touched the slug field. In create mode auto-sync is on
  // until the user directly edits the slug field.
  const slugDirty = ref(isEditing);

  // 'invalid' is a distinct state from 'idle' so the UI can tell "hasn't
  // been checked yet" apart from "current value fails the format rules and
  // was never sent to the server" - both read as "no spinner/check/cross"
  // but 'invalid' lets the component skip showing a stale status message.
  const slugStatus = ref<SlugStatus>(isEditing && form.slug === existing!.slug ? "free" : "idle");

  const pending = ref(false);
  const errorMessage = ref<string | null>(null);
  const errors = ref<FieldErrors>({});
  const showShareWarning = ref(false);

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  // Incremented each time an availability request actually fires (i.e.
  // after the debounce delay elapses), not when a check is merely
  // scheduled. A response is only applied if its captured token still
  // matches the latest at resolution time - stale (out-of-order) responses
  // are silently discarded. This is a request-token compare, not
  // AbortController, so it stays testable with vi.useFakeTimers() plus
  // manually-controlled deferred promises.
  let requestId = 0;

  function clearDebounceTimer() {
    if (debounceTimer !== undefined) {
      clearTimeout(debounceTimer);
      debounceTimer = undefined;
    }
  }

  function scheduleSlugCheck(value: string) {
    clearDebounceTimer();

    // Bump the token on every slug change - including the early-return
    // branches below - so an in-flight request from a since-superseded
    // value can never land and overwrite a newer status. Only the timeout
    // callback below actually fires a network call, but every path that
    // can change `slugStatus` later must be gated behind this token.
    requestId += 1;
    const token = requestId;

    if (!isValidSlugFormat(value)) {
      slugStatus.value = "invalid";
      return;
    }

    // The collection's own current slug never collides with itself - skip
    // the network round trip entirely rather than flag it as taken.
    if (isEditing && value === existing!.slug) {
      slugStatus.value = "free";
      return;
    }

    slugStatus.value = "checking";
    debounceTimer = setTimeout(() => {
      debounceTimer = undefined;

      checkSlugAvailability(value, isEditing ? existing!.id : undefined)
        .then(({ available }) => {
          if (token !== requestId) return; // stale response, discard
          slugStatus.value = available ? "free" : "taken";
        })
        .catch(() => {
          if (token !== requestId) return; // stale response, discard
          slugStatus.value = "idle";
        });
    }, SLUG_CHECK_DEBOUNCE_MS);
  }

  watch(
    () => form.name,
    name => {
      if (!slugDirty.value) {
        form.slug = slugify(name);
      }
    }
  );

  watch(
    () => form.slug,
    value => {
      scheduleSlugCheck(value);
    }
  );

  onScopeDispose(() => {
    clearDebounceTimer();
  });

  function onSlugInput(value: string) {
    slugDirty.value = true;
    form.slug = value;
  }

  const submitDisabled = computed(
    () => pending.value || slugStatus.value === "checking" || slugStatus.value === "taken"
  );

  function needsShareWarning(): boolean {
    return (
      isEditing && (!!existing!.shared || !!existing!.published) && form.slug !== existing!.slug
    );
  }

  function toPayload(): CollectionInput {
    const trimmedDescription = form.description.trim();
    return {
      name: form.name.trim(),
      description: trimmedDescription || null,
      shared: form.shared,
      slug: form.slug,
      password: form.password.trim() || null,
      published: form.published,
      imageUrl: form.imageUrl.trim() || null
    };
  }

  async function performSubmit() {
    if (pending.value) return;

    errorMessage.value = null;
    errors.value = {};
    pending.value = true;

    try {
      if (isEditing) {
        await updateCollection(existing!.id, toPayload());
        await navigateTo("/");
      } else {
        const created = await createCollection(toPayload());
        await navigateTo(`/collections/${created.id}`);
      }
    } catch (error) {
      const fieldErrors = extractFieldErrors(error);
      if (fieldErrors) {
        errors.value = fieldErrors;
      } else {
        errorMessage.value = t("errors.generic");
      }
    } finally {
      pending.value = false;
    }
  }

  async function submit() {
    if (needsShareWarning()) {
      showShareWarning.value = true;
      return;
    }
    await performSubmit();
  }

  async function confirmAndSubmit() {
    showShareWarning.value = false;
    await performSubmit();
  }

  function cancelShareWarning() {
    showShareWarning.value = false;
  }

  return {
    mode,
    isEditing,
    form,
    pending,
    errorMessage,
    errors,
    slugStatus,
    submitDisabled,
    showShareWarning,
    showPassword,
    onSlugInput,
    submit,
    confirmAndSubmit,
    cancelShareWarning
  };
}
