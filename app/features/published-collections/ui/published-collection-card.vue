<script lang="ts" setup>
import type { PublishedCollection } from "~/shared/api";

defineProps<{ collection: PublishedCollection }>();
</script>

<template>
  <div class="position-relative">
    <!--
      v-card with `:to` (not a NuxtLink wrapping a v-card): Vuetify's router
      integration makes v-card itself render as the anchor when `to` is set,
      same mechanism link-card.vue documents for v-btn's `:to` usage. The
      #overlay slot below is a sibling, not a descendant, of this anchor -
      nesting an anchor/button inside it would be invalid HTML (anchor-in-
      anchor) and break keyboard/screen-reader navigation.
    -->
    <v-card :to="`/shared/${collection.slug}`">
      <v-img
        v-if="collection.imageUrl"
        :src="collection.imageUrl"
        :alt="collection.name"
        height="160"
        cover
      />
      <div
        v-else
        class="d-flex align-center justify-center bg-surface-variant"
        style="height: 160px"
      >
        <v-icon icon="mdi-folder-multiple-outline" size="48" />
      </div>

      <v-card-title class="text-truncate">{{ collection.name }}</v-card-title>

      <v-card-text v-if="collection.description">{{ collection.description }}</v-card-text>
    </v-card>

    <div
      v-if="$slots.overlay"
      class="position-absolute d-flex justify-space-between align-start ga-2 pa-2"
      style="top: 0; left: 0; right: 0"
    >
      <slot name="overlay" />
    </div>
  </div>
</template>
