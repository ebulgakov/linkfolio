<script lang="ts" setup>
definePageMeta({ middleware: "auth" });

const { t } = useI18n();
</script>

<template>
  <v-container class="fill-height d-flex align-center justify-center">
    <h1>{{ t("pages.collectionDetail.title") }}</h1>
  </v-container>
</template>
