<script lang="ts" setup>
import type { Collection } from "~/shared/api";

import { CollectionForm } from "~/features/collection-form";
import { useAuth } from "~/shared/api";

definePageMeta({ middleware: "auth" });

const { t } = useI18n();
const route = useRoute();
const id = route.params.id as string;

// The `auth` middleware already guarantees a session exists (it redirects
// otherwise), but doesn't expose the resolved session to the page. Re-resolve
// it here via the same useAuth()/getSession() call the middleware uses, so
// the cache key below can be scoped per-user identically on SSR and client.
const { data: session } = await useAuth().getSession();

const requestFetch = useRequestFetch();
const { data: collection, error } = await useAsyncData(`collection-${session?.user.id}-${id}`, () =>
  requestFetch<Collection>(`/api/collections/${id}`)
);

const isNotFound = computed(() => error.value?.statusCode === 404);
</script>

<template>
  <v-container>
    <v-alert v-if="error" type="error" class="mb-4">{{
      isNotFound ? t("collections.errors.notFound") : t("collections.errors.loadFailed")
    }}</v-alert>

    <template v-else-if="collection">
      <h1 class="mb-4">{{ t("pages.editCollection.title") }}</h1>
      <CollectionForm :collection="collection" />
    </template>
  </v-container>
</template>
