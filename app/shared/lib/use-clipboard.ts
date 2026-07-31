const COPIED_RESET_MS = 2000;

export function useClipboard() {
  const copied = ref(false);
  let resetTimeout: ReturnType<typeof setTimeout> | null = null;

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    copied.value = true;
    if (resetTimeout) clearTimeout(resetTimeout);
    resetTimeout = setTimeout(() => {
      copied.value = false;
    }, COPIED_RESET_MS);
  }

  return { copy, copied };
}
