<script lang="ts" setup>
import { CollectionsList } from "~/features/collections";
import { useAuth } from "~/shared/api";

const { t } = useI18n();

// Deliberately not wrapped in useAsyncData/useFetch: must stay a fresh,
// uncached read so the /login -> refreshNuxtData("auth-session") ->
// navigateTo("/") flow immediately reflects the new session, rather than
// showing a stale "anonymous" result under a separate cache key.
const { data: session } = await useAuth().getSession();
</script>

<template>
  <CollectionsList v-if="session" />
  <v-container v-else class="fill-height d-flex align-center justify-center">
    <h1>{{ t("pages.home.title") }}</h1>
  </v-container>
</template>
