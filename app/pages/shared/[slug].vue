<script lang="ts" setup>
import type { SharedLinkItem } from "~/shared/api";

import { SharedLinkCard } from "~/features/shared-collection";
import { useSharedCollection } from "~/shared/api";

const { t } = useI18n();
const route = useRoute();
const slug = route.params.slug as string;

const {
  collection,
  error: collectionError,
  isNotFound: collectionIsNotFound
} = await useSharedCollection(slug);

const requestFetch = useRequestFetch();
const { data: links, error: linksError } = await useAsyncData(`shared-links-${slug}`, () =>
  requestFetch<SharedLinkItem[]>(`/api/shared/${slug}/links`)
);

const error = computed(() => collectionError.value ?? linksError.value);
const isNotFound = computed(
  () => collectionIsNotFound.value || linksError.value?.statusCode === 404
);
</script>

<template>
  <v-container>
    <v-alert v-if="error" type="error" class="mb-4">{{
      isNotFound ? t("sharedCollection.notFound") : t("sharedCollection.loadFailed")
    }}</v-alert>

    <template v-else-if="collection">
      <div class="mb-4">
        <h1>{{ collection.name }}</h1>
        <p v-if="collection.description" class="text-medium-emphasis">
          {{ collection.description }}
        </p>
      </div>

      <v-alert v-if="!links?.length" type="info">{{ t("sharedCollection.empty") }}</v-alert>

      <v-row v-else>
        <v-col v-for="link in links" :key="link.id" cols="12" sm="6" md="4">
          <SharedLinkCard :link="link" />
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>
