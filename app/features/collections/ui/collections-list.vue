<script lang="ts" setup>
import { useCollections, useDeleteCollection } from "~/features/collections";
import { useAuth } from "~/shared/api";

const { t } = useI18n();

// Re-resolves the session so it can scope the useAsyncData cache key
// identically on SSR and client (the page rendering this may or may not
// have already guaranteed a session via the `auth` middleware).
const { data: session } = await useAuth().getSession();

const {
  data: collections,
  pending,
  error,
  refresh: refreshCollectionsData
} = await useCollections(session?.user.id);

// useAsyncData's refresh() never rejects on a fetch failure - it catches the
// error internally into `error.value` and resolves. Re-throwing here is what
// lets useDeleteCollection's onDeleted actually see the failure and surface
// it via refreshError.
async function refreshCollections() {
  await refreshCollectionsData();
  if (error.value) throw error.value;
}

const {
  isDialogOpen,
  deletePending,
  errorMessage: deleteErrorMessage,
  refreshError,
  requestDelete,
  confirmDelete
} = useDeleteCollection(refreshCollections);
</script>

<template>
  <v-container>
    <div class="d-flex align-center justify-space-between mb-4">
      <h1>{{ t("pages.collections.title") }}</h1>
      <v-btn to="/new-collection" color="primary">{{ t("collections.list.createLink") }}</v-btn>
    </div>

    <!--
      Gated on `!error`: a refresh failure sets both refreshError (via
      refreshCollections() re-throwing) and error (the useCollections fetch
      error) - without this guard the two alerts below would stack and say
      the same thing twice.
    -->
    <v-alert
      v-if="refreshError && !error"
      type="error"
      class="mb-4"
      closable
      @click:close="refreshError = null"
      >{{ refreshError }}</v-alert
    >

    <v-alert v-if="error" type="error" class="mb-4">{{ t("errors.generic") }}</v-alert>

    <template v-else-if="!pending">
      <v-alert v-if="!collections?.length" type="info">{{ t("collections.list.empty") }}</v-alert>

      <v-list v-else lines="two">
        <!-- v-list-item intentionally has no `:to` prop here: that would render the
        whole row as a native <a>, and nesting the edit NuxtLink (in #append) inside
        it would be an anchor-in-anchor, which is invalid HTML and breaks keyboard/
        screen-reader navigation. Instead the title itself is the navigation link,
        and the edit link is a sibling — not a descendant of another anchor. -->
        <v-list-item v-for="collection in collections" :key="collection.id">
          <template #title>
            <NuxtLink
              :to="`/collections/${collection.id}`"
              class="d-flex align-center ga-2 text-decoration-none text-high-emphasis"
            >
              {{ collection.name }}
              <v-chip v-if="collection.shared" size="small" color="primary">{{
                t("collections.list.sharedBadge")
              }}</v-chip>
              <v-chip v-if="collection.published" size="small" color="secondary">{{
                t("collections.list.publishedBadge")
              }}</v-chip>
            </NuxtLink>
          </template>
          <template #subtitle>{{ collection.description }}</template>
          <template #append>
            <div class="d-flex align-center ga-2">
              <NuxtLink :to="`/collections/${collection.id}/edit`" class="text-primary">{{
                t("collections.list.editLink")
              }}</NuxtLink>
              <v-btn
                icon="mdi-delete"
                variant="text"
                color="error"
                size="small"
                :aria-label="t('collections.list.deleteButton')"
                @click="requestDelete(collection.id)"
              />
            </div>
          </template>
        </v-list-item>
      </v-list>
    </template>

    <v-dialog v-model="isDialogOpen" max-width="480">
      <v-card>
        <v-card-title>{{ t("collections.deleteConfirm.title") }}</v-card-title>
        <v-card-text>
          {{ t("collections.deleteConfirm.message") }}
          <v-alert v-if="deleteErrorMessage" type="error" class="mt-4">{{
            deleteErrorMessage
          }}</v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="isDialogOpen = false">{{ t("collections.deleteConfirm.cancel") }}</v-btn>
          <v-btn color="error" :loading="deletePending" @click="confirmDelete">{{
            t("collections.deleteConfirm.confirm")
          }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
