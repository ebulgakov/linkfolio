<script lang="ts" setup>
import { usePublishedCollectionsSearch } from "~/features/published-collections";
import { usePublishedCollections } from "~/shared/api";
import { Alert, CollectionCard, Input } from "~/shared/ui";

const { t } = useI18n();

const { data: collections, error } = await usePublishedCollections();
const { query, results } = usePublishedCollectionsSearch(collections);
</script>

<template>
  <v-container>
    <h1 class="mb-4">{{ t("pages.publishedCollections.title") }}</h1>

    <Input
      v-model="query"
      :label="t('pages.publishedCollections.searchLabel')"
      prepend-inner-icon="mdi-magnify"
      clearable
      class="mb-4"
    />

    <Alert v-if="error" type="error" class="mb-4">{{
      t("pages.publishedCollections.loadFailed")
    }}</Alert>

    <template v-else>
      <Alert v-if="!results.length" type="info">{{ t("pages.publishedCollections.empty") }}</Alert>

      <v-row v-else>
        <v-col v-for="collection in results" :key="collection.id" cols="12" sm="6" md="4">
          <CollectionCard
            :to="`/shared/${collection.slug}`"
            :title="collection.name"
            :description="collection.description"
            :image-url="collection.imageUrl"
          />
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>
