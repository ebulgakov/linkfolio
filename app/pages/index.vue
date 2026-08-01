<script lang="ts" setup>
import type { PublishedCollection } from "~/shared/api";

import { CollectionsList } from "~/features/collections";
import {
  PublishedCollectionCard,
  useRandomPublishedCollections
} from "~/features/published-collections";
import { useAuth, usePublishedCollections } from "~/shared/api";

const { t } = useI18n();

// Deliberately not wrapped in useAsyncData/useFetch: must stay a fresh,
// uncached read so the /login -> refreshNuxtData("auth-session") ->
// navigateTo("/") flow immediately reflects the new session, rather than
// showing a stale "anonymous" result under a separate cache key.
//
// `session` here is a plain nullable value, not a Ref - getSession() (unlike
// the separate reactive useSession() composable) resolves via the generic
// non-Vue client API, so `session?.user.id` is the correct access pattern
// (matching use-collection.ts), not `session.value`.
const { data: session } = await useAuth().getSession();

// Only fetch/pick published collections for guests - this branch's result is
// only ever rendered in the v-else below, and running it unconditionally for
// authenticated users would both waste an /api/shared fetch on every
// homepage load AND permanently claim useRandomPublishedCollections'
// useState key during an authenticated SSR pass (its `init` only runs once
// per app instance) - so a user who later logs out and navigates back to
// "/" client-side would be stuck with the pick drawn while still logged in.
const randomPublishedCollections = ref<PublishedCollection[]>([]);
if (!session) {
  // usePublishedCollections() must be awaited (data resolved) BEFORE
  // useRandomPublishedCollections is called - the latter's useState init
  // only runs once and needs source.value already populated at that point.
  const { data: publishedCollections } = await usePublishedCollections();
  randomPublishedCollections.value = useRandomPublishedCollections(publishedCollections).value;
}
</script>

<template>
  <CollectionsList v-if="session" />
  <v-container v-else>
    <h1 class="text-center mb-4">{{ t("pages.home.title") }}</h1>

    <v-row>
      <v-col
        v-for="collection in randomPublishedCollections"
        :key="collection.id"
        cols="12"
        sm="6"
        md="4"
      >
        <PublishedCollectionCard :collection="collection" />
      </v-col>
    </v-row>

    <div class="text-center mt-4">
      <NuxtLink to="/published-collections">{{ t("pages.home.viewAllPublished") }}</NuxtLink>
    </div>
  </v-container>
</template>
