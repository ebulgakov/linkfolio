<script lang="ts" setup>
import { useCollections } from "~/features/collections";
import { useAuth } from "~/shared/api";

const { t } = useI18n();

// Re-resolves the session so it can scope the useAsyncData cache key
// identically on SSR and client (the page rendering this may or may not
// have already guaranteed a session via the `auth` middleware).
const { data: session } = await useAuth().getSession();

const { data: collections, pending, error } = await useCollections(session?.user.id);
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
