<script lang="ts" setup>
import { LinkForm } from "~/features/link-form";

definePageMeta({ middleware: "auth" });

const { t } = useI18n();
const route = useRoute();
const collectionId = route.params.id as string;
</script>

<template>
  <v-container>
    <h1 class="mb-4">{{ t("pages.newLink.title") }}</h1>
    <LinkForm :collection-id="collectionId" />
  </v-container>
</template>
