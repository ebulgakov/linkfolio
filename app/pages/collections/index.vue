<script lang="ts" setup>
import type { Collection } from "~/shared/api";

import { useAuth } from "~/shared/api";

definePageMeta({ middleware: "auth" });

const { t } = useI18n();

// The `auth` middleware already guarantees a session exists (it redirects
// otherwise), but doesn't expose the resolved session to the page. Re-resolve
// it here via the same useAuth()/getSession() call the middleware uses, so
// the cache key below can be scoped per-user identically on SSR and client.
const { data: session } = await useAuth().getSession();

const requestFetch = useRequestFetch();
const {
  data: collections,
  pending,
  error
} = await useAsyncData(`collections-${session?.user.id}`, () =>
  requestFetch<Collection[]>("/api/collections")
);
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
            </NuxtLink>
          </template>
          <template #subtitle>{{ collection.description }}</template>
          <template #append>
            <NuxtLink :to="`/collections/${collection.id}/edit`" class="text-primary">{{
              t("collections.list.editLink")
            }}</NuxtLink>
          </template>
        </v-list-item>
      </v-list>
    </template>
  </v-container>
</template>
