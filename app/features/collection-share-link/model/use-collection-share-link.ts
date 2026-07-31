import { useClipboard } from "~/shared/lib";

const COPY_ERROR_RESET_MS = 3000;

export function useCollectionShareLink(slug: string) {
  const requestUrl = useRequestURL();
  const shareUrl = computed(() => `${requestUrl.origin}/shared/${slug}`);
  const { copy, copied } = useClipboard();

  const copyFailed = ref(false);
  let resetTimeout: ReturnType<typeof setTimeout> | null = null;

  async function onCopyClick() {
    try {
      await copy(shareUrl.value);
    } catch {
      copyFailed.value = true;
      if (resetTimeout) clearTimeout(resetTimeout);
      resetTimeout = setTimeout(() => {
        copyFailed.value = false;
      }, COPY_ERROR_RESET_MS);
    }
  }

  return { shareUrl, copied, copyFailed, onCopyClick };
}
