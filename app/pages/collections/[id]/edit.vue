<script lang="ts" setup>
import { CollectionForm } from "~/features/collection-form";
import { useCollection } from "~/shared/api";
import { Alert } from "~/shared/ui";

definePageMeta({ middleware: "auth" });

const { t } = useI18n();
const route = useRoute();
const id = route.params.id as string;

const { collection, error, isNotFound } = await useCollection(id);
</script>

<template>
  <v-container>
    <Alert v-if="error" type="error" class="mb-4">{{
      isNotFound ? t("collections.errors.notFound") : t("collections.errors.loadFailed")
    }}</Alert>

    <template v-else-if="collection">
      <h1 class="mb-4">{{ t("pages.editCollection.title") }}</h1>
      <CollectionForm :collection="collection" />
    </template>
  </v-container>
</template>
