<script lang="ts" setup>
import type { Collection, LinkItem } from "~/shared/api";

import { LinkCard, useCollectionLinks } from "~/features/collection-links";
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
const { data, error, refresh } = await useAsyncData(
  `collection-detail-${session?.user.id}-${id}`,
  () =>
    Promise.all([
      requestFetch<Collection>(`/api/collections/${id}`),
      requestFetch<LinkItem[]>(`/api/collections/${id}/links`)
    ])
);

const collection = computed(() => data.value?.[0]);
const links = computed(() => data.value?.[1]);

const isNotFound = computed(() => error.value?.statusCode === 404);

const {
  isDialogOpen,
  deletePending,
  errorMessage: deleteErrorMessage,
  refreshError,
  requestDelete,
  confirmDelete
} = useCollectionLinks(id, () => refresh());
</script>

<template>
  <v-container>
    <v-alert
      v-if="refreshError"
      type="error"
      class="mb-4"
      closable
      @click:close="refreshError = null"
      >{{ refreshError }}</v-alert
    >

    <v-alert v-if="error" type="error" class="mb-4">{{
      isNotFound ? t("collections.errors.notFound") : t("collections.errors.loadFailed")
    }}</v-alert>

    <template v-else-if="collection">
      <div class="d-flex align-center justify-space-between mb-4">
        <div>
          <h1>{{ collection.name }}</h1>
          <p v-if="collection.description" class="text-medium-emphasis">
            {{ collection.description }}
          </p>
        </div>
        <v-btn :to="`/collections/${id}/links/new`" color="primary">{{
          t("links.list.addButton")
        }}</v-btn>
      </div>

      <v-alert v-if="!links?.length" type="info">{{ t("links.list.empty") }}</v-alert>

      <v-row v-else>
        <v-col v-for="link in links" :key="link.id" cols="12" sm="6" md="4">
          <LinkCard :link="link" :collection-id="id" @delete="requestDelete" />
        </v-col>
      </v-row>
    </template>

    <v-dialog v-model="isDialogOpen" max-width="480">
      <v-card>
        <v-card-title>{{ t("links.deleteConfirm.title") }}</v-card-title>
        <v-card-text>
          {{ t("links.deleteConfirm.message") }}
          <v-alert v-if="deleteErrorMessage" type="error" class="mt-4">{{
            deleteErrorMessage
          }}</v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="isDialogOpen = false">{{ t("links.deleteConfirm.cancel") }}</v-btn>
          <v-btn color="error" :loading="deletePending" @click="confirmDelete">{{
            t("links.deleteConfirm.confirm")
          }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
