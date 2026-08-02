<script lang="ts" setup>
import type { LinkItem } from "~/shared/api";

import { LinkForm } from "~/features/link-form";
import { useAuth } from "~/shared/api";
import { Alert } from "~/shared/ui";

definePageMeta({ middleware: "auth" });

const { t } = useI18n();
const route = useRoute();
const collectionId = route.params.id as string;
const linkId = route.params.linkId as string;

// The `auth` middleware already guarantees a session exists (it redirects
// otherwise), but doesn't expose the resolved session to the page. Re-resolve
// it here via the same useAuth()/getSession() call the middleware uses, so
// the cache key below can be scoped per-user identically on SSR and client.
const { data: session } = await useAuth().getSession();

const requestFetch = useRequestFetch();
const { data: link, error } = await useAsyncData(`link-edit-${session?.user.id}-${linkId}`, () =>
  requestFetch<LinkItem>(`/api/collections/${collectionId}/links/${linkId}`)
);

const isNotFound = computed(() => error.value?.statusCode === 404);
</script>

<template>
  <v-container>
    <Alert v-if="error" type="error" class="mb-4">{{
      isNotFound ? t("links.errors.notFound") : t("links.errors.loadFailed")
    }}</Alert>

    <template v-else-if="link">
      <h1 class="mb-4">{{ t("pages.editLink.title") }}</h1>
      <LinkForm :collection-id="collectionId" :link="link" />
    </template>
  </v-container>
</template>
