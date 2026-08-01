import Fuse from "fuse.js";
import { computed, ref, type Ref } from "vue";

import type { PublishedCollection } from "~/shared/api";

export function usePublishedCollectionsSearch(source: Ref<PublishedCollection[]>) {
  const query = ref("");

  // Recomputed only when `source` itself changes (not on every keystroke) -
  // rebuilding the Fuse index is the expensive part, so it's keyed off the
  // data, while `results` below re-filters the already-built index on every
  // query change.
  const fuse = computed(
    () => new Fuse(source.value, { keys: ["name", "description"], threshold: 0.4 })
  );

  const results = computed(() => {
    if (!query.value.trim()) return source.value;
    return fuse.value.search(query.value).map(result => result.item);
  });

  return { query, results };
}
