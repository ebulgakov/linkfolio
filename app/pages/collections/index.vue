<script lang="ts" setup>
import type { Collection } from "~/shared/api";

definePageMeta({ middleware: "auth" });

const { t } = useI18n();

const requestFetch = useRequestFetch();
const {
  data: collections,
  pending,
  error
} = await useAsyncData("collections", () => requestFetch<Collection[]>("/api/collections"));
</script>

<template>
  <v-container>
    <div class="d-flex align-center justify-space-between mb-4">
      <h1>{{ t("pages.collections.title") }}</h1>
      <v-btn to="/new-collection" color="primary">{{ t("collections.list.createLink") }}</v-btn>
    </div>

    <v-alert v-if="error" type="error" class="mb-4">{{ t("errors.generic") }}</v-alert>

    <template v-else-if="!pending">
      <v-alert v-if="!collections?.length" type="info">{{ t("collections.list.empty") }}</v-alert>

      <v-list v-else lines="two">
        <v-list-item
          v-for="collection in collections"
          :key="collection.id"
          :to="`/collections/${collection.id}`"
        >
          <template #title>
            <span class="d-flex align-center ga-2">
              {{ collection.name }}
              <v-chip v-if="collection.shared" size="small" color="primary">{{
                t("collections.list.sharedBadge")
              }}</v-chip>
            </span>
          </template>
          <template #subtitle>{{ collection.description }}</template>
          <template #append>
            <NuxtLink :to="`/collections/${collection.id}/edit`" class="text-primary" @click.stop>{{
              t("collections.list.editLink")
            }}</NuxtLink>
          </template>
        </v-list-item>
      </v-list>
    </template>
  </v-container>
</template>
