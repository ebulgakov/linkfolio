<script lang="ts" setup>
import type { Collection } from "~/shared/api";

import { CollectionForm } from "~/features/collection-form";

definePageMeta({ middleware: "auth" });

const { t } = useI18n();
const route = useRoute();
const id = route.params.id as string;

const requestFetch = useRequestFetch();
const { data: collection, error } = await useAsyncData(`collection-${id}`, () =>
  requestFetch<Collection>(`/api/collections/${id}`)
);
</script>

<template>
  <v-container>
    <v-alert v-if="error" type="error" class="mb-4">{{ t("collections.errors.notFound") }}</v-alert>

    <template v-else-if="collection">
      <h1 class="mb-4">{{ t("pages.editCollection.title") }}</h1>
      <CollectionForm :collection="collection" />
    </template>
  </v-container>
</template>
