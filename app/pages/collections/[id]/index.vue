<script lang="ts" setup>
import type { LinkItem } from "~/shared/api";

import { LinkCard, useCollectionLinks } from "~/features/collection-links";
import { CollectionShareLink } from "~/features/collection-share-link";
import { useCollection } from "~/shared/api";
import { Alert, CollectionCard } from "~/shared/ui";

definePageMeta({ middleware: "auth" });

const { t } = useI18n();
const route = useRoute();
const id = route.params.id as string;

const {
  collection,
  error: collectionError,
  isNotFound: collectionIsNotFound,
  userId
} = await useCollection(id);

const requestFetch = useRequestFetch();
const {
  data: links,
  error: linksError,
  refresh: refreshLinksData
} = await useAsyncData(`collection-links-${userId}-${id}`, () =>
  requestFetch<LinkItem[]>(`/api/collections/${id}/links`)
);

// The links endpoint 404s independently on a missing/foreign collection id
// (see server/api/collections/[id]/links/index.get.ts), so either fetch can
// be the source of the not-found/error state - both must be checked.
const error = computed(() => collectionError.value ?? linksError.value);
const isNotFound = computed(
  () => collectionIsNotFound.value || linksError.value?.statusCode === 404
);

// useAsyncData's refresh() never rejects on a fetch failure - it catches the
// error internally into `error.value` and resolves. Re-throwing here is what
// lets useCollectionLinks' onDeleted catch actually see the failure and
// surface it via refreshError. Only the links list is re-fetched (not the
// collection) since deleting a link cannot affect the collection's name or
// description.
async function refreshLinks() {
  await refreshLinksData();
  if (linksError.value) throw linksError.value;
}

const {
  isDialogOpen,
  deletePending,
  errorMessage: deleteErrorMessage,
  refreshError,
  requestDelete,
  confirmDelete
} = useCollectionLinks(id, refreshLinks);
</script>

<template>
  <v-container>
    <!--
      Gated on `!error`: a refresh failure sets both refreshError (via
      refreshLinks() re-throwing) and linksError (which feeds the combined
      `error` computed below) - without this guard the two alerts below
      would stack and say the same thing twice.
    -->
    <Alert
      v-if="refreshError && !error"
      type="error"
      class="mb-4"
      closable
      @click:close="refreshError = null"
      >{{ refreshError }}</Alert
    >

    <Alert v-if="error" type="error" class="mb-4">{{
      isNotFound ? t("collections.errors.notFound") : t("collections.errors.loadFailed")
    }}</Alert>

    <template v-else-if="collection">
      <CollectionCard
        :to="`/shared/${collection.slug}`"
        :title="collection.name"
        :description="collection.description"
        :image-url="collection.imageUrl"
        class="mb-4"
      >
        <template #overlay>
          <div class="d-flex ga-2">
            <v-chip v-if="collection.shared" size="small" color="primary">{{
              t("collections.list.sharedBadge")
            }}</v-chip>
            <v-chip v-if="collection.published" size="small" color="secondary">{{
              t("collections.list.publishedBadge")
            }}</v-chip>
          </div>
          <v-btn :to="`/collections/${id}/links/new`" color="primary">{{
            t("links.list.addButton")
          }}</v-btn>
        </template>
      </CollectionCard>

      <CollectionShareLink
        v-if="collection.shared || collection.published"
        :slug="collection.slug"
      />

      <Alert v-if="!links?.length" type="info">{{ t("links.list.empty") }}</Alert>

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
          <Alert v-if="deleteErrorMessage" type="error" class="mt-4">{{
            deleteErrorMessage
          }}</Alert>
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
