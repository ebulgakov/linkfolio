<script lang="ts" setup>
import { useCollections, useDeleteCollection } from "~/features/collections";
import { useAuth } from "~/shared/api";
import { Alert, CollectionCard } from "~/shared/ui";

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
    <Alert
      v-if="refreshError && !error"
      type="error"
      class="mb-4"
      closable
      @click:close="refreshError = null"
      >{{ refreshError }}</Alert
    >

    <Alert v-if="error" type="error" class="mb-4">{{ t("errors.generic") }}</Alert>

    <template v-else-if="!pending">
      <Alert v-if="!collections?.length" type="info">{{ t("collections.list.empty") }}</Alert>

      <v-row v-else>
        <v-col v-for="collection in collections" :key="collection.id" cols="12" sm="6" md="4">
          <CollectionCard
            :to="`/collections/${collection.id}`"
            :title="collection.name"
            :description="collection.description"
            :image-url="collection.imageUrl"
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
              <div class="d-flex align-center ga-2">
                <v-btn
                  :to="`/collections/${collection.id}/edit`"
                  icon="mdi-pencil"
                  variant="tonal"
                  size="small"
                  color="primary"
                  :aria-label="t('collections.list.editLink')"
                />
                <v-btn
                  icon="mdi-delete"
                  variant="tonal"
                  size="small"
                  color="error"
                  :aria-label="t('collections.list.deleteButton')"
                  @click="requestDelete(collection.id)"
                />
              </div>
            </template>
          </CollectionCard>
        </v-col>
      </v-row>
    </template>

    <v-dialog v-model="isDialogOpen" max-width="480">
      <v-card>
        <v-card-title>{{ t("collections.deleteConfirm.title") }}</v-card-title>
        <v-card-text>
          {{ t("collections.deleteConfirm.message") }}
          <Alert v-if="deleteErrorMessage" type="error" class="mt-4">{{
            deleteErrorMessage
          }}</Alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn :disabled="deletePending" @click="isDialogOpen = false">{{
            t("collections.deleteConfirm.cancel")
          }}</v-btn>
          <v-btn color="error" :loading="deletePending" @click="confirmDelete">{{
            t("collections.deleteConfirm.confirm")
          }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
