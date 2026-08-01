<script lang="ts" setup>
const { t } = useI18n();

const highlights = [
  { icon: "mdi-link-variant", key: "save" },
  { icon: "mdi-folder-multiple-outline", key: "organize" },
  { icon: "mdi-share-variant", key: "share" }
] as const;
</script>

<template>
  <v-row class="mb-8">
    <v-col
      v-for="highlight in highlights"
      :key="highlight.key"
      cols="12"
      sm="4"
      class="text-center"
    >
      <v-icon :icon="highlight.icon" size="40" color="primary" />
      <h2 class="text-h6 mt-3 mb-1">{{ t(`pages.home.highlights.${highlight.key}.title`) }}</h2>
      <p class="text-body-2 text-medium-emphasis">
        {{ t(`pages.home.highlights.${highlight.key}.description`) }}
      </p>
    </v-col>
  </v-row>
</template>
