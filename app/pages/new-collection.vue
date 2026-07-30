<script lang="ts" setup>
import { CollectionForm } from "~/features/collection-form";

definePageMeta({ middleware: "auth" });

const { t } = useI18n();
</script>

<template>
  <v-container>
    <h1 class="mb-4">{{ t("pages.newCollection.title") }}</h1>
    <CollectionForm />
  </v-container>
</template>
