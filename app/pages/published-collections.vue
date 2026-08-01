<script lang="ts" setup>
import {
  PublishedCollectionCard,
  usePublishedCollectionsSearch
} from "~/features/published-collections";
import { usePublishedCollections } from "~/shared/api";

const { t } = useI18n();

const { data: collections, error } = await usePublishedCollections();
const { query, results } = usePublishedCollectionsSearch(collections);
</script>

<template>
  <v-container>
    <h1 class="mb-4">{{ t("pages.publishedCollections.title") }}</h1>

    <v-text-field
      v-model="query"
      :label="t('pages.publishedCollections.searchLabel')"
      prepend-inner-icon="mdi-magnify"
      clearable
      class="mb-4"
    />

    <v-alert v-if="error" type="error" class="mb-4">{{
      t("pages.publishedCollections.loadFailed")
    }}</v-alert>

    <template v-else>
      <v-alert v-if="!results.length" type="info">{{
        t("pages.publishedCollections.empty")
      }}</v-alert>

      <v-row v-else>
        <v-col v-for="collection in results" :key="collection.id" cols="12" sm="6" md="4">
          <PublishedCollectionCard :collection="collection" />
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>
