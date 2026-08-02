<script lang="ts" setup>
import type { SharedLinkItem } from "~/shared/api";

import { CollectionPasswordPrompt, SharedLinkCard } from "~/features/shared-collection";
import { useSharedCollection } from "~/shared/api";
import { Alert } from "~/shared/ui";

const { t } = useI18n();
const route = useRoute();
const slug = route.params.slug as string;

const {
  collection,
  error: collectionError,
  isNotFound: collectionIsNotFound
} = await useSharedCollection(slug);

// A password-protected collection the caller hasn't unlocked yet (no valid
// cookie forwarded with this request) skips the links fetch entirely rather
// than firing it and catching the resulting 403 - simpler branching, and it
// keeps `linksError` free for the existing notFound/loadFailed handling
// below instead of teaching it about a third status code.
const needsUnlock = computed(() => !!collection.value?.hasPassword && !collection.value.unlocked);

const requestFetch = useRequestFetch();
const { data: links, error: linksError } = await useAsyncData(
  `shared-links-${slug}`,
  () => requestFetch<SharedLinkItem[]>(`/api/shared/${slug}/links`),
  { immediate: !needsUnlock.value }
);

// Populated by CollectionPasswordPrompt's `unlocked` emit once the guest
// submits the correct password client-side - `links` above was never
// fetched (immediate: false) in that case.
const unlockedLinks = ref<SharedLinkItem[] | null>(null);
const justUnlocked = ref(false);

function onUnlocked(result: SharedLinkItem[]) {
  unlockedLinks.value = result;
  justUnlocked.value = true;
}

const displayLinks = computed(() => unlockedLinks.value ?? links.value);
const error = computed(() => collectionError.value ?? linksError.value);
const isNotFound = computed(
  () => collectionIsNotFound.value || linksError.value?.statusCode === 404
);
</script>

<template>
  <v-container>
    <Alert v-if="error" type="error" class="mb-4">{{
      isNotFound ? t("sharedCollection.notFound") : t("sharedCollection.loadFailed")
    }}</Alert>

    <template v-else-if="collection">
      <div class="mb-4">
        <h1>{{ collection.name }}</h1>
        <p v-if="collection.description" class="text-medium-emphasis">
          {{ collection.description }}
        </p>
      </div>

      <CollectionPasswordPrompt
        v-if="needsUnlock && !justUnlocked"
        :slug="slug"
        @unlocked="onUnlocked"
      />

      <template v-else>
        <Alert v-if="!displayLinks?.length" type="info">{{ t("sharedCollection.empty") }}</Alert>

        <v-row v-else>
          <v-col v-for="link in displayLinks" :key="link.id" cols="12" sm="6" md="4">
            <SharedLinkCard :link="link" />
          </v-col>
        </v-row>
      </template>
    </template>
  </v-container>
</template>
