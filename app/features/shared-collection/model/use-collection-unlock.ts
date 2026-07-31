import { ref } from "vue";

import { unlockSharedCollection, type SharedLinkItem } from "~/shared/api";

export function useCollectionUnlock(slug: string) {
  const { t } = useI18n();

  const password = ref("");
  const pending = ref(false);
  const errorMessage = ref<string | null>(null);

  // No attempt limiting, by design - a guest can retry with no cap. Doesn't
  // distinguish a wrong-password 403 from a 404/network failure; for this
  // feature's low-stakes scope both read as "try again", so both surface the
  // same message.
  async function submit(): Promise<SharedLinkItem[] | null> {
    if (pending.value) return null;

    errorMessage.value = null;
    pending.value = true;

    try {
      return await unlockSharedCollection(slug, password.value);
    } catch {
      errorMessage.value = t("sharedCollection.passwordPrompt.incorrect");
      return null;
    } finally {
      pending.value = false;
    }
  }

  return { password, pending, errorMessage, submit };
}
